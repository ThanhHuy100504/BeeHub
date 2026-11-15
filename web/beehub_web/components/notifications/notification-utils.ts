import { Package, Star, AlertCircle, CheckCircle, type LucideIcon } from "lucide-react";

export interface NotificationItem {
  id: string;
  type: string;
  notification_type?: string;
  title: string;
  body: string;
  message?: string;
  read?: boolean;
  is_read?: boolean;
  created_at: string;
  listing_id?: string | null;
  action_url?: string | null;
  href?: string;
  action_data?: {
    order_id?: string;
    quote_id?: string;
    listing_id?: string;
    buyer_id?: string;
    delete_reason?: string;
    listing_title?: string;
    refund_id?: string;
    withdrawal_id?: string;
    type?: string;
  } | null;
}

export type NotificationKind = "order" | "promo" | "system" | "review";

export function mapNotificationKind(t: string): NotificationKind {
  if (t?.includes("order") || t?.includes("quote") || t?.includes("don")) return "order";
  if (t?.includes("review") || t?.includes("rating")) return "review";
  if (
    t?.includes("promo") ||
    t?.includes("market") ||
    t?.includes("marketplace_listing_deleted")
  ) {
    return "promo";
  }
  return "system";
}

export const NOTIFICATION_TYPE_META: Record<
  NotificationKind,
  { icon: LucideIcon; bg: string; color: string }
> = {
  order: { icon: Package, bg: "#EFF6FF", color: "#1E40AF" },
  promo: { icon: Star, bg: "#FFFBEB", color: "#D97706" },
  system: { icon: AlertCircle, bg: "#F0FDF4", color: "#16A34A" },
  review: { icon: CheckCircle, bg: "#FFF1F2", color: "#E11D48" },
};

export function isNotificationUnread(n: NotificationItem) {
  return !(n.read ?? n.is_read);
}

export function getNotificationNavigateHref(
  n: NotificationItem,
  options?: { isProvider?: boolean; isAdmin?: boolean },
): string | null {
  const type = String(n.type ?? n.notification_type ?? "");
  const action = n.action_data ?? {};
  const orderId = action.order_id;
  const quoteId = action.quote_id;
  const listingId = action.listing_id ?? n.listing_id ?? undefined;
  const buyerId = action.buyer_id;
  if (options?.isAdmin) {
    const rawUrl = n.action_url || "";
    const title = String(n.title ?? "").toLowerCase();
    const body = String(n.body ?? n.message ?? "").toLowerCase();
    const refundId = action.refund_id;
    const withdrawalId = action.withdrawal_id;

    // 1. Withdrawal request (yêu cầu rút tiền)
    if (
      withdrawalId ||
      type.includes("withdrawal") ||
      title.includes("rút tiền") ||
      body.includes("rút tiền") ||
      rawUrl.includes("withdrawals")
    ) {
      const matchId = withdrawalId || rawUrl.match(/id=([^&]+)/)?.[1];
      return matchId ? `/admin/finance?tab=withdrawals&id=${matchId}` : `/admin/finance?tab=withdrawals`;
    }

    // 2. Refund request (yêu cầu hoàn tiền)
    if (
      refundId ||
      action.type === "refund_approval" ||
      type.includes("refund") ||
      title.includes("hoàn tiền") ||
      body.includes("hoàn tiền") ||
      rawUrl.includes("/admin/refunds")
    ) {
      const matchId = refundId || rawUrl.match(/id=([^&]+)/)?.[1];
      return matchId ? `/admin/refunds?id=${matchId}` : `/admin/refunds`;
    }

    // 3. Explicit admin action url
    if (rawUrl.startsWith("/admin/")) return rawUrl;

    // 4. Order detail in admin
    if (orderId) return `/admin/orders/${orderId}`;
    return null;
  }
  const chatBase = options?.isProvider ? "/tai-xe/tin-nhan" : "/tin-nhan";

  if (
    type === "marketplace_listing_deleted" ||
    action.delete_reason ||
    (type === "system_announcement" && n.title?.includes("bị xóa"))
  ) {
    return "/cho-sinh-vien/tin-cua-toi";
  }

  if (type.includes("marketplace") && listingId && buyerId) {
    const params = new URLSearchParams({
      listingId: String(listingId),
      buyerId: String(buyerId),
      tab: "pass-do",
    });
    return `${chatBase}?${params.toString()}`;
  }
  if ((type.includes("quote") || quoteId) && orderId && quoteId) {
    return `/don-hang/${orderId}/bao-gia/${quoteId}`;
  }
  if (orderId && !options?.isProvider && [
    "order_accepted", "order_started", "order_completed", "order_cancelled",
  ].includes(type)) {
    return `/don-hang/${encodeURIComponent(orderId)}`;
  }
  if (orderId) {
    return `${chatBase}?orderId=${orderId}`;
  }
  if (n.action_url) return n.action_url;
  return n.href ?? null;
}
