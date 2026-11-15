const { supabaseAdmin } = require('./supabase.service');
const { createNotification } = require('./notification.service');

/**
 * Shared Moves Service (Ghép đơn sinh viên)
 * Handles auto-matching, group creation, provider assignment, and isolated order lifecycle.
 */

/**
 * Generate unique human-readable group code, e.g. GRP-261115-X2K9
 */
function generateGroupCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `GRP-${dateStr}-${rand}`;
}

/**
 * Ensure a provider_profiles row exists for providerId so orders.provider_id FK succeeds.
 */
async function ensureProviderProfileExists(providerId) {
  if (!providerId) return;
  try {
    const { data: existing } = await supabaseAdmin
      .from('provider_profiles')
      .select('id')
      .eq('id', providerId)
      .maybeSingle();

    if (existing?.id) return;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', providerId)
      .maybeSingle();

    await supabaseAdmin.from('provider_profiles').insert({
      id: providerId,
      business_name: profile?.full_name || 'Nhà xe đối tác',
      vehicle_type: 'small_truck',
      is_available: true,
    });
  } catch (err) {
    console.warn('ensureProviderProfileExists warning:', err?.message || err);
  }
}

/**
 * Auto-match an incoming order with an existing group or create a new open group.
 */
async function matchOrCreateGroupForOrder(order) {
  if (!order || !order.id) return null;

  try {
    const pickupCity = order.pickup_city || 'Đà Nẵng';
    const scheduledDate = order.scheduled_pickup_time
      ? order.scheduled_pickup_time.split('T')[0]
      : new Date().toISOString().split('T')[0];

    // 1. Search for an open/matched group without a driver yet that still has capacity on the same date & city
    const { data: openGroups } = await supabaseAdmin
      .from('shared_move_groups')
      .select('*')
      .in('status', ['open', 'matched'])
      .is('provider_id', null)
      .eq('scheduled_date', scheduledDate)
      .eq('pickup_city', pickupCity)
      .order('current_orders', { ascending: false })
      .limit(5);

    let targetGroup = null;

    if (openGroups && openGroups.length > 0) {
      for (const g of openGroups) {
        if ((g.current_orders || 0) < (g.max_orders || 3)) {
          targetGroup = g;
          break;
        }
      }
    }

    if (targetGroup) {
      const newCount = (targetGroup.current_orders || 0) + 1;
      const newStatus = newCount >= 2 ? 'matched' : 'open';

      const routeNote = `Đón: ${targetGroup.pickup_district || ''}, ${order.pickup_district || ''} -> Trả: ${targetGroup.delivery_district || ''}, ${order.delivery_district || ''}`;

      await supabaseAdmin
        .from('shared_move_groups')
        .update({
          current_orders: newCount,
          status: newStatus,
          route_summary: routeNote,
        })
        .eq('id', targetGroup.id);

      await supabaseAdmin
        .from('orders')
        .update({
          shared_move_group_id: targetGroup.id,
          is_shared: true,
          shared_status: 'matched',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Update all existing orders in this group to shared_status = 'matched'
      await supabaseAdmin
        .from('orders')
        .update({
          shared_status: 'matched',
          updated_at: new Date().toISOString(),
        })
        .eq('shared_move_group_id', targetGroup.id)
        .neq('status', 'cancelled');

      await createNotification(
        order.customer_id,
        'shared_order_matched',
        'Ghép chuyến thành công!',
        `Đơn chuyển trọ ${order.order_number || ''} đã được ghép vào chuyến nhóm ${targetGroup.group_code}. Bạn được giảm 25% cước phí!`,
        {
          actionUrl: `/don-hang/${order.id}`,
          actionData: { order_id: order.id, group_id: targetGroup.id },
          icon: 'users',
        }
      );

      return { matched: true, groupId: targetGroup.id, groupCode: targetGroup.group_code };
    }

    // 2. No matching group found -> Create a new open group
    const groupCode = generateGroupCode();
    const newGroupRow = {
      group_code: groupCode,
      pickup_city: pickupCity,
      pickup_district: order.pickup_district || 'Hải Châu',
      delivery_city: order.delivery_city || pickupCity,
      delivery_district: order.delivery_district || 'Liên Chiểu',
      scheduled_date: scheduledDate,
      max_orders: 3,
      current_orders: 1,
      discount_rate: 25.0,
      status: 'open',
      vehicle_type: order.vehicle_size || 'small_truck',
      route_summary: `Đón: ${order.pickup_district || ''} -> Trả: ${order.delivery_district || ''}`,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data: createdGroup, error: groupErr } = await supabaseAdmin
      .from('shared_move_groups')
      .insert(newGroupRow)
      .select('*')
      .single();

    if (groupErr) {
      console.error('Error creating shared group:', groupErr);
      return null;
    }

    await supabaseAdmin
      .from('orders')
      .update({
        shared_move_group_id: createdGroup.id,
        is_shared: true,
        shared_status: 'waiting_match',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return { matched: false, groupId: createdGroup.id, groupCode: createdGroup.group_code };
  } catch (err) {
    console.error('matchOrCreateGroupForOrder error:', err);
    return null;
  }
}

/**
 * List available shared groups for drivers (providers)
 */
async function listAvailableGroupsForProvider(providerId) {
  try {
    // 1. Groups available to pick up (no driver assigned, status open, matched, or full)
    const { data: availableGroups } = await supabaseAdmin
      .from('shared_move_groups')
      .select(`
        id,
        group_code,
        pickup_city,
        pickup_district,
        delivery_city,
        delivery_district,
        scheduled_date,
        max_orders,
        current_orders,
        discount_rate,
        status,
        vehicle_type,
        route_summary,
        created_at
      `)
      .in('status', ['open', 'matched', 'full'])
      .is('provider_id', null)
      .order('created_at', { ascending: false });

    // 2. Groups assigned to this provider
    const { data: myGroups } = await supabaseAdmin
      .from('shared_move_groups')
      .select(`
        id,
        group_code,
        pickup_city,
        pickup_district,
        delivery_city,
        delivery_district,
        scheduled_date,
        max_orders,
        current_orders,
        discount_rate,
        status,
        vehicle_type,
        route_summary,
        assigned_at,
        started_at,
        completed_at,
        created_at
      `)
      .eq('provider_id', providerId)
      .in('status', ['accepted', 'in_progress'])
      .order('assigned_at', { ascending: false });

    const allGroupIds = [
      ...(availableGroups || []).map((g) => g.id),
      ...(myGroups || []).map((g) => g.id),
    ];

    let ordersByGroup = {};
    if (allGroupIds.length > 0) {
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          order_number,
          shared_move_group_id,
          pickup_address,
          pickup_district,
          pickup_latitude,
          pickup_longitude,
          delivery_address,
          delivery_district,
          delivery_latitude,
          delivery_longitude,
          total_price,
          deposit_amount,
          deposit_paid,
          status,
          scheduled_pickup_time,
          customer_id,
          profiles!orders_customer_id_fkey(full_name, phone)
        `)
        .in('shared_move_group_id', allGroupIds);

      (orders || []).forEach((o) => {
        if (!ordersByGroup[o.shared_move_group_id]) {
          ordersByGroup[o.shared_move_group_id] = [];
        }
        ordersByGroup[o.shared_move_group_id].push(o);
      });
    }

    const formatGroup = (g, isMine) => {
      const groupOrders = ordersByGroup[g.id] || [];
      const activeOrders = groupOrders.filter((o) => o.status !== 'cancelled');
      const totalPayout = activeOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
      return {
        ...g,
        is_my_group: isMine,
        orders_count: groupOrders.length,
        active_orders_count: activeOrders.length,
        total_payout: totalPayout,
        orders: groupOrders.map((o) => ({
          id: o.id,
          order_number: o.order_number,
          pickup_address: o.pickup_address,
          delivery_address: o.delivery_address,
          total_price: parseFloat(o.total_price || 0),
          deposit_amount: parseFloat(o.deposit_amount || 0),
          deposit_paid: o.deposit_paid,
          status: o.status,
          customer_name: o.profiles?.full_name || 'Sinh viên',
          customer_phone: isMine ? o.profiles?.phone : undefined,
          scheduled_pickup_time: o.scheduled_pickup_time,
        })),
      };
    };

    return {
      available: (availableGroups || [])
        .map((g) => formatGroup(g, false))
        .filter((g) => g.active_orders_count > 0),
      my_groups: (myGroups || [])
        .map((g) => formatGroup(g, true))
        .filter((g) => g.active_orders_count > 0),
    };
  } catch (error) {
    console.error('listAvailableGroupsForProvider error:', error);
    throw error;
  }
}

/**
 * Driver accepts an entire shared group.
 * Atomic update prevents double acceptance.
 */
async function acceptSharedGroup(groupId, providerId) {
  try {
    const nowIso = new Date().toISOString();

    await ensureProviderProfileExists(providerId);

    // 1. Check current group state first
    const { data: currentGroup, error: fetchErr } = await supabaseAdmin
      .from('shared_move_groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();

    if (fetchErr || !currentGroup) {
      throw Object.assign(new Error('Không tìm thấy nhóm ghép này.'), { status: 404 });
    }

    // Idempotent check: if this same driver already accepted it, return it
    if (currentGroup.provider_id === providerId) {
      return currentGroup;
    }

    if (currentGroup.provider_id && currentGroup.provider_id !== providerId) {
      throw Object.assign(new Error('Nhóm ghép này đã được tài xế khác nhận.'), { status: 409 });
    }

    if (currentGroup.status === 'cancelled' || currentGroup.status === 'completed') {
      throw Object.assign(new Error('Nhóm ghép này đã kết thúc hoặc bị hủy.'), { status: 400 });
    }

    // 2. Atomic lock: update provider_id if currently null
    const { data: updatedGroup, error: groupErr } = await supabaseAdmin
      .from('shared_move_groups')
      .update({
        provider_id: providerId,
        status: 'accepted',
        assigned_at: nowIso,
      })
      .eq('id', groupId)
      .is('provider_id', null)
      .select('*')
      .single();

    if (groupErr || !updatedGroup) {
      console.error('acceptSharedGroup update error:', groupErr);
      throw Object.assign(
        new Error('Nhóm ghép này đã được tài xế khác nhận hoặc không còn khả dụng.'),
        { status: 409 },
      );
    }

    // 3. Update all active orders in this group
    const { data: memberOrders } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, order_number, status')
      .eq('shared_move_group_id', groupId)
      .neq('status', 'cancelled');

    if (memberOrders && memberOrders.length > 0) {
      const orderIds = memberOrders.map((o) => o.id);

      const { error: orderUpdateErr } = await supabaseAdmin
        .from('orders')
        .update({
          provider_id: providerId,
          status: 'accepted',
          provider_accepted_at: nowIso,
          shared_status: 'matched',
          updated_at: nowIso,
        })
        .in('id', orderIds);

      if (orderUpdateErr) {
        console.error('acceptSharedGroup memberOrders update error:', orderUpdateErr);
      }

      // Audit logs & Customer notifications
      for (const order of memberOrders) {
        try {
          await supabaseAdmin.from('order_status_history').insert({
            order_id: order.id,
            from_status: order.status,
            to_status: 'accepted',
            changed_by: providerId,
            notes: `Tài xế đã nhận chuyến ghép nhóm ${updatedGroup.group_code}`,
          });

          await createNotification(
            order.customer_id,
            'order_accepted',
            'Tài xế đã nhận chuyến ghép!',
            `Đơn ghép ${order.order_number || ''} của bạn đã có tài xế nhận chuyến và chuẩn bị khởi hành.`,
            {
              actionUrl: `/don-hang/${order.id}`,
              actionData: { order_id: order.id, group_id: groupId },
              icon: 'truck',
            }
          );
        } catch (notifyErr) {
          console.warn('acceptSharedGroup notify warning:', notifyErr);
        }
      }
    }

    return updatedGroup;
  } catch (error) {
    console.error('acceptSharedGroup error:', error);
    throw error;
  }
}

/**
 * Driver proposes to pair an active order with another waiting order.
 */
async function proposePairOrders(providerId, myOrderId, candidateOrderId) {
  try {
    const nowIso = new Date().toISOString();
    await ensureProviderProfileExists(providerId);

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_id, pickup_district, delivery_district, total_price, shared_move_group_id')
      .in('id', [myOrderId, candidateOrderId]);

    if (!orders || orders.length < 2) {
      throw new Error('Không tìm thấy thông tin đơn hàng để ghép.');
    }

    const orderA = orders.find((o) => o.id === myOrderId);
    const orderB = orders.find((o) => o.id === candidateOrderId);

    let groupId = orderA.shared_move_group_id || orderB.shared_move_group_id;

    if (!groupId) {
      const groupCode = generateGroupCode();
      const { data: newGroup } = await supabaseAdmin
        .from('shared_move_groups')
        .insert({
          group_code: groupCode,
          pickup_city: 'Đà Nẵng',
          pickup_district: orderA.pickup_district || '',
          delivery_city: 'Đà Nẵng',
          delivery_district: orderA.delivery_district || '',
          scheduled_date: new Date().toISOString().split('T')[0],
          provider_id: providerId,
          status: 'accepted',
          assigned_at: nowIso,
          max_orders: 3,
          current_orders: 2,
          discount_rate: 25.0,
          route_summary: `Đón: ${orderA.pickup_district}, ${orderB.pickup_district} -> Trả: ${orderA.delivery_district}, ${orderB.delivery_district}`,
        })
        .select('*')
        .single();
      groupId = newGroup.id;
    } else {
      await supabaseAdmin
        .from('shared_move_groups')
        .update({
          provider_id: providerId,
          status: 'accepted',
          current_orders: 2,
          assigned_at: nowIso,
        })
        .eq('id', groupId);
    }

    await supabaseAdmin
      .from('orders')
      .update({
        shared_move_group_id: groupId,
        provider_id: providerId,
        is_shared: true,
        shared_status: 'matched',
        status: 'accepted',
        provider_accepted_at: nowIso,
        updated_at: nowIso,
      })
      .in('id', [myOrderId, candidateOrderId]);

    return { success: true, groupId };
  } catch (error) {
    console.error('proposePairOrders error:', error);
    throw error;
  }
}

/**
 * Handle order cancellation in a group without breaking other orders.
 */
async function handleOrderCancellationInGroup(orderId, _cancelledBy, reason) {
  try {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, shared_move_group_id, status')
      .eq('id', orderId)
      .single();

    if (!order || !order.shared_move_group_id) return;

    const groupId = order.shared_move_group_id;

    const { data: remainingOrders } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('shared_move_group_id', groupId)
      .neq('id', orderId)
      .neq('status', 'cancelled');

    const activeCount = remainingOrders ? remainingOrders.length : 0;

    if (activeCount === 0) {
      await supabaseAdmin
        .from('shared_move_groups')
        .update({
          status: 'cancelled',
          current_orders: 0,
          notes: `Hủy nhóm do đơn ${orderId} bị hủy: ${reason || ''}`,
        })
        .eq('id', groupId);
    } else {
      await supabaseAdmin
        .from('shared_move_groups')
        .update({
          current_orders: activeCount,
          status: activeCount >= 2 ? 'matched' : 'open',
          notes: `Đơn ${orderId} đã hủy. Còn lại ${activeCount} đơn tiếp tục hành trình.`,
        })
        .eq('id', groupId);
    }
  } catch (err) {
    console.error('handleOrderCancellationInGroup error:', err);
  }
}

/**
 * Admin: List all shared moving groups with filters and pagination
 */
async function adminListSharedGroups(params = {}) {
  try {
    const { page = 1, pageSize = 20, status, search, date } = params;
    const offset = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from('shared_move_groups')
      .select(`
        id,
        group_code,
        pickup_city,
        pickup_district,
        delivery_city,
        delivery_district,
        scheduled_date,
        max_orders,
        current_orders,
        discount_rate,
        status,
        vehicle_type,
        route_summary,
        notes,
        provider_id,
        assigned_at,
        started_at,
        completed_at,
        created_at,
        profiles!shared_move_groups_provider_id_fkey(full_name, phone)
      `, { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (date) {
      query = query.eq('scheduled_date', date);
    }
    if (search) {
      query = query.or(`group_code.ilike.%${search}%,pickup_district.ilike.%${search}%,delivery_district.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

    const { data: groups, count, error } = await query;
    if (error) throw error;

    const groupIds = (groups || []).map((g) => g.id);
    let ordersByGroup = {};

    if (groupIds.length > 0) {
      const { data: memberOrders } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          order_number,
          shared_move_group_id,
          pickup_address,
          delivery_address,
          total_price,
          deposit_amount,
          deposit_paid,
          status,
          customer_id,
          profiles!orders_customer_id_fkey(full_name, phone)
        `)
        .in('shared_move_group_id', groupIds);

      (memberOrders || []).forEach((o) => {
        if (!ordersByGroup[o.shared_move_group_id]) {
          ordersByGroup[o.shared_move_group_id] = [];
        }
        ordersByGroup[o.shared_move_group_id].push(o);
      });
    }

    const rows = (groups || []).map((g) => {
      const orders = ordersByGroup[g.id] || [];
      const totalAmount = orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
      const totalDeposits = orders.reduce((s, o) => s + parseFloat(o.deposit_amount || 0), 0);
      const paidDeposits = orders.filter((o) => o.deposit_paid).reduce((s, o) => s + parseFloat(o.deposit_amount || 0), 0);

      return {
        ...g,
        provider: g.profiles ? { full_name: g.profiles.full_name, phone: g.profiles.phone } : null,
        orders,
        orders_count: orders.length,
        total_amount: totalAmount,
        total_deposits: totalDeposits,
        paid_deposits: paidDeposits,
      };
    });

    return {
      data: rows,
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (error) {
    console.error('adminListSharedGroups error:', error);
    throw error;
  }
}

/**
 * Admin: Get details of a single shared moving group
 */
async function adminGetSharedGroupDetails(groupId) {
  try {
    const { data: group, error } = await supabaseAdmin
      .from('shared_move_groups')
      .select(`
        *,
        profiles!shared_move_groups_provider_id_fkey(full_name, phone)
      `)
      .eq('id', groupId)
      .single();

    if (error || !group) throw new Error('Không tìm thấy nhóm ghép');

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customer:profiles!orders_customer_id_fkey(full_name, phone, avatar_url)
      `)
      .eq('shared_move_group_id', groupId)
      .order('created_at', { ascending: true });

    return {
      ...group,
      provider: group.profiles,
      orders: orders || [],
    };
  } catch (error) {
    console.error('adminGetSharedGroupDetails error:', error);
    throw error;
  }
}

/**
 * Admin: Manually add an order to a shared group
 */
async function adminAddOrderToGroup(groupId, orderId) {
  try {
    const { data: group } = await supabaseAdmin.from('shared_move_groups').select('*').eq('id', groupId).single();
    if (!group) throw new Error('Nhóm ghép không tồn tại');

    await supabaseAdmin
      .from('orders')
      .update({
        shared_move_group_id: groupId,
        is_shared: true,
        shared_status: 'matched',
        provider_id: group.provider_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    const newCount = (group.current_orders || 0) + 1;
    await supabaseAdmin
      .from('shared_move_groups')
      .update({
        current_orders: newCount,
        status: newCount >= 2 ? (group.status === 'open' ? 'matched' : group.status) : group.status,
      })
      .eq('id', groupId);

    return { success: true };
  } catch (error) {
    console.error('adminAddOrderToGroup error:', error);
    throw error;
  }
}

/**
 * Admin: Manually remove an order from a shared group
 */
async function adminRemoveOrderFromGroup(groupId, orderId) {
  try {
    await supabaseAdmin
      .from('orders')
      .update({
        shared_move_group_id: null,
        shared_status: 'none',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    const { data: group } = await supabaseAdmin.from('shared_move_groups').select('*').eq('id', groupId).single();
    if (group) {
      const newCount = Math.max(0, (group.current_orders || 1) - 1);
      await supabaseAdmin
        .from('shared_move_groups')
        .update({
          current_orders: newCount,
          status: newCount >= 2 ? group.status : 'open',
        })
        .eq('id', groupId);
    }

    return { success: true };
  } catch (error) {
    console.error('adminRemoveOrderFromGroup error:', error);
    throw error;
  }
}

/**
 * Admin: Assign or reassign driver for shared group
 */
async function adminAssignProvider(groupId, providerId) {
  try {
    const nowIso = new Date().toISOString();
    await ensureProviderProfileExists(providerId);

    await supabaseAdmin
      .from('shared_move_groups')
      .update({
        provider_id: providerId,
        status: 'accepted',
        assigned_at: nowIso,
      })
      .eq('id', groupId);

    await supabaseAdmin
      .from('orders')
      .update({
        provider_id: providerId,
        status: 'accepted',
        provider_accepted_at: nowIso,
        updated_at: nowIso,
      })
      .eq('shared_move_group_id', groupId)
      .neq('status', 'cancelled');

    return { success: true };
  } catch (error) {
    console.error('adminAssignProvider error:', error);
    throw error;
  }
}

/**
 * Admin: Cancel an entire shared group
 */
async function adminCancelGroup(groupId, reason) {
  try {
    const nowIso = new Date().toISOString();

    await supabaseAdmin
      .from('shared_move_groups')
      .update({
        status: 'cancelled',
        notes: reason || 'Admin đã hủy nhóm ghép',
      })
      .eq('id', groupId);

    await supabaseAdmin
      .from('orders')
      .update({
        shared_status: 'cancelled',
        updated_at: nowIso,
      })
      .eq('shared_move_group_id', groupId);

    return { success: true };
  } catch (error) {
    console.error('adminCancelGroup error:', error);
    throw error;
  }
}

module.exports = {
  matchOrCreateGroupForOrder,
  listAvailableGroupsForProvider,
  acceptSharedGroup,
  proposePairOrders,
  handleOrderCancellationInGroup,
  adminListSharedGroups,
  adminGetSharedGroupDetails,
  adminAddOrderToGroup,
  adminRemoveOrderFromGroup,
  adminAssignProvider,
  adminCancelGroup,
};
