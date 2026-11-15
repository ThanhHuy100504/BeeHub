"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { orderTrackingApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type Sharing = { orderId: string | null; sentAt: string | null; error: string; busy: boolean; start: (id: string) => Promise<void>; stop: () => Promise<void> };
const Context = createContext<Sharing | null>(null);
export function useLocationSharing() {
  const value = useContext(Context);
  if (!value) throw new Error("LocationSharingProvider is missing");
  return value;
}
export function LocationSharingProvider({ children }: { children: React.ReactNode }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<string | null>(null);
  const sending = useRef<Promise<unknown>>(Promise.resolve());
  const stopping = useRef(false);
  const stop = useCallback(async () => {
    if (stopping.current) return;
    const id = active.current;
    if (!id) return;
    stopping.current = true; active.current = null; setOrderId(null); setBusy(true);
    try {
      await sending.current;
      const result = await orderTrackingApi.stop(id);
      if (!result.success) throw new Error("Chưa xác nhận dừng chia sẻ");
      setSentAt(null); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Chưa xác nhận dừng chia sẻ. GPS trên thiết bị đã dừng."); }
    finally { stopping.current = false; setBusy(false); }
  }, []);
  const start = useCallback(async (id: string) => {
    if (stopping.current) return;
    if (getStoredUser()?.role !== "provider") { setError("Vui lòng đăng nhập tài khoản nhà xe."); return; }
    if (!navigator.geolocation || !window.isSecureContext) { setError("Thiết bị cần hỗ trợ vị trí và kết nối HTTPS."); return; }
    if (active.current === id) return;
    if (active.current) await stop();
    active.current = id; setSentAt(null); setError(""); setOrderId(id);
  }, [stop]);
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false, inFlight = false, lastSent = 0;
    const send = (position: GeolocationPosition) => {
      if (cancelled || active.current !== orderId || inFlight || Date.now() - lastSent < 2000) return;
      if (getStoredUser()?.role !== "provider") { void stop(); return; }
      inFlight = true;
      sending.current = orderTrackingApi.publish(orderId, {
        latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy,
        captured_at: new Date(position.timestamp).toISOString(),
      }).then(result => {
        if (!result.success) throw new Error(result.message || "Chưa gửi được vị trí");
        lastSent = Date.now();
        if (!cancelled && active.current === orderId) { setSentAt(new Date(position.timestamp).toISOString()); setError(""); }
      }).catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không gửi được vị trí");
          if ([401, 403, 409].includes(err.status)) { active.current = null; setOrderId(null); }
        }
      }).finally(() => { inFlight = false; });
    };
    const failure = (err: GeolocationPositionError) => {
      if (cancelled) return;
      if (err.code === 1) { void stop().then(() => setError("Quyền GPS đang bị chặn. Cho phép vị trí trong trình duyệt rồi bật lại.")); }
      else setError("Chưa lấy được GPS. Kiểm tra quyền vị trí và kết nối trên thiết bị.");
    };
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };
    const watch = navigator.geolocation.watchPosition(send, failure, options);
    const heartbeat = setInterval(() => { if (!inFlight && active.current === orderId) navigator.geolocation.getCurrentPosition(send, failure, options); }, 10000);
    return () => { cancelled = true; navigator.geolocation.clearWatch(watch); clearInterval(heartbeat); };
  }, [orderId, stop]);
  return <Context.Provider value={{ orderId, sentAt, error, busy, start, stop }}>
    {children}
    {orderId && <aside aria-label="Chia sẻ vị trí đang chạy" className="fixed bottom-36 left-3 right-3 z-[65] rounded-xl border border-blue-200 bg-blue-950 p-3 text-white shadow-xl sm:bottom-6 sm:left-4 sm:right-auto sm:w-80">
      <div className="flex items-center justify-between gap-3"><Link href={`/orders/${orderId}`} className="text-sm font-semibold underline">{sentAt ? "Đang chia sẻ vị trí chuyến đi" : "Đang chờ GPS…"}</Link><button type="button" disabled={busy} onClick={stop} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-950">Dừng GPS</button></div>
      <p className="mt-1 text-xs text-blue-100">Tiếp tục chia sẻ khi chuyển trang trong hệ thống.</p>
      {error && <p role="alert" className="mt-2 text-xs text-amber-200">{error}</p>}
    </aside>}
  </Context.Provider>;
}
