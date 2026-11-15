"use client";

export const dynamic = "force-dynamic";

import { ResponsiveTable } from "@/components/admin-dashboard/responsive-table";
import React, { Suspense, useState, useEffect, useCallback, useTransition, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DollarSign, RefreshCw, X } from "lucide-react";

import { getRefunds, approveRefund } from "@/lib/admin/queries/disputes";
import { formatVND, formatDateTime } from "@/lib/admin/formatters";
import { getAdminUserId } from "@/lib/admin/client-auth";

import { PageHeader } from "@/components/admin-dashboard/page-header";
import { StatusBadge } from "@/components/admin-dashboard/status-badge";
import { EmptyState } from "@/components/admin-dashboard/empty-state";
import { Pagination } from "@/components/admin-dashboard/pagination";
import { Button } from "@/components/admin-ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/admin-ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/admin-ui/dialog";

const REFUND_TABS = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "processing", label: "Đã duyệt" },
  { value: "completed", label: "Hoàn tất" },
] as const;

type RefundTab = (typeof REFUND_TABS)[number]["value"];

type RefundRow = {
  id: string;
  refund_amount: number;
  refund_reason: string;
  status: string;
  created_at: string;
  processed_at?: string | null;
  order?: { id: string; order_number: string } | null;
  requester?: { id: string; full_name: string; role: string } | null;
  requested_by_profile?: { full_name: string; email: string } | null;
};

function ApproveRefundDialog({
  refundId,
  open,
  onClose,
  onApproved,
}: {
  refundId: string | null;
  open: boolean;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const handleApprove = () => {
    if (!refundId) return;
    startTransition(async () => {
      const adminId = getAdminUserId();
      const { error } = await approveRefund(refundId, adminId);
      if (!error) {
        onApproved();
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Xác nhận duyệt hoàn tiền</DialogTitle>
        </DialogHeader>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Bạn có chắc chắn muốn duyệt yêu cầu hoàn tiền này không? Hành động này không thể hoàn tác.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Hủy</Button>
          </DialogClose>
          <Button size="sm" disabled={pending} onClick={handleApprove}>
            {pending ? "Đang xử lý..." : "Duyệt hoàn tiền"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefundsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryId = searchParams.get("id");
  const queryTab = searchParams.get("tab") as RefundTab | null;

  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [activeTab, setActiveTab] = useState<RefundTab>(queryTab || "pending");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const highlightedRef = useRef<HTMLTableRowElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let targetRefund: RefundRow | null = null;
    if (queryId) {
      try {
        const single = await getRefunds({ id: queryId });
        if (single.data && single.data.length > 0) {
          targetRefund = single.data[0] as unknown as RefundRow;
          if (["pending", "processing", "completed"].includes(targetRefund.status)) {
            setActiveTab(targetRefund.status as RefundTab);
          }
        }
      } catch {
        /* ignore */
      }
    }

    const currentTabToLoad = targetRefund ? (targetRefund.status as RefundTab) : activeTab;
    const result = await getRefunds({
      page,
      pageSize: 20,
      status: currentTabToLoad,
    });
    let list = (result.data as unknown as RefundRow[]) || [];
    if (targetRefund && !list.some((r) => r.id === targetRefund!.id)) {
      list = [targetRefund, ...list];
    }
    setRefunds(list);
    setMeta(result.meta);
    setLoading(false);
  }, [page, activeTab, queryId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (queryId && !loading && refunds.some((r) => r.id === queryId)) {
      const timer = setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [queryId, loading, refunds]);

  const handleTabChange = (tab: RefundTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu hoàn tiền"
        description="Theo dõi và duyệt các yêu cầu hoàn tiền từ khách hàng"
      />

      {queryId && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="font-semibold truncate">Đang chọn yêu cầu hoàn tiền:</span>
            <span className="font-mono text-xs bg-amber-500/20 px-2 py-0.5 rounded-md truncate max-w-[200px] sm:max-w-none">
              {queryId}
            </span>
          </div>
          <button
            onClick={() => router.push("/admin/refunds")}
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline shrink-0 ml-3"
          >
            <X size={14} />
            Xem tất cả
          </button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as RefundTab)}>
        <TabsList className="grid w-full grid-cols-2 h-auto gap-1 sm:flex sm:flex-wrap">
          {REFUND_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="min-h-11 min-w-0 sm:flex-1">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {meta.total} yêu cầu
        </span>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          <RefreshCw className={loading ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
          Làm mới
        </button>
      </div>

      <div
        className="rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--muted)" }} />
          </div>
        ) : refunds.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="Không có yêu cầu hoàn tiền"
            description="Chưa có yêu cầu nào ở trạng thái này."
          />
        ) : (
          <>
            <ResponsiveTable columns={["Mã đơn", "Người yêu cầu", "Số tiền hoàn", "Lý do", "Trạng thái", "Ngày tạo", ""]}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Mã đơn", "Người yêu cầu", "Số tiền hoàn", "Lý do", "Trạng thái", "Ngày tạo", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => {
                    const isTarget = r.id === queryId;
                    return (
                      <tr
                        key={r.id}
                        ref={isTarget ? highlightedRef : null}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          backgroundColor: isTarget ? "rgba(245, 158, 11, 0.12)" : undefined,
                        }}
                        className={`transition-all ${isTarget ? "ring-2 ring-amber-500 shadow-sm" : "hover:bg-[var(--primary-tint)]/30"}`}
                      >
                        <td className="px-4 py-3 font-medium font-mono" style={{ color: "var(--primary)" }}>
                          <div className="flex items-center gap-1.5">
                            {isTarget && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" title="Yêu cầu đang chọn" />
                            )}
                            <span>#{r.order?.order_number ?? r.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div style={{ color: "var(--text)" }}>
                            {r.requester?.full_name ?? r.requested_by_profile?.full_name ?? "—"}
                          </div>
                          <div className="text-xs" style={{ color: "var(--muted)" }}>
                            {r.requester?.role === "customer" ? "Khách hàng" : r.requester?.role === "provider" ? "Tài xế" : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>
                          {formatVND(r.refund_amount)}
                        </td>
                        <td className="px-4 py-3 max-w-[240px]">
                          <span className="line-clamp-2" style={{ color: "var(--muted)" }}>{r.refund_reason}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge type="refund" status={r.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                          {formatDateTime(r.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "pending" && (
                            <Button
                              variant={isTarget ? "default" : "outline"}
                              size="sm"
                              className={isTarget ? "bg-amber-600 hover:bg-amber-700 text-white shadow" : ""}
                              onClick={() => { setApproveId(r.id); setApproveOpen(true); }}
                            >
                              Duyệt hoàn tiền
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveTable>
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <ApproveRefundDialog
        refundId={approveId}
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onApproved={load}
      />
    </div>
  );
}

export default function RefundsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Đang tải yêu cầu hoàn tiền...</div>}>
      <RefundsContent />
    </Suspense>
  );
}
