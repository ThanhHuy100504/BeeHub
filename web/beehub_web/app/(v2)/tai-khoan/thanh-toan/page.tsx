"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CreditCard, Wallet, RefreshCw, ArrowDownLeft, ArrowUpRight,
  ShieldCheck, ChevronRight, Receipt,
} from "lucide-react";
import { paymentsApi } from "@/lib/api";
import { cn, formatVND, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_purpose?: string;
  created_at: string;
  order_id?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  completed: { label: "Thành công", bg: "#DCFCE7", text: "#15803D" },
  paid:      { label: "Thành công", bg: "#DCFCE7", text: "#15803D" },
  success:   { label: "Thành công", bg: "#DCFCE7", text: "#15803D" },
  pending:   { label: "Chờ thanh toán", bg: "#FEF9C3", text: "#A16207" },
  processing:{ label: "Đang xử lý", bg: "#DBEAFE", text: "#1D4ED8" },
  failed:    { label: "Thất bại", bg: "#FEE2E2", text: "#DC2626" },
  cancelled: { label: "Đã hủy", bg: "#F3F4F6", text: "#6B7280" },
  refunded:  { label: "Đã hoàn tiền", bg: "#EDE9FE", text: "#6D28D9" },
  rejected:  { label: "Bị từ chối", bg: "#FEE2E2", text: "#DC2626" },
};

const PURPOSE_MAP: Record<string, string> = {
  deposit: "Đặt cọc đơn hàng",
  final_payment: "Thanh toán còn lại",
  remaining: "Thanh toán còn lại",
  refund: "Hoàn tiền",
  withdrawal: "Rút tiền",
};

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "success", label: "Thành công" },
  { key: "pending", label: "Đang chờ" },
  { key: "failed", label: "Thất bại / Hủy" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function isSuccess(s: string) {
  return ["completed", "paid", "success"].includes(s);
}

export default function ThanhToanPage() {
  const [wallet, setWallet] = useState<{ balance?: number } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = async () => {
    setLoading(true);
    try {
      const [w, p] = await Promise.all([paymentsApi.getWallet(), paymentsApi.list()]);
      if (w.success) setWallet(w.data as { balance?: number });
      if (p.success) {
        const d = p.data as Payment[] | { payments?: Payment[] };
        setPayments(Array.isArray(d) ? d : d?.payments ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalPaid = useMemo(
    () => payments.filter((p) => isSuccess(p.status) && p.payment_purpose !== "refund")
      .reduce((s, p) => s + Number(p.amount || 0), 0),
    [payments],
  );
  const totalRefund = useMemo(
    () => payments.filter((p) => p.payment_purpose === "refund" || p.status === "refunded")
      .reduce((s, p) => s + Number(p.amount || 0), 0),
    [payments],
  );

  const filtered = payments.filter((p) => {
    if (filter === "all") return true;
    if (filter === "success") return isSuccess(p.status);
    if (filter === "pending") return ["pending", "processing"].includes(p.status);
    return ["failed", "cancelled", "rejected"].includes(p.status);
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-6 pt-4 sm:space-y-5 sm:pt-6 lg:max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/tai-khoan"
          aria-label="Quay lại"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm active:scale-95"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">Thanh toán &amp; Ví</h1>
          <p className="truncate text-xs text-gray-500 sm:text-sm">Số dư ví và lịch sử giao dịch</p>
        </div>
        <button
          onClick={load}
          aria-label="Làm mới"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm active:scale-95"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Wallet card */}
      <div
        className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-6"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563EB 60%, #3b82f6 100%)" }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex items-center gap-2 text-blue-100">
            <Wallet size={16} />
            <span className="text-xs font-medium sm:text-sm">Số dư ví BeeHub</span>
          </div>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-40 bg-white/20" />
          ) : (
            <p className="mt-1.5 break-all text-3xl font-extrabold tracking-tight sm:text-4xl">
              {formatVND(wallet?.balance ?? 0)}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[11px] text-blue-100">
                <ArrowUpRight size={12} /> Đã thanh toán
              </div>
              <p className="mt-0.5 truncate text-sm font-bold sm:text-base">{formatVND(totalPaid)}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[11px] text-blue-100">
                <ArrowDownLeft size={12} /> Đã hoàn tiền
              </div>
              <p className="mt-0.5 truncate text-sm font-bold sm:text-base">{formatVND(totalRefund)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
        <p className="text-xs leading-relaxed text-emerald-800 sm:text-sm">
          Tiền đặt cọc được thanh toán an toàn qua PayOS. Khoản hoàn tiền (nếu có) sẽ được cộng vào ví trong 1–3 ngày làm việc.
        </p>
      </div>

      {/* History */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-[#2563EB]" />
            <h2 className="text-sm font-bold text-gray-900 sm:text-base">Lịch sử giao dịch</h2>
          </div>
          <span className="text-xs text-gray-400">{filtered.length} giao dịch</span>
        </div>

        {/* Filter chips - horizontal scroll on mobile */}
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-gray-50 px-4 py-2.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f.key ? "bg-[#2563EB] text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <Receipt size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Chưa có giao dịch</p>
            <p className="mt-1 text-xs text-gray-400">Các khoản đặt cọc và thanh toán sẽ hiển thị tại đây</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map((p) => {
              const st = STATUS_MAP[p.status] ?? { label: p.status, bg: "#F3F4F6", text: "#6B7280" };
              const isRefund = p.payment_purpose === "refund" || p.status === "refunded";
              const title = PURPOSE_MAP[p.payment_purpose ?? ""] ?? "Thanh toán";
              const Row = (
                <div className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isRefund ? "bg-violet-50 text-violet-600" : "bg-blue-50 text-[#2563EB]",
                    )}
                  >
                    {isRefund ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
                    <p className="truncate text-[11px] text-gray-400 sm:text-xs">
                      {formatDate(p.created_at)}
                      {p.order_id ? ` · Đơn #${p.order_id.slice(0, 8).toUpperCase()}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-bold", isRefund ? "text-violet-600" : "text-gray-900")}>
                      {isRefund ? "+" : "-"}{formatVND(p.amount)}
                    </p>
                    <span
                      className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: st.bg, color: st.text }}
                    >
                      {st.label}
                    </span>
                  </div>
                  {p.order_id && <ChevronRight size={16} className="shrink-0 text-gray-300" />}
                </div>
              );
              return (
                <li key={p.id}>
                  {p.order_id ? (
                    <Link href={`/don-hang/${p.order_id}`} className="block no-underline">{Row}</Link>
                  ) : Row}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
