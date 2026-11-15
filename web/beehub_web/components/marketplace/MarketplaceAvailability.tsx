"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
export function MarketplaceAvailability({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true; setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/marketplace/status`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success || typeof result.data?.enabled !== "boolean") throw new Error();
        if (!controller.signal.aborted) { setEnabled(result.data.enabled); setError(false); }
      } catch {
        if (!controller.signal.aborted) { setEnabled(null); setError(true); }
      } finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    const timer = setInterval(load, 20_000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", load); };
  }, [pathname, revision]);
  if (enabled === true) return <>{children}</>;
  return <div className="flex flex-1 items-center justify-center px-4 py-16"><div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
    <Store className="mx-auto mb-4 h-10 w-10 text-blue-600"/>
    <h1 className="text-xl font-bold text-gray-900">{loading && enabled === null ? "Đang kiểm tra Pass đồ…" : error ? "Chưa thể mở Pass đồ" : "Dịch vụ này đang đóng"}</h1>
    <p className="mt-3 text-sm leading-6 text-gray-600">{error ? "Không tải được trạng thái dịch vụ. Vui lòng thử lại." : "Vui lòng quay lại sau. Các tin đăng của bạn vẫn được lưu giữ."}</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" disabled={loading} onClick={retry} className="min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Kiểm tra lại</button><Link href="/trang-chu" className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700">Về trang chủ</Link></div>
  </div></div>;
}
