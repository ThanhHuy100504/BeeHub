export type GoongPoint = [number, number]; // Goong uses [longitude, latitude].
export type AccuracyArea = { type: "Feature"; properties: Record<string, never>; geometry: { type: "Polygon"; coordinates: number[][][] } };
export interface GoongMap {
  panTo(point: GoongPoint): void;
  on(event: string, callback: (event?: { error?: { status?: number } }) => void): void;
  off(event: string, callback: (event?: { error?: { status?: number } }) => void): void;
  addControl(control: object, position?: string): void;
  addSource(id: string, source: { type: "geojson"; data: AccuracyArea }): void;
  getSource(id: string): { setData(data: AccuracyArea): void } | undefined;
  addLayer(layer: object): void;
  remove(): void;
}
export interface GoongMarker {
  setLngLat(point: GoongPoint): GoongMarker;
  addTo(map: GoongMap): GoongMarker;
  remove(): void;
}
export interface GoongSdk {
  accessToken: string;
  Map: new (options: object) => GoongMap;
  Marker: new (options: { element: HTMLElement; anchor: string }) => GoongMarker;
  NavigationControl: new (options?: object) => object;
}
declare global { interface Window { goongjs?: GoongSdk; } }
let loading: Promise<GoongSdk> | null = null;
export function loadGoongTrackingMap(): Promise<GoongSdk> {
  if (window.goongjs) return Promise.resolve(window.goongjs);
  if (loading) return loading;
  loading = new Promise<GoongSdk>((resolve, reject) => {
    const css = document.createElement("link"), script = document.createElement("script");
    let cssReady = false, scriptReady = false;
    const timer = setTimeout(fail, 20000);
    function fail() { clearTimeout(timer); css.remove(); script.remove(); reject(new Error("Không kết nối được Goong Maps")); }
    function ready() {
      if (cssReady && scriptReady && window.goongjs) { clearTimeout(timer); resolve(window.goongjs); }
    }
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css";
    css.onload = () => { cssReady = true; ready(); }; css.onerror = fail;
    script.src = "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js";
    script.async = true; script.onerror = fail;
    script.onload = () => { if (!window.goongjs) { fail(); return; } scriptReady = true; ready(); };
    document.head.append(css, script);
  }).catch(error => { loading = null; throw error; });
  return loading;
}
export function gpsAccuracyArea(longitude: number, latitude: number, meters: number): AccuracyArea {
  const radius = Math.max(0, meters) / 6371008.8;
  const lat = latitude * Math.PI / 180, lng = longitude * Math.PI / 180;
  const ring: number[][] = [];
  for (let i = 0; i <= 48; i++) {
    const bearing = 2 * Math.PI * (i % 48) / 48;
    const y = Math.asin(Math.sin(lat) * Math.cos(radius) + Math.cos(lat) * Math.sin(radius) * Math.cos(bearing));
    const x = lng + Math.atan2(Math.sin(bearing) * Math.sin(radius) * Math.cos(lat), Math.cos(radius) - Math.sin(lat) * Math.sin(y));
    ring.push([((x * 180 / Math.PI + 540) % 360) - 180, y * 180 / Math.PI]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}
