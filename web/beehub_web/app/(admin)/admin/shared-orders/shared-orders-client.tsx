"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Truck,
  Users,
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  UserCheck,
  Calendar,
  MapPin,
  CheckCircle2,
  DollarSign,
  XCircle,
  X,
  Phone,
} from "lucide-react";
import { adminApi } from "@/lib/admin/api";
import { formatVND } from "@/lib/utils";
import { Pagination } from "@/components/admin-dashboard/pagination";
import { StatCard } from "@/components/admin-dashboard/stat-card";
import { EmptyState } from "@/components/admin-dashboard/empty-state";
import { Button } from "@/components/admin-ui/button";

interface SharedOrderItem {
  id: string;
  order_number?: string;
  pickup_address: string;
  delivery_address: string;
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  status: string;
  customer_name?: string;
  customer_phone?: string;
  profiles?: { full_name?: string; phone?: string };
}

interface SharedGroup {
  id: string;
  group_code: string;
  pickup_city: string;
  pickup_district: string;
  delivery_city: string;
  delivery_district: string;
  scheduled_date: string;
  max_orders: number;
  current_orders: number;
  discount_rate: number;
  status: string;
  vehicle_type: string;
  route_summary?: string;
  notes?: string;
  provider_id?: string;
  assigned_at?: string;
  created_at: string;
  provider?: { full_name: string; phone: string } | null;
  orders: SharedOrderItem[];
  orders_count: number;
  total_amount: number;
  total_deposits: number;
  paid_deposits: number;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "open", label: "Đang gom đơn" },
  { value: "matched", label: "Chờ tài xế" },
  { value: "accepted", label: "Đã phân công" },
  { value: "in_progress", label: "Đang vận chuyển" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
];

const GROUP_STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: "Đang gom đơn", bg: "bg-amber-50 border-amber-200", text: "text-amber-800" },
  matched: { label: "Chờ tài xế nhận", bg: "bg-blue-50 border-blue-200", text: "text-blue-800" },
  accepted: { label: "Đã có tài xế", bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-800" },
  in_progress: { label: "Đang vận chuyển", bg: "bg-purple-50 border-purple-200", text: "text-purple-800" },
  completed: { label: "Hoàn tất chuyến", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800" },
  cancelled: { label: "Đã hủy nhóm", bg: "bg-rose-50 border-rose-200", text: "text-rose-800" },
};

export function SharedOrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("status") || "all";
  const currentPage = Number(searchParams.get("page") || "1");

  const [groups, setGroups] = useState<SharedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [meta, setMeta] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 1 });
  const [selectedGroup, setSelectedGroup] = useState<SharedGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [providerIdInput, setProviderIdInput] = useState("");
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSharedGroups({
        status: currentTab === "all" ? undefined : currentTab,
        page: currentPage,
        pageSize: 15,
      });
      if (res.success && res.data) {
        setGroups(res.data as SharedGroup[]);
        if (res.meta) {
          const m = res.meta as any;
          setMeta({
            page: m.page || 1,
            pageSize: m.pageSize || 15,
            total: m.total || 0,
            totalPages: m.totalPages || m.pages || 1,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching shared groups:", err);
    } finally {
      setLoading(false);
    }
  }, [currentTab, currentPage]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "all") params.delete("status");
    else params.set("status", val);
    params.set("page", "1");
    router.push(`/admin/shared-orders?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/admin/shared-orders?${params.toString()}`);
  };

  const handleOpenDetail = async (group: SharedGroup) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
    setProviderIdInput(group.provider_id || "");
    setShowCancelPrompt(false);
    setCancelReasonInput("");
    try {
      const res = await adminApi.getSharedGroup(group.id);
      if (res.success && res.data) {
        setSelectedGroup(res.data as SharedGroup);
      }
    } catch (e) {
      console.error("Error refreshing group details:", e);
    }
  };

  const handleAssignProvider = async () => {
    if (!selectedGroup || !providerIdInput.trim()) return;
    setActionLoading(true);
    try {
      const res = await adminApi.assignProviderToSharedGroup(selectedGroup.id, providerIdInput.trim());
      if (res.success) {
        alert("Đã phân công tài xế thành công!");
        fetchGroups();
        setIsModalOpen(false);
      } else {
        alert(res.message || "Không thể phân công tài xế");
      }
    } catch (e: any) {
      alert(e.message || "Lỗi khi phân công");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveOrder = async (orderId: string) => {
    if (!selectedGroup) return;
    if (!confirm("Bạn có chắc chắn muốn tách đơn này khỏi nhóm ghép? Đơn hàng sẽ trở về trạng thái đơn riêng độc lập.")) return;
    setActionLoading(true);
    try {
      const res = await adminApi.removeOrderFromSharedGroup(selectedGroup.id, orderId, "Admin can thiệp điều phối");
      if (res.success) {
        alert("Đã tách đơn khỏi nhóm thành công!");
        const refreshed = await adminApi.getSharedGroup(selectedGroup.id);
        if (refreshed.success && refreshed.data) {
          setSelectedGroup(refreshed.data as SharedGroup);
        }
        fetchGroups();
      } else {
        alert(res.message || "Không thể tách đơn");
      }
    } catch (e: any) {
      alert(e.message || "Lỗi khi tách đơn");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelGroup = async () => {
    if (!selectedGroup) return;
    if (!cancelReasonInput.trim()) {
      alert("Vui lòng nhập lý do hủy nhóm");
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminApi.cancelSharedGroup(selectedGroup.id, cancelReasonInput.trim());
      if (res.success) {
        alert("Đã hủy nhóm ghép thành công!");
        fetchGroups();
        setIsModalOpen(false);
      } else {
        alert(res.message || "Không thể hủy nhóm");
      }
    } catch (e: any) {
      alert(e.message || "Lỗi khi hủy nhóm");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      g.group_code.toLowerCase().includes(term) ||
      (g.pickup_district && g.pickup_district.toLowerCase().includes(term)) ||
      (g.delivery_district && g.delivery_district.toLowerCase().includes(term)) ||
      (g.route_summary && g.route_summary.toLowerCase().includes(term))
    );
  });

  const totalGroupsCount = meta.total || groups.length;
  const openGroupsCount = groups.filter((g) => g.status === "open" || g.status === "matched").length;
  const totalRevenue = groups.reduce((acc, g) => acc + (g.total_amount || 0), 0);
  const totalDeposits = groups.reduce((acc, g) => acc + (g.paid_deposits || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Stats Summary ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Tổng nhóm ghép"
          value={totalGroupsCount}
          icon={Truck}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
        />
        <StatCard
          title="Đang ghép & chờ xe"
          value={openGroupsCount}
          icon={Users}
          iconBg="#FEF3C7"
          iconColor="#D97706"
        />
        <StatCard
          title="Tổng cước ghép đơn"
          value={formatVND(totalRevenue)}
          icon={DollarSign}
          iconBg="#ECFDF5"
          iconColor="#059669"
        />
        <StatCard
          title="Tiền cọc đã thu"
          value={formatVND(totalDeposits)}
          icon={CheckCircle2}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
        />
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {STATUS_TABS.map((tab) => {
            const active = currentTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[#0047FF] text-white shadow-sm"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã nhóm, khu vực..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-3 text-xs focus:border-[#0047FF] focus:bg-white focus:outline-none"
            />
          </div>
          <button
            onClick={fetchGroups}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Groups Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-[#0047FF]" />
            Đang tải danh sách nhóm ghép...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-16 text-center">
            <EmptyState
              title="Không có nhóm ghép nào"
              description="Chưa có dữ liệu nhóm ghép đơn sinh viên phù hợp với bộ lọc hiện tại."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-4 py-3.5">Mã nhóm</th>
                  <th className="px-4 py-3.5">Lộ trình & Ngày hẹn</th>
                  <th className="px-4 py-3.5">Đơn ghép</th>
                  <th className="px-4 py-3.5">Doanh thu / Cọc</th>
                  <th className="px-4 py-3.5">Tài xế phụ trách</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.map((g) => {
                  const badge = GROUP_STATUS_BADGES[g.status] || {
                    label: g.status,
                    bg: "bg-gray-50 border-gray-200",
                    text: "text-gray-700",
                  };
                  return (
                    <tr key={g.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-[#0047FF]">#{g.group_code}</span>
                        <span className="block text-[10px] text-gray-400">
                          {g.vehicle_type === "van" ? "Xe Van" : "Xe tải nhỏ"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900">
                          {g.route_summary || `${g.pickup_district} ➔ ${g.delivery_district}`}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                          <Calendar size={11} /> {g.scheduled_date}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                          <Users size={12} /> {g.current_orders}/{g.max_orders} đơn
                        </span>
                        <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                          -25% cước phí
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-gray-900">{formatVND(g.total_amount)}</span>
                        <p className="text-[10px] text-gray-500">
                          Cọc: <span className="font-semibold text-emerald-600">{formatVND(g.paid_deposits)}</span> / {formatVND(g.total_deposits)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        {g.provider ? (
                          <div>
                            <p className="font-semibold text-gray-900">{g.provider.full_name}</p>
                            <p className="text-[10px] text-gray-400">{g.provider.phone}</p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            Chưa phân công
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenDetail(g)}
                          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-[#0047FF] hover:text-white transition-colors"
                        >
                          <Eye size={12} /> Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="border-t border-gray-100 p-4">
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* ── Modal / Drawer: Chi tiết nhóm ghép & Điều phối ── */}
      {isModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-gray-900">
                    Nhóm ghép #{selectedGroup.group_code}
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {selectedGroup.vehicle_type === "van" ? "Xe Van" : "Xe tải nhỏ"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Lộ trình: {selectedGroup.route_summary || `${selectedGroup.pickup_district} ➔ ${selectedGroup.delivery_district}`} · Ngày hẹn: {selectedGroup.scheduled_date}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Thông tin tài chính nhóm */}
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-gray-50 p-4 text-xs">
              <div>
                <span className="text-gray-400 block">Tổng cước chuyến:</span>
                <span className="text-sm font-bold text-gray-900">{formatVND(selectedGroup.total_amount)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Cọc đã thanh toán:</span>
                <span className="text-sm font-bold text-emerald-600">{formatVND(selectedGroup.paid_deposits)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Giảm giá nhóm:</span>
                <span className="text-sm font-bold text-blue-600">-25% mỗi sinh viên</span>
              </div>
            </div>

            {/* Danh sách các đơn sinh viên trong nhóm */}
            <div className="mt-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Các đơn hàng sinh viên thuộc nhóm ({selectedGroup.orders?.length || 0} đơn)
              </h4>

              {(!selectedGroup.orders || selectedGroup.orders.length === 0) ? (
                <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                  Nhóm hiện chưa có đơn nào
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedGroup.orders.map((order, idx) => {
                    const custName = order.customer_name || order.profiles?.full_name || `Sinh viên #${idx + 1}`;
                    const custPhone = order.customer_phone || order.profiles?.phone || "";
                    const isCancelled = order.status === "cancelled";

                    return (
                      <div
                        key={order.id}
                        className={`rounded-2xl border p-4 text-xs transition-colors ${
                          isCancelled ? "border-rose-100 bg-rose-50/30 opacity-70" : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">
                                {order.order_number ? `#${order.order_number}` : order.id.slice(0, 8)} - {custName}
                              </span>
                              {custPhone && (
                                <span className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                                  <Phone size={10} /> {custPhone}
                                </span>
                              )}
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                order.deposit_paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {order.deposit_paid ? "Đã cọc 30%" : "Chưa cọc"}
                              </span>
                              {isCancelled && (
                                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                                  Đã hủy
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-gray-600">
                              <span className="font-medium text-emerald-600">Lấy:</span> {order.pickup_address}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium text-blue-600">Giao:</span> {order.delivery_address}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 self-end sm:self-start">
                            <div className="text-right">
                              <span className="font-bold text-gray-900">{formatVND(order.total_price)}</span>
                              <p className="text-[10px] text-gray-400">Cọc: {formatVND(order.deposit_amount)}</p>
                            </div>
                            {!isCancelled && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleRemoveOrder(order.id)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                                title="Cô lập sự cố: Tách đơn này ra thành đơn riêng"
                              >
                                Tách đơn
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quản lý Tài xế & Điều phối */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Phân công / Điều phối Tài xế
              </h4>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  placeholder="Nhập ID tài xế (UUID)"
                  value={providerIdInput}
                  onChange={(e) => setProviderIdInput(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-xs focus:border-[#0047FF] focus:outline-none"
                />
                <Button
                  disabled={actionLoading || !providerIdInput.trim()}
                  onClick={handleAssignProvider}
                  className="h-10 bg-[#0047FF] text-xs font-bold text-white hover:bg-blue-700"
                >
                  <UserCheck size={14} className="mr-1.5" /> Phân công tài xế
                </Button>
              </div>
            </div>

            {/* Hủy nhóm ghép */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              {!showCancelPrompt ? (
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Hủy nhóm ghép này (Các đơn con sẽ được giữ nguyên và chuyển về tìm tài xế riêng)
                </button>
              ) : (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
                  <p className="text-xs font-bold text-rose-900">
                    Xác nhận hủy nhóm ghép?
                  </p>
                  <p className="text-[11px] text-rose-700">
                    Khi hủy nhóm ghép, các đơn hàng con trong nhóm vẫn được bảo toàn dữ liệu, lịch sử và tiền cọc, và tự động chuyển về trạng thái độc lập để không ảnh hưởng đến quyền lợi sinh viên.
                  </p>
                  <input
                    type="text"
                    placeholder="Lý do hủy nhóm (bắt buộc)..."
                    value={cancelReasonInput}
                    onChange={(e) => setCancelReasonInput(e.target.value)}
                    className="h-9 w-full rounded-xl border border-rose-300 bg-white px-3 text-xs focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowCancelPrompt(false)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      Bỏ qua
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={handleCancelGroup}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {actionLoading ? "Đang xử lý..." : "Xác nhận hủy nhóm"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
