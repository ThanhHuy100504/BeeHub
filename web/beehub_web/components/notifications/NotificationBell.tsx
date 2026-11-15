"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, RefreshCw, X, ChevronRight } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { timeAgo, cn } from "@/lib/utils";
import { useNotificationStore } from "@/lib/stores";
import { type NotificationItem, getNotificationNavigateHref, isNotificationUnread, mapNotificationKind, NOTIFICATION_TYPE_META } from "./notification-utils";

interface NotificationBellProps {
  isProvider?: boolean;
  isAdmin?: boolean;
  showCountBadge?: boolean;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  iconSize?: number;
}
const KIND_LABELS = { order: "Đơn hàng", promo: "Chợ & ưu đãi", system: "Hệ thống", review: "Đánh giá" };
function dateGroup(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hôm nay";
  if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return "Trước đó";
}

export function NotificationBell({ isProvider = false, isAdmin = false, showCountBadge = false, className, buttonClassName, iconClassName, iconSize = 20 }: NotificationBellProps) {
  const router = useRouter();
  const id = useId();
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const setUnreadCount = useNotificationStore(s => s.setUnreadCount);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pos, setPos] = useState({ top: 72, right: 12 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => { setOpen(false); btnRef.current?.focus(); }, []);
  const refreshUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      if (res.success) setUnreadCount((res.data as { count?: number })?.count ?? 0);
    } catch { /* Keep the last known count when offline. */ }
  }, [setUnreadCount]);
  const load = useCallback(async (nextPage = 1) => {
    setLoading(true); setError("");
    try {
      const r = await notificationsApi.list({ page: nextPage, pageSize: 30 });
      if (!r.success) throw new Error();
      const data = r.data as { notifications?: NotificationItem[] } | NotificationItem[];
      const list = Array.isArray(data) ? data : (data?.notifications ?? []);
      setNotifs(prev => nextPage === 1 ? list : [...prev, ...list.filter(n => !prev.some(p => p.id === n.id))]);
      setPage(nextPage); setHasMore(list.length === 30);
      await refreshUnread();
    } catch { setError("Không tải được thông báo. Vui lòng thử lại."); }
    finally { setLoading(false); }
  }, [refreshUnread]);
  useEffect(() => {
    void refreshUnread();
    const timer = setInterval(refreshUnread, 30_000);
    return () => clearInterval(timer);
  }, [refreshUnread]);
  const updatePosition = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 240)), right: window.innerWidth < 640 ? 12 : Math.max(12, Math.min(window.innerWidth - rect.right, window.innerWidth - 432)) });
  }, []);
  useEffect(() => {
    if (!open) return;
    void load(); updatePosition(); panelRef.current?.focus();
    function outside(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function escape(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", updatePosition);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", updatePosition); };
  }, [open, load, close, updatePosition]);
  const markAll = async () => {
    setBusy(true); setError("");
    try {
      const result = await notificationsApi.markAllRead();
      if (!result.success) throw new Error();
      setNotifs(prev => prev.map(n => ({ ...n, read: true, is_read: true }))); setUnreadCount(0);
    } catch { setError("Chưa thể đánh dấu đã đọc. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };
  const handleClick = async (n: NotificationItem) => {
    setBusy(true); setError("");
    try {
      if (isNotificationUnread(n)) {
        const result = await notificationsApi.markRead(n.id);
        if (!result.success) throw new Error();
        setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true, is_read: true } : x));
        await refreshUnread();
      }
      const href = getNotificationNavigateHref(n, { isProvider, isAdmin });
      if (href) { close(); router.push(href); }
      else setExpanded(prev => prev === n.id ? null : n.id);
    } catch { setError("Không mở được thông báo. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };
  const visible = [...notifs].filter(n => filter === "all" || isNotificationUnread(n)).sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const groups = ["Hôm nay", "Hôm qua", "Trước đó"].map(label => ({ label, items: visible.filter(n => dateGroup(n.created_at) === label) })).filter(g => g.items.length);
  return <div className={cn("relative", className)}>
    <button ref={btnRef} type="button" onClick={() => { updatePosition(); setOpen(v => !v); }} aria-label={unreadCount ? `${unreadCount} thông báo chưa đọc` : "Thông báo"} aria-expanded={open} aria-controls={open ? id : undefined} className={cn("relative flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100/50", buttonClassName)}>
      <Bell className={cn("text-gray-500", iconClassName)} size={iconSize} strokeWidth={1.75} />
      {unreadCount > 0 && (showCountBadge ? <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span> : <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />)}
    </button>
    {open && createPortal(<div ref={panelRef} id={id} role="region" aria-label="Hộp thông báo" tabIndex={-1} style={{ position: "fixed", top: pos.top, right: pos.right, width: "min(420px, calc(100vw - 24px))", maxHeight: `calc(100dvh - ${pos.top + 12}px)`, zIndex: 99999, backgroundColor: "var(--card, #fff)", color: "var(--text, #111827)", borderColor: "var(--border, #e5e7eb)" }} className="flex flex-col overflow-hidden rounded-2xl border shadow-2xl outline-none">
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div><h2 className="text-lg font-bold">Thông báo</h2><p className="mt-1 text-xs text-gray-500">{unreadCount ? `${unreadCount} thông báo chưa đọc` : "Bạn đã đọc hết thông báo"}</p></div>
          <button type="button" onClick={close} aria-label="Đóng thông báo" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100/50"><X size={20}/></button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-gray-100/70 p-1" role="group" aria-label="Lọc thông báo">
          {([['all','Tất cả'],['unread','Chưa đọc']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={cn("min-h-11 rounded-lg text-sm font-semibold",filter === value ? "bg-blue-800 text-white shadow-sm" : "text-gray-500 hover:bg-gray-200/50")}>{label}</button>)}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
          <button type="button" onClick={markAll} disabled={busy || loading || !unreadCount} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-blue-600 disabled:opacity-40"><CheckCheck size={16}/>Đọc tất cả</button>
          <button type="button" onClick={() => load()} disabled={loading || busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-gray-500 disabled:opacity-40"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Làm mới</button>
        </div>
      </div>
      {error && <p role="alert" className="mx-4 mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-gray-200/50" aria-busy={loading}>
        {loading && !notifs.length ? <p role="status" className="px-4 py-12 text-center text-sm text-gray-500">Đang tải thông báo…</p> : !visible.length ? <div className="px-6 py-10 text-center"><Bell className="mx-auto mb-3 text-blue-400" size={32}/><p className="font-semibold">{filter === "unread" ? "Không có thông báo chưa đọc" : "Chưa có thông báo"}</p><p className="mt-2 text-sm text-gray-500">{filter === "unread" ? "Chọn Tất cả để xem lại các cập nhật." : "Các cập nhật mới sẽ xuất hiện tại đây."}</p></div> : groups.map(group => <section key={group.label} aria-label={group.label}>
          <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.label}</h3>
          {group.items.map(n => { const kind=mapNotificationKind(String(n.type ?? n.notification_type ?? '')); const meta=NOTIFICATION_TYPE_META[kind]; const Icon=meta.icon; const unread=isNotificationUnread(n); const href=getNotificationNavigateHref(n,{isProvider,isAdmin}); return <button key={n.id} type="button" disabled={busy} onClick={() => handleClick(n)} className={cn("flex w-full items-start gap-3 border-b border-gray-200/40 px-4 py-4 text-left transition-colors hover:bg-blue-50/50 disabled:opacity-60",unread && "bg-blue-50/50")}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{backgroundColor:meta.bg,color:meta.color}}><Icon size={19}/></span>
            <span className="min-w-0 flex-1"><span className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500"><span>{KIND_LABELS[kind]}</span>{unread && <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-800">Chưa đọc</span>}</span><span className={cn("block break-words text-sm leading-6", unread ? "font-bold" : "font-medium")}>{n.title}</span><span className={cn("mt-1 block whitespace-pre-wrap break-words text-sm leading-5 text-gray-500",expanded !== n.id && "line-clamp-3")}>{n.body || n.message}</span><span className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500"><time dateTime={n.created_at}>{timeAgo(n.created_at)}</time><span className="inline-flex items-center gap-1 text-blue-600">{href ? "Xem chi tiết" : expanded === n.id ? "Thu gọn" : "Xem nội dung"}<ChevronRight size={13}/></span></span></span>
          </button>; })}
        </section>)}
        {hasMore && <button type="button" onClick={() => load(page + 1)} disabled={loading || busy} className="min-h-11 w-full px-4 py-3 text-sm font-semibold text-blue-600 disabled:opacity-40">{loading ? "Đang tải…" : "Xem thông báo cũ hơn"}</button>}
      </div>
    </div>,document.body)}
  </div>;
}
