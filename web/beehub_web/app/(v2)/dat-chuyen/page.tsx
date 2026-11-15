"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, Route, ChevronRight, Users, Sparkles, Scale, Truck, ShieldCheck } from "lucide-react";
import { useBookingFlowStore } from "@/lib/stores/useBookingFlowStore";
import { cn } from "@/lib/utils";

function QueryRedirect() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const mode = sp.get("mode");
    const loai = sp.get("loai");
    const laborOnly = sp.get("laborOnly");
    const store = useBookingFlowStore.getState();
    store.resetFlow();

    if (loai === "khuan-vac") {
      store.setServiceKind("laborAddon");
      router.replace("/dat-chuyen/khuan-vac");
      return;
    }
    if (laborOnly === "1") {
      store.setServiceKind("laborOnly");
      router.replace("/dat-chuyen/dia-diem");
      return;
    }
    if (mode === "combo" || mode === "quote" || mode === "shared" || mode === "ghep-don") {
      if (mode === "shared" || mode === "ghep-don") {
        store.setBookingMode("combo");
        store.setIsSharedMoving(true);
      } else {
        store.setBookingMode(mode === "combo" ? "combo" : "quote");
        store.setIsSharedMoving(false);
      }
      router.replace("/dat-chuyen/dia-diem");
    }
  }, [router, sp]);

  const mode = sp.get("mode");
  const loai = sp.get("loai");
  const laborOnly = sp.get("laborOnly");
  if (loai || laborOnly || mode === "combo" || mode === "quote" || mode === "shared" || mode === "ghep-don") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-gray-500">Đang mở luồng đặt chuyến...</p>
      </div>
    );
  }

  return <ModeChooser />;
}

const HIGHLIGHTS = {
  shared: [
    "Giảm ngay 25% cước xe + bốc xếp",
    "Tự động ghép cùng bạn cùng tuyến & ngày",
    "Cọc 30% và thanh toán riêng từng người",
  ],
  combo: [
    "Biết giá ngay, không chờ báo giá",
    "1 mình 1 chuyến xe riêng trọn vẹn",
    "Xe + người khuân trong một gói cố định",
  ],
  quote: [
    "Nhiều nhà xe cùng báo giá cạnh tranh",
    "Linh hoạt chuyến xa / nhiều điểm dừng",
    "Bạn chủ động chọn mức giá ưng ý",
  ],
} as const;

function ModeChooser() {
  const router = useRouter();
  const resetFlow = useBookingFlowStore((s) => s.resetFlow);
  const setBookingMode = useBookingFlowStore((s) => s.setBookingMode);
  const setIsSharedMoving = useBookingFlowStore((s) => s.setIsSharedMoving);

  useEffect(() => {
    resetFlow();
  }, [resetFlow]);

  const choose = (mode: "combo" | "quote", isShared = false) => {
    setBookingMode(mode);
    setIsSharedMoving(isShared);
    router.push("/dat-chuyen/dia-diem");
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:py-14">
      <div className="mb-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#0047FF]">
          Đặt chuyến BeeHub
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Chuyển trọ theo cách nào phù hợp với bạn?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-500">
          Lựa chọn hình thức tối ưu theo nhu cầu: Ghép đơn tiết kiệm 25%, Combo riêng biệt nhanh chóng hoặc Báo giá linh hoạt.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Ghép đơn sinh viên */}
        <button
          type="button"
          onClick={() => choose("combo", true)}
          className={cn(
            "group relative flex h-full flex-col justify-between rounded-2xl border-2 border-emerald-400 bg-gradient-to-b from-emerald-50/40 via-white to-white p-5 sm:p-6 text-left shadow-sm",
            "transition-all hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-100/50 hover:-translate-y-0.5",
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                <Sparkles size={10} />
                Tiết kiệm 25%
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                HOT Sinh viên
              </span>
            </div>

            <div className="mt-4 flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition group-hover:scale-105">
              <Users size={28} strokeWidth={1.75} />
            </div>

            <h2 className="mt-4 text-lg font-bold text-gray-900">Ghép đơn sinh viên</h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-600">
              Hệ thống tự động ghép với bạn sinh viên cùng tuyến & ngày. Tiết kiệm 25% cước, cọc và thanh toán hoàn toàn riêng biệt.
            </p>

            <ul className="mt-4 space-y-2">
              {HIGHLIGHTS.shared.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-emerald-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700">
              Chọn ghép đơn (-25%)
              <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>

        {/* Card 2: Gói combo riêng biệt */}
        <button
          type="button"
          onClick={() => choose("combo", false)}
          className={cn(
            "group relative flex h-full flex-col justify-between rounded-2xl border-2 border-gray-100 bg-white p-5 sm:p-6 text-left shadow-sm",
            "transition-all hover:border-[#0047FF]/50 hover:shadow-xl hover:shadow-blue-100/40 hover:-translate-y-0.5",
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0047FF] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                <Truck size={10} />
                Chuyến riêng
              </span>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                Tiện lợi
              </span>
            </div>

            <div className="mt-4 flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#0047FF] transition group-hover:scale-105">
              <Package size={28} strokeWidth={1.75} />
            </div>

            <h2 className="mt-4 text-lg font-bold text-gray-900">Gói combo riêng</h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-600">
              Trọn gói xe và người khuân vác dành riêng cho bạn — biết giá cố định ngay, không chờ báo giá, 1 mình 1 chuyến xe riêng.
            </p>

            <ul className="mt-4 space-y-2">
              {HIGHLIGHTS.combo.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0047FF]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#0047FF]">
              Chọn gói combo
              <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>

        {/* Card 3: Báo giá linh hoạt */}
        <button
          type="button"
          onClick={() => choose("quote", false)}
          className={cn(
            "group relative flex h-full flex-col justify-between rounded-2xl border-2 border-gray-100 bg-white p-5 sm:p-6 text-left shadow-sm",
            "transition-all hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-100/40 hover:-translate-y-0.5",
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                <Scale size={10} />
                Linh hoạt
              </span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                So sánh giá
              </span>
            </div>

            <div className="mt-4 flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition group-hover:scale-105">
              <Route size={28} strokeWidth={1.75} />
            </div>

            <h2 className="mt-4 text-lg font-bold text-gray-900">Chuyến thông thường</h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-600">
              Gửi nhu cầu chuyển trọ — các nhà xe uy tín sẽ báo giá cạnh tranh để bạn so sánh và chọn mức giá tốt nhất.
            </p>

            <ul className="mt-4 space-y-2">
              {HIGHLIGHTS.quote.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-amber-700">
              Nhận báo giá
              <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>
      </div>

      {/* Cam kết minh bạch */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
        <ShieldCheck size={16} className="text-emerald-600" />
        <span>100% đơn hàng tại BeeHub được bảo hiểm hàng hóa và bảo đảm cọc an toàn qua PayOS</span>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-4 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm">
          <Users size={18} />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Chỉ cần người bốc xếp, không cần xe?
        </p>
        <Link
          href="/dat-chuyen?loai=khuan-vac"
          className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0047FF] hover:underline"
        >
          Xem dịch vụ khuân vác
          <ChevronRight size={14} />
        </Link>
      </div>

      <p className="mt-8 text-center">
        <Link href="/trang-chu" className="text-sm text-gray-400 transition hover:text-gray-600">
          ← Về trang chủ
        </Link>
      </p>
    </div>
  );
}

export default function DatChuyenEntryPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-gray-500">Đang tải...</div>}>
      <QueryRedirect />
    </Suspense>
  );
}
