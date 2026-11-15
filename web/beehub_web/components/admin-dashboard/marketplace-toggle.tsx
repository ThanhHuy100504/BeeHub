"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin/api";
import { Switch } from "@/components/admin-ui/switch";

export function MarketplaceToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await adminApi.getPlatformSettings();
      if (!response.success) throw new Error();
      const value = (response.data as Record<string, unknown> | undefined)?.marketplace_enabled;
      setEnabled(value === undefined || value === true || value === "true" || value === 1 || value === "1");
    } catch { setError("Không tải được trạng thái Pass đồ. Hãy thử lại."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const update = async (next: boolean) => {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await adminApi.updatePlatformSettings({ marketplace_enabled: next });
      if (!response.success) throw new Error();
      setEnabled(next);
      setMessage(next ? "Đã mở Pass đồ cho người dùng." : "Đã tạm đóng Pass đồ. Các tin đăng vẫn được giữ nguyên.");
    } catch { setError("Chưa lưu được thay đổi. Trạng thái Pass đồ chưa được cập nhật."); }
    finally { setSaving(false); }
  };
  return <section className="rounded-2xl border p-4 sm:p-5" style={{backgroundColor:"var(--card)",borderColor:"var(--border)"}} aria-labelledby="marketplace-toggle-title">
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
      <div className="min-w-0 flex-1"><h2 id="marketplace-toggle-title" className="font-semibold" style={{color:"var(--text)"}}>Bật / tắt Pass đồ</h2><p id="marketplace-toggle-description" className="mt-1 text-sm leading-6" style={{color:"var(--muted)"}}>Khi tắt, người dùng không thể truy cập hoặc giao dịch trong Pass đồ. Admin vẫn quản lý được tin đăng; dữ liệu không bị xóa.</p></div>
      <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3" style={{backgroundColor:"var(--surface)"}}>
        <span className="text-sm font-semibold" style={{color:"var(--text)"}}>{saving ? "Đang lưu…" : enabled === null ? "Đang tải…" : enabled ? "Đang bật" : "Đang tắt"}</span>
        <Switch size="lg" aria-label="Bật Pass đồ" aria-describedby="marketplace-toggle-description" checked={enabled === true} disabled={enabled === null || saving} onCheckedChange={update}/>
      </label>
    </div>
    {error && <div role="alert" className="mt-3 text-sm text-red-600">{error}{enabled === null && <button type="button" onClick={load} className="ml-2 min-h-11 underline">Thử lại</button>}</div>}
    <p role="status" className="mt-2 text-sm" style={{color:"var(--muted)"}}>{message}</p>
  </section>;
}
