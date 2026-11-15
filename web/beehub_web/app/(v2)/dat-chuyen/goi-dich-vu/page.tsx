"use client";

import { useRouter } from "next/navigation";
import { Check, Package, Truck, Users, Sparkles, Shield } from "lucide-react";
import {
  BookingWizardLayout,
  BookingInsuranceBanner,
  RoutePointsCard,
  COMBO_WIZARD_STEPS,
} from "@/components/booking/BookingWizardLayout";
import { useBookingFlowStore } from "@/lib/stores/useBookingFlowStore";
import { useBookingModeGuard } from "@/lib/booking/use-booking-mode-guard";
import { SERVICE_PACKAGES, packagePriceAtLabor, type ServicePackage } from "@/lib/booking/constants";
import { formatVND, cn } from "@/lib/utils";

function ComboEstimateSidebar({
  pkg,
  laborCount,
  isShared,
  sharedDiscount,
  total,
}: {
  pkg: ServicePackage;
  laborCount: number;
  isShared: boolean;
  sharedDiscount: number;
  total: number;
}) {
  const laborFee = laborCount * pkg.extraLaborComboPrice;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">Tạm tính</h3>
        <div className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="text-gray-500">{pkg.label}</span>
            <span className="shrink-0 font-semibold text-gray-900">
              {formatVND(pkg.transportBasePrice)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-500">{pkg.includedKm}km bao gồm</span>
            <span className="text-xs font-semibold text-green-600">Miễn phí</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-500">{laborCount} người khuân</span>
            <span className="font-semibold text-gray-900">{formatVND(laborFee)}</span>
          </div>
          {isShared && (
            <div className="flex items-center justify-between gap-2 text-emerald-600 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles size={14} /> Ghép đơn sinh viên (-25%)
              </span>
              <span>-{formatVND(sharedDiscount)}</span>
            </div>
          )}
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-end justify-between gap-2">
            <span className="text-sm font-bold text-gray-900">Tổng cộng</span>
            <span className="text-2xl font-bold text-[#0047FF]">{formatVND(total)}</span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
            * Giá có thể thay đổi nếu quãng đường vượt quá {pkg.includedKm}km niêm yết.
          </p>
        </div>
      </div>

      <div className="flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <Truck size={40} strokeWidth={1.25} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Đội xe BeeHub</span>
        </div>
      </div>
    </div>
  );
}

function LaborPicker({
  pkg,
  laborCount,
  onChange,
}: {
  pkg: ServicePackage;
  laborCount: number;
  onChange: (n: number) => void;
}) {
  return (
    <div
      className="border-t border-[#0047FF]/20 bg-blue-50/70 px-4 py-4 sm:px-5"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#0047FF]">
        Chọn số người khuân vác
        <span className="ml-1.5 font-semibold normal-case text-gray-600">
          (gợi ý {pkg.laborSuggested} người)
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        {Array.from({ length: pkg.maxLaborCount }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm transition-all",
              laborCount === n
                ? "scale-105 border-[#0047FF] bg-[#0047FF] text-white"
                : "border-white bg-white text-gray-800 hover:border-[#0047FF]/40"
            )}
          >
            {n}
          </button>
        ))}
        <span className="ml-1 text-sm text-gray-600">người</span>
      </div>
      <p className="mt-3 text-sm font-bold text-gray-900">
        Tạm tính gói này:{" "}
        <span className="text-[#0047FF]">{formatVND(packagePriceAtLabor(pkg, laborCount))}</span>
      </p>
    </div>
  );
}

function PackageOptionCard({
  pkg,
  selected,
  laborCount,
  onSelect,
  onLaborChange,
}: {
  pkg: ServicePackage;
  selected: boolean;
  laborCount: number;
  onSelect: () => void;
  onLaborChange: (n: number) => void;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all",
        selected ? "border-[#0047FF] shadow-md shadow-blue-100/50" : "border-gray-100"
      )}
    >
      {pkg.popular && (
        <div className="bg-[#0047FF] py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-white">
          Phổ biến
        </div>
      )}
      <button type="button" onClick={onSelect} className="w-full p-4 text-left sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0047FF]">
              {pkg.badge}
            </span>
            <h3 className="mt-1 text-base font-bold text-gray-900">{pkg.label}</h3>
            <p className="mt-0.5 text-xs text-gray-500">{pkg.subtitle}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-[#0047FF]">
              từ {formatVND(packagePriceAtLabor(pkg, pkg.laborSuggested))}
            </p>
            <div
              className={cn(
                "ml-auto mt-2 flex h-5 w-5 items-center justify-center rounded-full border-2",
                selected ? "border-[#0047FF] bg-[#0047FF]" : "border-gray-300 bg-white"
              )}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-white" />}
            </div>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {pkg.features.map((f) => (
            <li key={f.text} className="flex items-start gap-2.5 text-xs text-gray-600">
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                  f.included ? "bg-blue-50 text-[#0047FF]" : "bg-gray-50 text-gray-300"
                )}
              >
                <Check size={10} strokeWidth={3} />
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </button>
      {selected && (
        <LaborPicker pkg={pkg} laborCount={laborCount} onChange={onLaborChange} />
      )}
    </div>
  );
}

export default function GoiDichVuPage() {
  const router = useRouter();
  useBookingModeGuard({ requireCombo: true });
  const pickup = useBookingFlowStore((s) => s.pickup);
  const destination = useBookingFlowStore((s) => s.destination);
  const {
    selectedTier,
    selectedComboLaborCount,
    isSharedMoving,
    setIsSharedMoving,
    setSelectedTier,
    setComboLaborCount,
  } = useBookingFlowStore();

  const pkg = SERVICE_PACKAGES.find((p) => p.tier === selectedTier)!;
  const baseTotal = packagePriceAtLabor(pkg, selectedComboLaborCount);
  const sharedDiscount = isSharedMoving ? Math.round(baseTotal * 0.25) : 0;
  const estimateTotal = Math.max(0, baseTotal - sharedDiscount);

  return (
    <BookingWizardLayout
      steps={[...COMBO_WIZARD_STEPS]}
      currentStep={4}
      segmentProgress={{ current: 4, total: 6 }}
      compact
      title="Chọn gói combo & hình thức"
      subtitle="Giá xe + km niêm yết cố định. Bạn có thể chọn đi riêng hoặc ghép đơn tiết kiệm 25%."
      cancelHref="/dat-chuyen/lich-hen"
      onContinue={() => router.push("/dat-chuyen/doi-tac")}
      continueLabel="Chọn nhà xe"
      sidebar={
        <ComboEstimateSidebar
          pkg={pkg}
          laborCount={selectedComboLaborCount}
          isShared={isSharedMoving}
          sharedDiscount={sharedDiscount}
          total={estimateTotal}
        />
      }
    >
      <RoutePointsCard pickup={pickup} destination={destination} />
      <BookingInsuranceBanner />

      {/* ── Hình thức vận chuyển: Riêng vs Ghép ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
            <Users size={18} className="text-[#0047FF]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 sm:text-base">Hình thức chuyển trọ</h2>
            <p className="text-xs text-gray-500">Chủ động chọn chuyến riêng biệt hoặc ghép chuyến tiết kiệm chi phí</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Option: Chuyển riêng */}
          <button
            type="button"
            onClick={() => setIsSharedMoving(false)}
            className={cn(
              "relative flex flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all",
              !isSharedMoving
                ? "border-[#0047FF] bg-blue-50/40 shadow-sm shadow-blue-100"
                : "border-gray-100 bg-white hover:border-gray-200"
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-700">
                  <Truck size={13} /> Chuyến riêng
                </span>
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    !isSharedMoving ? "border-[#0047FF] bg-[#0047FF]" : "border-gray-300 bg-white"
                  )}
                >
                  {!isSharedMoving && <span className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>
              <h3 className="mt-3 text-sm font-bold text-gray-900 sm:text-base">Chuyển trọ riêng</h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                1 mình 1 chuyến xe trọn gói. Chủ động giờ giấc xuất phát, thùng xe dành riêng cho đồ đạc của bạn.
              </p>
            </div>
            <p className="mt-3 text-xs font-semibold text-gray-600">Giá chuẩn theo gói niêm yết</p>
          </button>

          {/* Option: Ghép đơn sinh viên */}
          <button
            type="button"
            onClick={() => setIsSharedMoving(true)}
            className={cn(
              "relative flex flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all",
              isSharedMoving
                ? "border-emerald-500 bg-emerald-50/40 shadow-sm shadow-emerald-100"
                : "border-gray-100 bg-white hover:border-emerald-200"
            )}
          >
            <div className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Tiết kiệm 25%
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  <Sparkles size={13} className="text-emerald-600" /> Ghép đơn sinh viên
                </span>
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    isSharedMoving ? "border-emerald-500 bg-emerald-500" : "border-gray-300 bg-white"
                  )}
                >
                  {isSharedMoving && <span className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>
              <h3 className="mt-3 text-sm font-bold text-gray-900 sm:text-base">Ghép chuyến thông minh</h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Hệ thống tự động ghép với bạn sinh viên cùng tuyến đường và ngày chuyển. Mỗi người tính cước, cọc và thanh toán riêng độc lập.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">Giảm ngay 25% cước</span>
              <span className="text-xs font-bold text-emerald-600">-{formatVND(sharedDiscount)}</span>
            </div>
          </button>
        </div>

        {isSharedMoving && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
            <Shield size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <span className="font-bold">Cam kết minh bạch:</span> Mỗi đơn hàng trong nhóm ghép vẫn có mã đơn riêng, thanh toán và cọc độc lập. Nếu đơn của bạn khác gặp sự cố, đơn của bạn vẫn được đảm bảo tiến độ!
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF]">
            <Package size={18} className="text-[#0047FF]" />
          </div>
          <h2 className="text-sm font-bold text-gray-900 sm:text-base">Gói xe + khuân vác</h2>
        </div>

        <div className="space-y-3">
          {SERVICE_PACKAGES.map((p) => (
            <PackageOptionCard
              key={p.tier}
              pkg={p}
              selected={selectedTier === p.tier}
              laborCount={selectedComboLaborCount}
              onSelect={() => setSelectedTier(p.tier)}
              onLaborChange={setComboLaborCount}
            />
          ))}
        </div>
      </div>
    </BookingWizardLayout>
  );
}
