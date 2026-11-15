"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Package,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  Building2,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { providerApi } from "@/lib/api";
import { formatVND, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Period = "week" | "month" | "year";

interface BankInfo {
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
}

interface WithdrawalItem {
  id: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: string;
  requested_at: string;
  processed_at?: string | null;
  transaction_reference?: string | null;
  notes?: string | null;
  rejection_reason?: string | null;
}

interface EarningsData {
  period: string;
  total_earned: number;
  total_orders: number;
  breakdown: { date: string; earned: number; orders: number }[];
  all_time_earned?: number;
  all_time_net?: number;
  available_balance?: number;
  total_withdrawn?: number;
  pending_withdrawal?: number;
  bank_info?: BankInfo;
  withdrawals?: WithdrawalItem[];
}

const POPULAR_BANKS = [
  "Vietcombank (VCB)",
  "MB Bank (MB)",
  "Techcombank (TCB)",
  "BIDV",
  "VietinBank (CTG)",
  "ACB",
  "VPBank",
  "TPBank",
  "Sacombank (STB)",
  "Agribank",
  "VIB",
  "HDBank",
  "SHB",
  "MSB",
  "OCB",
];

const WITHDRAWAL_STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Chờ duyệt",
    bg: "#FEF9C3",
    text: "#A16207",
    icon: <Clock size={12} />,
  },
  processing: {
    label: "Đang xử lý",
    bg: "#DBEAFE",
    text: "#1D4ED8",
    icon: <Clock size={12} />,
  },
  completed: {
    label: "Đã chuyển khoản",
    bg: "#DCFCE7",
    text: "#15803D",
    icon: <CheckCircle2 size={12} />,
  },
  rejected: {
    label: "Từ chối",
    bg: "#FEE2E2",
    text: "#DC2626",
    icon: <XCircle size={12} />,
  },
  failed: {
    label: "Thất bại",
    bg: "#FEE2E2",
    text: "#DC2626",
    icon: <XCircle size={12} />,
  },
  cancelled: {
    label: "Đã hủy",
    bg: "#F3F4F6",
    text: "#6B7280",
    icon: <XCircle size={12} />,
  },
};

function formatDateLabel(yyyyMmDd: string): string {
  const parts = yyyyMmDd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return yyyyMmDd;
}

export default function EarningsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<EarningsData | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Form states
  const [amountInput, setAmountInput] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(
    async (p: Period = period) => {
      setLoading(true);
      try {
        const r = await providerApi.getEarnings(p);
        if (r.success && r.data) {
          const d = r.data as EarningsData;
          setData(d);
          if (d.bank_info) {
            setBankName(d.bank_info.bank_name || "");
            setBankAccountNumber(d.bank_info.bank_account_number || "");
            setBankAccountName(d.bank_info.bank_account_name || "");
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [period],
  );

  useEffect(() => {
    load(period);
  }, [period, load]);

  const total = data?.total_earned ?? 0;
  const net = Math.round(total * 0.9);
  const fee = Math.round(total * 0.1);
  const orders = data?.total_orders ?? 0;

  const availableBalance = data?.available_balance ?? 0;
  const pendingWithdrawal = data?.pending_withdrawal ?? 0;
  const totalWithdrawn = data?.total_withdrawn ?? 0;
  const withdrawals = data?.withdrawals ?? [];
  const hasBankInfo = Boolean(
    data?.bank_info?.bank_name &&
      data?.bank_info?.bank_account_number &&
      data?.bank_info?.bank_account_name,
  );

  const openWithdrawModal = () => {
    setAmountInput(availableBalance > 0 ? String(availableBalance) : "");
    setBankName(data?.bank_info?.bank_name || POPULAR_BANKS[0]);
    setBankAccountNumber(data?.bank_info?.bank_account_number || "");
    setBankAccountName(data?.bank_info?.bank_account_name || "");
    setNotes("");
    setShowWithdrawModal(true);
  };

  const openBankModal = () => {
    setBankName(data?.bank_info?.bank_name || POPULAR_BANKS[0]);
    setBankAccountNumber(data?.bank_info?.bank_account_number || "");
    setBankAccountName(data?.bank_info?.bank_account_name || "");
    setShowBankModal(true);
  };

  const handleSaveBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      toast("Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng", "error");
      return;
    }
    setSubmitting(true);
    try {
      await providerApi.updateBankInfo({
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_account_name: bankAccountName.trim().toUpperCase(),
      });
      toast("Đã lưu thông tin tài khoản ngân hàng", "success");
      setShowBankModal(false);
      await load(period);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không lưu được thông tin ngân hàng", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseInt(amountInput.replace(/\D/g, ""), 10) || 0;
    if (numericAmount < 1000) {
      toast("Số tiền rút tối thiểu là 1.000đ", "error");
      return;
    }
    if (numericAmount > availableBalance) {
      toast(`Số tiền vượt quá số dư khả dụng (${formatVND(availableBalance)})`, "error");
      return;
    }
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      toast("Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng nhận tiền", "error");
      return;
    }

    setSubmitting(true);
    try {
      await providerApi.createWithdrawal({
        amount: numericAmount,
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_account_name: bankAccountName.trim().toUpperCase(),
        notes: notes.trim() || undefined,
      });
      toast("Đã gửi yêu cầu rút tiền thành công! Chờ Admin duyệt chuyển khoản.", "success");
      setShowWithdrawModal(false);
      await load(period);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gửi yêu cầu rút tiền thất bại", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelWithdrawal = async (id: string) => {
    setCancellingId(id);
    try {
      await providerApi.cancelWithdrawal(id);
      toast("Đã hủy yêu cầu rút tiền", "info");
      await load(period);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không thể hủy yêu cầu", "error");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thu nhập & Ví tài xế</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Theo dõi doanh thu chuyến đi và rút tiền về tài khoản ngân hàng
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                period === p
                  ? "bg-[#2563EB] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p === "week" ? "Tuần" : p === "month" ? "Tháng" : "Năm"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => load()}
            className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            title="Làm mới"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Top Stats + Wallet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Doanh thu kỳ này */}
        <div
          className="rounded-2xl p-5 lg:col-span-5 text-white flex flex-col justify-between"
          style={{ background: "linear-gradient(135deg, #1648C0 0%, #1A56DB 100%)" }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={17} className="text-blue-200" />
                <p className="text-blue-100 text-sm font-medium">
                  Tổng doanh thu ({period === "week" ? "7 ngày" : period === "month" ? "Tháng này" : "Năm nay"})
                </p>
              </div>
              <span className="text-xs bg-white/15 px-2.5 py-0.5 rounded-full font-semibold">
                {orders} đơn hoàn thành
              </span>
            </div>
            {loading ? (
              <div className="h-9 w-40 rounded-lg mb-1 animate-pulse bg-white/20" />
            ) : (
              <p className="text-3xl font-extrabold">{formatVND(total)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/20">
            <div>
              <p className="text-blue-200 text-xs mb-0.5">Thực nhận (90%)</p>
              <p className="text-xl font-bold">{formatVND(net)}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs mb-0.5">Phí nền tảng (10%)</p>
              <p className="text-xl font-bold text-yellow-200">{formatVND(fee)}</p>
            </div>
          </div>
        </div>

        {/* Ví rút tiền & Tài khoản ngân hàng */}
        <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Wallet size={15} />
                Số dư khả dụng có thể rút
              </div>
              {loading ? (
                <Skeleton className="h-9 w-44 rounded-lg mt-1" />
              ) : (
                <p className="text-3xl font-extrabold text-emerald-600">
                  {formatVND(availableBalance)}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                <span>
                  Đang chờ duyệt:{" "}
                  <strong className="text-amber-600">{formatVND(pendingWithdrawal)}</strong>
                </span>
                <span>·</span>
                <span>
                  Đã rút thành công:{" "}
                  <strong className="text-gray-800">{formatVND(totalWithdrawn)}</strong>
                </span>
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={openWithdrawModal}
                disabled={loading || availableBalance < 1000}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowUpRight size={16} />
                Rút tiền ngay
              </button>
              <button
                type="button"
                onClick={openBankModal}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Edit3 size={13} />
                {hasBankInfo ? "Đổi TK ngân hàng" : "Thêm TK ngân hàng"}
              </button>
            </div>
          </div>

          {/* Bank Account Bar */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                <Building2 size={18} />
              </div>
              {hasBankInfo ? (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {data?.bank_info?.bank_name} ·{" "}
                    <span className="font-mono text-[#2563EB]">
                      {data?.bank_info?.bank_account_number}
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-500 uppercase truncate">
                    Chủ TK: {data?.bank_info?.bank_account_name}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    Chưa liên kết tài khoản ngân hàng nhận tiền
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Thêm thông tin ngân hàng để nhận tiền rút nhanh chóng
                  </p>
                </div>
              )}
            </div>
            {availableBalance < 1000 && !loading && (
              <span className="text-[11px] text-gray-400">
                Hoàn thành đơn hàng để có số dư rút tiền
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown & Withdrawals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chi tiết theo ngày */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#2563EB]" />
              <h2 className="font-bold text-gray-900">Chi tiết doanh thu theo ngày</h2>
            </div>
            <span className="text-xs text-gray-400">
              TB/đơn: {orders ? formatVND(Math.round(total / orders)) : "—"}
            </span>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(data?.breakdown ?? [])
                .filter((d) => d.earned > 0)
                .slice(-14)
                .reverse()
                .map((d) => (
                  <div
                    key={d.date}
                    className="flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50/60"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{formatDateLabel(d.date)}</p>
                      <p className="text-xs text-gray-400">{d.orders} đơn hoàn thành</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatVND(d.earned)}</p>
                      <p className="text-xs text-emerald-600 font-medium">
                        Thực nhận: {formatVND(Math.round(d.earned * 0.9))}
                      </p>
                    </div>
                  </div>
                ))}
              {!data?.breakdown?.some((d) => d.earned > 0) && (
                <p className="text-center py-12 text-gray-400 text-sm">
                  Chưa có doanh thu trong kỳ này
                </p>
              )}
            </div>
          )}
        </div>

        {/* Lịch sử yêu cầu rút tiền */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-600" />
              <h2 className="font-bold text-gray-900">Lịch sử rút tiền</h2>
            </div>
            <span className="text-xs text-gray-400">{withdrawals.length} giao dịch</span>
          </div>

          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Wallet size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">Chưa có yêu cầu rút tiền nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
              {withdrawals.map((w) => {
                const st = WITHDRAWAL_STATUS_MAP[w.status] ?? {
                  label: w.status,
                  bg: "#F3F4F6",
                  text: "#6B7280",
                  icon: null,
                };
                return (
                  <div key={w.id} className="px-5 py-3.5 space-y-1.5 hover:bg-gray-50/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-extrabold text-gray-900">
                        {formatVND(w.amount)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: st.bg, color: st.text }}
                      >
                        {st.icon}
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 gap-2">
                      <span className="truncate">
                        {w.bank_name} · <span className="font-mono">{w.bank_account_number}</span> ({w.bank_account_name})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
                      <span>Yêu cầu: {formatDate(w.requested_at)}</span>
                      {w.status === "pending" && (
                        <button
                          type="button"
                          disabled={cancellingId === w.id}
                          onClick={() => handleCancelWithdrawal(w.id)}
                          className="text-red-500 hover:underline font-semibold disabled:opacity-50 cursor-pointer"
                        >
                          {cancellingId === w.id ? "Đang hủy..." : "Hủy yêu cầu"}
                        </button>
                      )}
                    </div>
                    {w.transaction_reference && (
                      <p className="text-[11px] text-emerald-600 font-medium">
                        Mã GD ngân hàng: {w.transaction_reference}
                      </p>
                    )}
                    {w.rejection_reason && (
                      <p className="text-[11px] text-red-600 font-medium">
                        Lý do từ chối: {w.rejection_reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Link href="/orders" className="inline-block text-sm text-[#2563EB] font-semibold hover:underline">
        Xem danh sách đơn hàng →
      </Link>

      {/* ══ Modal Yêu cầu rút tiền ══ */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 pb-8 sm:pb-6 max-h-[90dvh] overflow-y-auto shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Yêu cầu rút tiền</h3>
                  <p className="text-xs text-gray-500">
                    Số dư khả dụng:{" "}
                    <strong className="text-emerald-600">{formatVND(availableBalance)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWithdrawal} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Số tiền muốn rút (VNĐ)</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(Math.floor(availableBalance / 2)))}
                      className="text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(availableBalance))}
                      className="text-[11px] px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-semibold"
                    >
                      Rút hết 100%
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nhập số tiền muốn rút..."
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-base font-bold text-gray-900 focus:outline-none focus:border-[#2563EB]"
                  required
                />
                {Number(amountInput) > 0 && (
                  <p className="text-xs text-[#2563EB] font-semibold mt-1">
                    = {formatVND(Number(amountInput))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Ngân hàng nhận tiền
                </label>
                <select
                  value={POPULAR_BANKS.includes(bankName) ? bankName : "__other__"}
                  onChange={(e) => {
                    if (e.target.value === "__other__") setBankName("");
                    else setBankName(e.target.value);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#2563EB] mb-2"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="__other__">Ngân hàng khác (tự nhập)...</option>
                </select>
                {!POPULAR_BANKS.includes(bankName) && (
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Nhập tên ngân hàng..."
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Số tài khoản
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="VD: 0123456789"
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tên chủ tài khoản
                  </label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm uppercase focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Ghi chú (tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm cho Admin..."
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Đang gửi..." : "Xác nhận rút tiền"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal Cập nhật tài khoản ngân hàng ══ */}
      {showBankModal && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 pb-8 sm:pb-6 max-h-[90dvh] overflow-y-auto shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tài khoản ngân hàng nhận tiền</h3>
                  <p className="text-xs text-gray-500">Lưu sẵn để rút tiền nhanh hơn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBankInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Ngân hàng
                </label>
                <select
                  value={POPULAR_BANKS.includes(bankName) ? bankName : "__other__"}
                  onChange={(e) => {
                    if (e.target.value === "__other__") setBankName("");
                    else setBankName(e.target.value);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#2563EB] mb-2"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="__other__">Ngân hàng khác (tự nhập)...</option>
                </select>
                {!POPULAR_BANKS.includes(bankName) && (
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Nhập tên ngân hàng..."
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="VD: 0123456789"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tên chủ tài khoản (Không dấu)
                </label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                  placeholder="VD: NGUYEN VAN A"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm uppercase focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Đang lưu..." : "Lưu tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
