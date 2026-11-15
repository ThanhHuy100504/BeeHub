"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin, Truck, Check, Sparkles, ArrowRight, Building2 } from "lucide-react";
import {
  BookingWizardLayout,
  BookingInsuranceBanner,
  QUOTE_WIZARD_STEPS,
  COMBO_WIZARD_STEPS,
} from "@/components/booking/BookingWizardLayout";
import { BookingModeIntro } from "@/components/booking/BookingModeIntro";
import { useBookingFlowStore } from "@/lib/stores/useBookingFlowStore";
import { useBookingModeGuard } from "@/lib/booking/use-booking-mode-guard";
import { cn } from "@/lib/utils";

const DA_NANG_PHUONG = [
  "Phường Hải Châu", "Phường Hòa Cường", "Phường Thanh Khê", "Phường An Khê",
  "Phường An Hải", "Phường Sơn Trà", "Phường Ngũ Hành Sơn", "Phường Hòa Khánh",
  "Phường Hải Vân", "Phường Liên Chiểu", "Phường Cẩm Lệ", "Phường Hòa Xuân",
];

const STUDENT_PRESETS = [
  { label: "KTX Bách Khoa", street: "KTX ĐH Bách Khoa, 54 Nguyễn Lương Bằng", ward: "Phường Hòa Khánh" },
  { label: "KTX Kinh Tế", street: "KTX ĐH Kinh Tế, 71 Ngũ Hành Sơn", ward: "Phường Ngũ Hành Sơn" },
  { label: "KTX Sư Phạm", street: "KTX ĐH Sư Phạm, 459 Tôn Đức Thắng", ward: "Phường Hòa Khánh" },
  { label: "Đại học FPT", street: "Khu đô thị FPT City, Hòa Hải", ward: "Phường Ngũ Hành Sơn" },
  { label: "KTX Khu Tây", street: "KTX Tập trung phía Tây, KĐT Nam Cao", ward: "Phường Liên Chiểu" },
];

function buildAddress(street: string, ward: string) {
  return [street.trim(), ward, "Đà Nẵng"].filter(Boolean).join(", ");
}

function parseAddress(fullAddr: string) {
  if (!fullAddr) return { street: "", ward: "" };
  const parts = fullAddr.split(",").map((s) => s.trim());
  const foundWard = DA_NANG_PHUONG.find((p) => parts.some((part) => part.toLowerCase() === p.toLowerCase())) || "";
  const filteredStreet = parts.filter(
    (p) => p.toLowerCase() !== "đà nẵng" && p.toLowerCase() !== foundWard.toLowerCase()
  ).join(", ");
  return { street: filteredStreet, ward: foundWard };
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="mb-1.5 text-xs font-semibold text-gray-700">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </p>
  );
}

export default function DiaDiemPage() {
  const router = useRouter();
  useBookingModeGuard();
  const { isComboBooking, isSharedMoving, serviceKind, pickup, destination, setPickup, setDestination } = useBookingFlowStore();

  const isLaborOnly = serviceKind === "laborOnly";

  const initialPickup = parseAddress(pickup);
  const initialDest = parseAddress(destination);

  const [pickupWard,   setPickupWard]   = useState(initialPickup.ward);
  const [pickupStreet, setPickupStreet] = useState(initialPickup.street);
  const [destWard,     setDestWard]     = useState(initialDest.ward);
  const [destStreet,   setDestStreet]   = useState(initialDest.street);

  useEffect(() => {
    if (pickup && !pickupStreet && !pickupWard) {
      const p = parseAddress(pickup);
      setPickupStreet(p.street);
      setPickupWard(p.ward);
    }
    if (destination && !destStreet && !destWard) {
      const d = parseAddress(destination);
      setDestStreet(d.street);
      setDestWard(d.ward);
    }
  }, [pickup, destination, pickupStreet, pickupWard, destStreet, destWard]);

  const handlePickupWard = (v: string) => {
    setPickupWard(v);
    setPickup(buildAddress(pickupStreet, v));
  };
  const handlePickupStreet = (v: string) => {
    setPickupStreet(v);
    setPickup(buildAddress(v, pickupWard));
  };
  const handleDestWard = (v: string) => {
    setDestWard(v);
    setDestination(buildAddress(destStreet, v));
  };
  const handleDestStreet = (v: string) => {
    setDestStreet(v);
    setDestination(buildAddress(v, destWard));
  };

  const handleApplyPreset = (target: "pickup" | "dest", preset: typeof STUDENT_PRESETS[0]) => {
    if (target === "pickup") {
      setPickupStreet(preset.street);
      setPickupWard(preset.ward);
      setPickup(buildAddress(preset.street, preset.ward));
    } else {
      setDestStreet(preset.street);
      setDestWard(preset.ward);
      setDestination(buildAddress(preset.street, preset.ward));
    }
  };

  const pickupReady = pickupWard.length > 0 && pickupStreet.trim().length > 0;
  const destReady   = destWard.length > 0   && destStreet.trim().length > 0;
  const canContinue = isLaborOnly ? destReady : pickupReady && destReady;

  const title = isLaborOnly ? "Địa điểm làm việc" : "Trọ cũ → trọ mới";
  const steps = isComboBooking ? [...COMBO_WIZARD_STEPS] : [...QUOTE_WIZARD_STEPS];

  const pickupFullPreview = pickupReady ? buildAddress(pickupStreet, pickupWard) : "";
  const destFullPreview   = destReady   ? buildAddress(destStreet, destWard)     : "";

  return (
    <BookingWizardLayout
      steps={steps}
      currentStep={1}
      title={title}
      contentWidth="wide"
      hideSidebar
      intro={
        !isLaborOnly ? (
          <BookingModeIntro mode={isComboBooking ? "combo" : "quote"} isShared={isSharedMoving} />
        ) : undefined
      }
      segmentProgress={{ current: 1, total: isComboBooking ? 6 : 3 }}
      onContinue={() =>
        router.push(isLaborOnly ? "/dat-chuyen/khuan-vac/cau-hinh" : "/dat-chuyen/phong-tro")
      }
      continueDisabled={!canContinue}
    >
      <BookingInsuranceBanner />

      {/* ── Visual Journey Route Bar (Preview lộ trình nối điểm) ── */}
      {!isLaborOnly && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-amber-50/60 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0047FF] text-white shadow-sm">
                <MapPin size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Điểm lấy đồ</p>
                <p className="truncate text-xs sm:text-sm font-semibold text-gray-900">
                  {pickupFullPreview || "Chưa chọn trọ cũ"}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center px-2 text-[#0047FF]">
              <div className="h-px w-8 bg-blue-200" />
              <div className="mx-1 rounded-full bg-blue-100 p-1 text-[#0047FF]">
                <Truck size={14} />
              </div>
              <ArrowRight size={14} className="text-blue-400" />
            </div>

            <div className="flex flex-1 items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B] text-white shadow-sm">
                <Truck size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Điểm giao đồ</p>
                <p className="truncate text-xs sm:text-sm font-semibold text-gray-900">
                  {destFullPreview || "Chưa chọn trọ mới"}
                </p>
              </div>
            </div>
          </div>

          {isSharedMoving && (
            <div className="mt-3 pt-2.5 border-t border-blue-200/50 flex items-center justify-between text-xs text-emerald-800">
              <span className="flex items-center gap-1 font-bold">
                <Sparkles size={14} className="text-emerald-600" /> Ghép đơn sinh viên: Tiết kiệm 25% cước phí
              </span>
              <span className="text-[11px] text-emerald-700 hidden sm:inline">
                Tự động tối ưu hóa lộ trình xe
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Main Unified Address Grid Card ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className={cn(
          "grid",
          isLaborOnly ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 md:divide-x md:divide-gray-100"
        )}>
          {/* ── Left Column: Trọ cũ (Lấy đồ) ── */}
          {!isLaborOnly && (
            <div className="flex flex-col justify-between p-5 lg:p-6 space-y-5 border-b border-gray-100 md:border-b-0">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#0047FF]">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Trọ cũ (lấy đồ)</h2>
                      <p className="text-xs text-gray-400">Nơi tài xế và thợ bốc xếp đến nhận đồ</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#0047FF]">
                    Điểm xuất phát
                  </span>
                </div>

                {/* City & Ward */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Thành phố</FieldLabel>
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3">
                      <MapPin size={15} className="shrink-0 text-gray-400" />
                      <span className="flex-1 text-sm font-semibold text-gray-600">Đà Nẵng</span>
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-500">Mặc định</span>
                    </div>
                  </div>

                  <div>
                    <FieldLabel required>Phường</FieldLabel>
                    <div className="relative">
                      <select
                        value={pickupWard}
                        onChange={(e) => handlePickupWard(e.target.value)}
                        className="w-full h-11 appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-900 focus:border-[#0047FF] focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20"
                      >
                        <option value="">-- Chọn phường --</option>
                        {DA_NANG_PHUONG.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Street address */}
                <div>
                  <FieldLabel required>Số nhà, tên đường, tên toà nhà / KTX</FieldLabel>
                  <div className="relative">
                    <input
                      type="text"
                      value={pickupStreet}
                      onChange={(e) => handlePickupStreet(e.target.value)}
                      placeholder="VD: 45 Nguyễn Văn Linh hoặc KTX Bách Khoa"
                      className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0047FF] focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20"
                    />
                  </div>
                </div>

                {/* Quick Presets for Students */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 size={13} className="text-gray-400" />
                    <span className="text-[11px] font-semibold text-gray-500">Gợi ý nhanh KTX sinh viên:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STUDENT_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleApplyPreset("pickup", p)}
                        className="rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:border-[#0047FF] hover:bg-blue-50 hover:text-[#0047FF] transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status pill */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                {pickupReady ? (
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 p-2.5 text-xs text-blue-900">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0047FF] text-white">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="truncate font-semibold">{pickupFullPreview}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Vui lòng chọn phường và nhập số nhà/tên đường</p>
                )}
              </div>
            </div>
          )}

          {/* ── Right Column: Trọ mới (Giao đồ) ── */}
          <div className="flex flex-col justify-between p-5 lg:p-6 space-y-5">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#F59E0B]">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {isLaborOnly ? "Địa chỉ làm việc" : "Trọ mới (giao đồ)"}
                    </h2>
                    <p className="text-xs text-gray-400">Nơi giao đồ và sắp xếp vào phòng mới</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                  Điểm đến
                </span>
              </div>

              {/* City & Ward */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Thành phố</FieldLabel>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3">
                    <MapPin size={15} className="shrink-0 text-gray-400" />
                    <span className="flex-1 text-sm font-semibold text-gray-600">Đà Nẵng</span>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-500">Mặc định</span>
                  </div>
                </div>

                <div>
                  <FieldLabel required>Phường</FieldLabel>
                  <div className="relative">
                    <select
                      value={destWard}
                      onChange={(e) => handleDestWard(e.target.value)}
                      className="w-full h-11 appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-900 focus:border-[#0047FF] focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20"
                    >
                      <option value="">-- Chọn phường --</option>
                      {DA_NANG_PHUONG.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Street address */}
              <div>
                <FieldLabel required>Số nhà, tên đường, tên toà nhà / KTX mới</FieldLabel>
                <div className="relative">
                  <input
                    type="text"
                    value={destStreet}
                    onChange={(e) => handleDestStreet(e.target.value)}
                    placeholder="VD: 120 Ngũ Hành Sơn hoặc KTX Khu Tây"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0047FF] focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20"
                  />
                </div>
              </div>

              {/* Quick Presets for Students */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 size={13} className="text-gray-400" />
                  <span className="text-[11px] font-semibold text-gray-500">Gợi ý nhanh điểm đến KTX:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STUDENT_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleApplyPreset("dest", p)}
                      className="rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:border-[#F59E0B] hover:bg-amber-50 hover:text-amber-800 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Status pill */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              {destReady ? (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 p-2.5 text-xs text-amber-950">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-white">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="truncate font-semibold">{destFullPreview}</span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Vui lòng chọn phường và nhập số nhà/tên đường</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Helpful tip */}
      <p className="text-center text-xs text-gray-400">
        💡 Bạn có thể thêm ghi chú chi tiết về số phòng, số tầng hoặc hẻm nhỏ ở bước tiếp theo (Mô tả trọ).
      </p>
    </BookingWizardLayout>
  );
}
