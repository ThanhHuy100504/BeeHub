"use client";
import { useEffect, useRef, useState } from "react";
import { loadGoongTrackingMap, gpsAccuracyArea, type GoongPoint, type GoongMap, type GoongMarker } from "@/lib/goong-tracking-map";

type Props = { latitude: number; longitude: number; accuracy: number | null; updatedAt: string; live: boolean };
export function GoongVehicleMap(props: Props) {
  const key = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY;
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<GoongMap | null>(null), marker = useRef<GoongMarker | null>(null);
  const current = useRef<GoongPoint>([props.longitude, props.latitude]);
  const latest = useRef(props); latest.current = props;
  const frame = useRef(0), following = useRef(true);
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  const [follow, setFollow] = useState(true);
  useEffect(() => {
    if (!key || !host.current) return;
    let cancelled = false, timeout: ReturnType<typeof setTimeout> | undefined;
    const failed = () => { if (!cancelled) setError("Goong Maps tạm thời chưa khả dụng. Đang hiển thị bản đồ dự phòng."); };
    loadGoongTrackingMap().then(sdk => {
      if (cancelled || !host.current) return;
      const point: GoongPoint = [latest.current.longitude, latest.current.latitude]; current.current = point;
      sdk.accessToken = key;
      const instance = new sdk.Map({ container: host.current, style: "https://tiles.goong.io/assets/goong_map_web.json", center: point, zoom: 16, attributionControl: true });
      map.current = instance;
      instance.addControl(new sdk.NavigationControl({ showCompass: false }), "top-right");
      const vehicle = document.createElement("div");
      vehicle.textContent = "🚚"; vehicle.setAttribute("aria-label", "Vị trí xe");
      vehicle.style.cssText = "font-size:28px;background:#fff;border:3px solid #2563eb;border-radius:50%;padding:5px;box-shadow:0 3px 12px #0004";
      marker.current = new sdk.Marker({ element: vehicle, anchor: "center" }).setLngLat(point).addTo(instance);
      instance.on("dragstart", () => { following.current = false; setFollow(false); });
      instance.on("error", event => { if ([401, 403].includes(event?.error?.status ?? 0)) { clearTimeout(timeout); failed(); } });
      timeout = setTimeout(failed, 20000);
      instance.on("load", () => {
        if (cancelled) return;
        clearTimeout(timeout);
        const fix = latest.current;
        instance.addSource("gps-accuracy", { type: "geojson", data: gpsAccuracyArea(fix.longitude, fix.latitude, fix.accuracy || 0) });
        instance.addLayer({ id: "gps-accuracy-fill", type: "fill", source: "gps-accuracy", paint: { "fill-color": "#2563eb", "fill-opacity": 0.1, "fill-outline-color": "#2563eb" } });
        setError(""); setReady(true);
      });
    }).catch(failed);
    return () => { cancelled = true; clearTimeout(timeout); cancelAnimationFrame(frame.current); marker.current?.remove(); map.current?.remove(); marker.current = null; map.current = null; };
  }, [key]);
  useEffect(() => {
    if (!ready || !marker.current || !map.current) return;
    cancelAnimationFrame(frame.current);
    const from = current.current, to: GoongPoint = [props.longitude, props.latitude];
    map.current.getSource("gps-accuracy")?.setData(gpsAccuracyArea(props.longitude, props.latitude, props.accuracy || 0));
    if (following.current) map.current.panTo(to);
    // Animate only between received fixes; do not extrapolate past the latest GPS fix.
    const animate = props.live && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now(), duration = animate ? 1000 : 0;
    const step = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const point: GoongPoint = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
      current.current = point; marker.current?.setLngLat(point);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [ready, props.latitude, props.longitude, props.accuracy, props.updatedAt, props.live]);
  const fallback = !key || !!error;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${props.longitude - .012},${props.latitude - .008},${props.longitude + .012},${props.latitude + .008}&layer=mapnik&marker=${props.latitude},${props.longitude}`;
  return <div className="relative">
    <div ref={host} aria-label="Goong Maps theo dõi xe" className={fallback ? "hidden" : "h-64 w-full sm:h-80"} />
    {fallback ? <><p className="bg-amber-50 px-3 py-2 text-xs text-amber-800">{error || "Đang sử dụng bản đồ dự phòng."}</p><iframe title="Bản đồ vị trí nhà xe" src={url} className="h-64 w-full border-0 sm:h-80" loading="lazy" referrerPolicy="no-referrer" /></>
      : !ready ? <p role="status" className="absolute inset-0 grid place-items-center bg-slate-50 text-sm">Đang tải Goong Maps…</p>
      : <button type="button" onClick={() => { following.current = true; setFollow(true); map.current?.panTo(current.current); }} className="absolute bottom-8 left-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow">{follow ? "Đang theo xe" : "Về vị trí xe"}</button>}
  </div>;
}
