"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, LocateFixed, MapPin, Radio, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import { GoongVehicleMap } from "./GoongVehicleMap";
import { useLocationSharing } from "./LocationSharingProvider";
import { orderTrackingApi, watchOrderTracking } from "@/lib/api";
import { getOrderStatusLabel } from "@/lib/utils";

type Location = { latitude: number; longitude: number; accuracy: number | null; updated_at: string; stale: boolean };
type Tracking = {
  status: string; active: boolean; can_share: boolean; server_time: string;
  location: Location | null; sharing: "off" | "live" | "stale";
  pickup: { address: string }; delivery: { address: string };
  started_at: string | null; completed_at: string | null; delivery_photo_url: string | null;
  events: { id: string; to_status: string; created_at: string }[];
};
const time = (value: string) => new Date(value).toLocaleString("vi-VN");
const errorText = (error: unknown) => error instanceof Error ? error.message : "Không kết nối được máy chủ";

function ShareLocation({ orderId, onUpdate }: { orderId: string; onUpdate: () => void }) {
  const session = useLocationSharing();
  const sharing = session.orderId === orderId;
  const stopping = session.busy;
  const [stopError, setStopError] = useState("");
  const error = stopError || session.error;
  const sentAt = sharing ? session.sentAt : null;
  const stop = async () => {
    setStopError("");
    try {
      if (sharing) await session.stop();
      else {
        const result = await orderTrackingApi.stop(orderId);
        if (!result.success) throw new Error("Chưa dừng được chia sẻ. Vui lòng thử lại.");
      }
      onUpdate();
    } catch (err) { setStopError(errorText(err)); }
  };
  return <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
    <p className="text-sm font-semibold text-blue-950">Chia sẻ vị trí của thiết bị này cho khách đặt đơn</p>
    <p className="text-xs leading-relaxed text-blue-900">Cho phép GPS; có thể chuyển trang trong hệ thống khi đang chia sẻ. Vị trí có thể ngừng cập nhật khi khóa màn hình hoặc đóng trình duyệt.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={sharing || stopping} onClick={() => session.start(orderId)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{sharing ? "Đang chia sẻ GPS" : "Bật chia sẻ vị trí"}</button>
      <button type="button" disabled={stopping} onClick={stop} className="rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 disabled:opacity-50">{stopping ? "Đang dừng…" : "Dừng chia sẻ"}</button>
    </div>
    {sharing && !sentAt && !error && <p role="status" className="text-xs text-blue-900">Đang chờ vị trí GPS đầu tiên…</p>}
    {sentAt && <p className="text-xs text-blue-900">Đã gửi GPS lúc {time(sentAt)}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}

export function OrderLiveTracking({ orderId, provider = false, onStatusChange }: {
  orderId: string; provider?: boolean; onStatusChange?: (status: string) => void;
}) {
  const [data, setData] = useState<Tracking | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;
  const busy = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const current = generation.current;
    try {
      const result = await orderTrackingApi.get(orderId);
      if (!result.success || !result.data) throw new Error(result.message || "Chưa tải được chuyến đi");
      if (current !== generation.current) return;
      const next = result.data as Tracking;
      offset.current = Date.parse(next.server_time) - Date.now();
      setData(next); setError(""); statusRef.current?.(next.status);
    } catch (err) { if (current === generation.current) setError(errorText(err)); }
    finally { busy.current = false; }
  }, [orderId]);
  useEffect(() => {
    generation.current++; setData(null); void load();
    const refresh = () => { if (!document.hidden) void load(); };
    const timer = setInterval(refresh, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { generation.current++; clearInterval(timer); clearInterval(clock); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    watchOrderTracking(orderId, controller.signal, (snapshot) => {
      const next = snapshot as Tracking;
      offset.current = Date.parse(next.server_time) - Date.now();
      setData(next); setError(""); statusRef.current?.(next.status);
    }, setConnected);
    return () => controller.abort();
  }, [orderId, load]);
  const location = data?.location;
  const age = location ? Math.max(0, Math.floor((now + offset.current - Date.parse(location.updated_at)) / 1000)) : 0;
  const live = !!location && !error && age <= 60 && !location.stale;
  const ended = data && !data.active && ["completed", "cancelled"].includes(data.status);
  const endTime = data?.completed_at ?? (data?.status === "cancelled" ? data.events.findLast(event => event.to_status === "cancelled")?.created_at : null);
  const elapsed = data?.started_at ? Math.max(0, Math.floor(((endTime ? Date.parse(endTime) : now + offset.current) - Date.parse(data.started_at)) / 60000)) : null;
  const label = error ? "Mất kết nối" : ended ? "Chuyến đi đã kết thúc" : live ? "Đang cập nhật" : location ? "Tín hiệu GPS đã cũ" : "Chưa chia sẻ vị trí";
  const map = location ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - .012},${location.latitude - .008},${location.longitude + .012},${location.latitude + .008}&layer=mapnik&marker=${location.latitude},${location.longitude}` : null;

  return <section aria-label="Theo dõi chuyến đi" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
      <div><h2 className="flex items-center gap-2 font-bold text-slate-900"><Truck size={20} className="text-blue-600" /> Theo dõi chuyến đi</h2><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><ShieldCheck size={13} /> Chỉ khách đặt đơn và nhà xe được xem</p></div>
      <span role="status" className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${live ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}><Radio size={13} />{label}</span>
    </div>
    <div className="space-y-4 p-4 sm:p-5">
      {provider && data?.can_share && <ShareLocation orderId={orderId} onUpdate={load} />}
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold"><RefreshCw size={14} />Thử lại</button></div>}
      {!data && !error && <p role="status" className="py-8 text-center text-sm text-slate-500">Đang tải hành trình…</p>}
      {data && <>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Trạng thái hiện tại</p><p className="mt-1 font-semibold text-slate-900">{getOrderStatusLabel(data.status)}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="flex items-center gap-1 text-xs text-slate-500"><Clock size={13} /> Thời gian từ lúc nhận đơn</p><p className="mt-1 font-semibold text-slate-900">{elapsed == null ? "Chưa nhận đơn" : `${Math.floor(elapsed / 60)} giờ ${elapsed % 60} phút`}</p></div>
        </div>
        {map && location ? <div className="overflow-hidden rounded-xl border border-slate-200">
          <GoongVehicleMap latitude={location.latitude} longitude={location.longitude} accuracy={location.accuracy} updatedAt={location.updated_at} live={live} />
          <div className="space-y-1 p-3 text-xs text-slate-600"><p className="font-medium">{live ? "Vị trí nhà xe" : "Vị trí ghi nhận gần nhất — không phải vị trí trực tiếp"}</p><p>GPS: {time(location.updated_at)} · {age} giây trước</p><p>Sai số GPS: {location.accuracy == null ? "Không xác định" : `khoảng ${Math.round(location.accuracy)} m`}</p><a href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-block pt-1 font-semibold text-blue-600">Mở bản đồ lớn ↗</a></div>
        </div> : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center"><LocateFixed className="mx-auto mb-2 text-slate-400" size={28} /><p className="text-sm text-slate-600">{ended ? "Đã dừng theo dõi vị trí cho chuyến đi này." : "Vị trí sẽ hiển thị khi nhà xe bật chia sẻ GPS."}</p></div>}
        <div className="space-y-3 rounded-xl border border-slate-100 p-4 text-sm"><p className="flex gap-2"><MapPin size={17} className="shrink-0 text-blue-600" /><span><span className="block text-xs text-slate-500">Điểm lấy hàng</span>{data.pickup.address}</span></p><p className="flex gap-2"><MapPin size={17} className="shrink-0 text-emerald-600" /><span><span className="block text-xs text-slate-500">Điểm giao hàng</span>{data.delivery.address}</span></p></div>
        <div><h3 className="mb-4 text-sm font-bold text-slate-900">Lịch sử hành trình</h3>{!data.events.length ? <p className="text-sm text-slate-500">Chưa có mốc cập nhật.</p> : <ol className="ml-2 space-y-5 border-l-2 border-blue-100 pl-5">{data.events.map(event => <li key={event.id} className="relative"><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600" /><p className="text-sm font-semibold text-slate-800">{getOrderStatusLabel(event.to_status)}</p><time dateTime={event.created_at} className="text-xs text-slate-500">{time(event.created_at)}</time></li>)}</ol>}</div>
        {data.delivery_photo_url && <a href={data.delivery_photo_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Xem ảnh xác nhận giao hàng ↗</a>}
        <p className="text-xs leading-relaxed text-slate-400">{connected ? "Đã kết nối WebSocket trực tiếp với chuyến đi." : "Đang kết nối lại; tự kiểm tra cập nhật mỗi 5 giây."} Vị trí phụ thuộc GPS và kết nối của nhà xe; thời gian trên đây là thời gian đã trôi qua, không phải giờ dự kiến giao hàng.</p>
      </>}
    </div>
  </section>;
}
