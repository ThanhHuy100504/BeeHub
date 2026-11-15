"use client";

import { providerRating } from "@/lib/provider-rating";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Truck } from "lucide-react";
import { BookingShell } from "@/components/booking/BookingShell";
import { useBookingFlowStore } from "@/lib/stores/useBookingFlowStore";
import { useBookingModeGuard } from "@/lib/booking/use-booking-mode-guard";
import { MOCK_PARTNERS } from "@/lib/booking/constants";
import { providersApi } from "@/lib/api";
import { formatVND } from "@/lib/utils";
import { cn } from "@/lib/utils";

const VEHICLE_LABELS: Record<string, string> = {
  motorbike: "Xe máy",
  pickup: "Xe bán tải",
  small_truck: "Xe tải nhỏ (500kg - 1T)",
  medium_truck: "Xe tải 1.5 - 2T",
  large_truck: "Xe tải lớn (> 2.5T)",
};

export default function DoiTacPage() {
  const router = useRouter();
  useBookingModeGuard({ requireCombo: true });
  const { isComboBooking, selectedTier, selectedPartnerId, setSelectedPartnerId } = useBookingFlowStore();
  const [partners, setPartners] = useState<typeof MOCK_PARTNERS>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    providersApi.browse().then((res) => {
      if (!active) return;
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = (res.data as Record<string, unknown>[]).map((p, i) => {
          const profiles = p.profiles as { full_name?: string } | undefined;
          const vType = String(p.vehicle_type ?? "small_truck");
          return {
            id: String(p.id ?? `api-${i}`),
            name: String(p.business_name || profiles?.full_name || p.name || "Nhà xe BeeHub"),
            distanceKm: Number(p.distance_km ?? (1.5 + i * 0.8)),
            rating: providerRating(p.rating, p.total_reviews ?? p.review_count ?? 0),
            reviewCount: Number(p.total_reviews ?? p.review_count ?? 0),
            price: Number(p.base_price ?? p.starting_price ?? 200_000),
            vehicleLabel: VEHICLE_LABELS[vType] ?? vType,
            offeredComboTiers: ["economy", "standard", "premium"] as typeof MOCK_PARTNERS[0]["offeredComboTiers"],
            comboLaborUnitPrice: 60_000,
          };
        });
        setPartners(mapped);
      } else {
        setPartners(MOCK_PARTNERS);
      }
    }).catch(() => {
      if (active) {
        setPartners(MOCK_PARTNERS);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [isComboBooking, selectedTier]);

  const backHref = isComboBooking ? "/dat-chuyen/goi-dich-vu" : "/dat-chuyen/lich-hen";

  return (
    <BookingShell
      title={isComboBooking ? "Chọn nhà xe combo" : "Chọn nhà xe"}
      subtitle={isComboBooking ? "Giá niêm yết — không chờ báo giá." : "Giá khởi điểm — nhà xe xác nhận khi nhận đơn."}
      step={isComboBooking ? 5 : 4}
      totalSteps={isComboBooking ? 6 : 5}
      backHref={backHref}
      footer={
        <button
          type="button"
          disabled={loading || loadError || !partners.some((p) => p.id === selectedPartnerId)}
          onClick={() => router.push("/dat-chuyen/thanh-toan")}
          className="w-full rounded-full bg-[#0047FF] py-3.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Tiếp tục thanh toán
        </button>
      }
    >
      <div className="space-y-3">
        {loading ? <p className="text-sm text-gray-500">Đang tải nhà xe…</p>
          : loadError ? <p role="alert" className="text-sm text-red-600">Không tải được danh sách nhà xe. Vui lòng thử lại.</p>
          : partners.length === 0 ? <p className="text-sm text-gray-500">Chưa có nhà xe phù hợp.</p> : null}
        {!loading && !loadError && partners.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPartnerId(p.id)}
            className={cn(
              "flex w-full gap-4 rounded-2xl border p-4 text-left transition-all",
              selectedPartnerId === p.id ? "border-[#0047FF] bg-blue-50/30" : "border-gray-100 bg-white"
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0047FF]">
              <Truck size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.vehicleLabel} · {p.distanceKm} km</p>
                </div>
                <p className="text-sm font-bold text-[#0047FF]">
                  {isComboBooking ? "GIÁ NIÊM YẾT" : formatVND(p.price)}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <Star size={12} fill={p.rating > 0 ? "currentColor" : "none"} />
                {p.rating.toFixed(1)} ({p.reviewCount} đánh giá)
              </div>
              {isComboBooking && p.comboLaborUnitPrice != null && (
                <p className="mt-1 text-xs text-gray-500">
                  Khuân vác {formatVND(p.comboLaborUnitPrice)}/người
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </BookingShell>
  );
}
