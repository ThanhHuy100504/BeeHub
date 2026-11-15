"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Clock, AlertCircle, ArrowRight, Home } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { formatVND } from "@/lib/utils";

function PaymentSuccessContent() {
  const router = useRouter();
  const params = useSearchParams();
  const paymentCode = params.get("payment_code") ?? "";
  const initialOrderId = params.get("order_id") ?? "";
  const initialStatus = params.get("status") ?? "pending";

  const [status, setStatus] = useState(initialStatus);
  const [orderId, setOrderId] = useState(initialOrderId);
  const [amount, setAmount] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(initialStatus !== "completed");

  useEffect(() => {
    if (!paymentCode) {
      setSyncing(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;

    const checkPayment = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        try {
          const res = await fetch(
            `/api/payments/payos/return?payment_code=${encodeURIComponent(paymentCode)}&format=json`,
            { cache: "no-store" },
          );
          const json = (await res.json()) as {
            success?: boolean;
            data?: {
              payment?: {
                status?: string;
                amount?: number;
                order_id?: string;
              };
            };
          };
          const payment = json?.data?.payment;
          if (!cancelled && payment) {
            if (payment.order_id) setOrderId(payment.order_id);
            if (payment.amount != null) setAmount(Number(payment.amount));
            if (payment.status && payment.status !== "pending") {
              setStatus(payment.status);
              setSyncing(false);
              return;
            }
          }
        } catch {
          /* ignore and retry */
        }

        if (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
      if (!cancelled) {
        setSyncing(false);
      }
    };

    checkPayment();

    return () => {
      cancelled = true;
    };
  }, [paymentCode, initialStatus]);

  useEffect(() => {
    if (status === "completed" && orderId) {
      const timer = setTimeout(() => {
        router.replace(`/don-hang/${orderId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, orderId, router]);

  const isSuccess = status === "completed";
  const isPending = status === "pending" && syncing;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      {isPending ? (
        <>
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="text-blue-500 animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Đang xác nhận thanh toán</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Giao dịch đang được hệ thống đồng bộ với PayOS. Vui lòng đợi trong giây lát...
          </p>
        </>
      ) : isSuccess ? (
        <>
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={44} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Đặt cọc thành công!</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-2">
            Chuyến chuyển của bạn đã được xác nhận. Đang chuyển về trang chi tiết đơn hàng...
          </p>
          {paymentCode && (
            <p className="text-xs text-gray-400 font-mono mb-6">Mã: {paymentCode}</p>
          )}
          {amount != null && amount > 0 && (
            <p className="text-lg font-bold text-[#2563EB] mb-6">{formatVND(amount)}</p>
          )}
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Thanh toán chưa hoàn tất</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Trạng thái: <span className="font-semibold">{status}</span>. Bạn có thể kiểm tra hoặc đặt cọc lại từ chi tiết đơn hàng.
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
        {orderId && (
          <Link
            href={`/don-hang/${orderId}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-blue-700 transition-colors"
          >
            Xem đơn hàng
            <ArrowRight size={16} />
          </Link>
        )}
        <Link
          href="/hoat-dong"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50"
        >
          Hoạt động
        </Link>
        <Link
          href="/trang-chu"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-gray-500 font-semibold text-sm hover:text-gray-800"
        >
          <Home size={16} />
          Trang chủ
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="max-w-lg mx-auto px-4 py-20 text-center text-gray-500">Đang tải...</div>
        }
      >
        <PaymentSuccessContent />
      </Suspense>
    </AppShell>
  );
}
