"use client";

export const dynamic = "force-dynamic";


import React, { useState, useEffect, useCallback, useTransition } from "react";
import { Plus, Bell, RefreshCw, Send } from "lucide-react";

import {
  getAnnouncements,
  createAnnouncement,
  publishAnnouncement,
} from "@/lib/admin/queries/notifications";
import type { Announcement, NotificationPriority } from "@/lib/admin/types";
import { formatDateTime } from "@/lib/admin/formatters";
import { getAdminUserId } from "@/lib/admin/client-auth";
import { cn } from "@/lib/admin/utils";

import { normalizeMeta } from "@/lib/admin/normalize-meta";
import { PageHeader } from "@/components/admin-dashboard/page-header";
import { EmptyState } from "@/components/admin-dashboard/empty-state";
import { Pagination } from "@/components/admin-dashboard/pagination";
import { Button } from "@/components/admin-ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/admin-ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/admin-ui/select";

// ---------------------------------------------------------------------------
// Priority Badge
// ---------------------------------------------------------------------------

const PRIORITY_MAP: Record<NotificationPriority, { label: string; className: string }> = {
  low: { label: "Thấp", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  normal: { label: "Bình thường", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  high: { label: "Cao", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  urgent: { label: "Khẩn cấp", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const cfg = PRIORITY_MAP[priority] ?? PRIORITY_MAP.normal;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", cfg.className)}>
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Announcement Status Badge
// ---------------------------------------------------------------------------

function AnnouncementStatusBadge({ ann }: { ann: AnnouncementRow }) {
  if (ann.is_published) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        Đã đăng
      </span>
    );
  }
  if (ann.scheduled_at) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Đã lên lịch
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
      Bản nháp
    </span>
  );
}

// ---------------------------------------------------------------------------
// Audience Label
// ---------------------------------------------------------------------------

function audienceLabel(audience: "all" | "customers" | "providers"): string {
  if (audience === "all") return "Tất cả";
  if (audience === "customers") return "Khách hàng";
  return "Nhà vận chuyển";
}

// ---------------------------------------------------------------------------
// Create Announcement Dialog
// ---------------------------------------------------------------------------

interface CreateAnnouncementDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type AnnouncementFormState = {
  title: string;
  body: string;
  targetAudience: "all" | "customers" | "providers";
  priority: NotificationPriority;
  scheduledAt: string;
};

function CreateAnnouncementDialog({ open, onClose, onCreated }: CreateAnnouncementDialogProps) {
  const [form, setForm] = useState<AnnouncementFormState>({
    title: "",
    body: "",
    targetAudience: "all",
    priority: "normal",
    scheduledAt: "",
  });
  const [errors, setErrors] = useState<Partial<AnnouncementFormState>>({});
  const [submitting, startSubmit] = useTransition();

  useEffect(() => {
    if (!open) {
      setForm({ title: "", body: "", targetAudience: "all", priority: "normal", scheduledAt: "" });
      setErrors({});
    }
  }, [open]);

  const setField = <K extends keyof AnnouncementFormState>(key: K, value: AnnouncementFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<AnnouncementFormState> = {};
    if (!form.title.trim()) newErrors.title = "Vui lòng nhập tiêu đề";
    if (!form.body.trim()) newErrors.body = "Vui lòng nhập nội dung";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const adminId = getAdminUserId();
    startSubmit(async () => {
      const { error } = await createAnnouncement({
        title: form.title.trim(),
        body: form.body.trim(),
        targetAudience: form.targetAudience,
        priority: form.priority,
        scheduledAt: form.scheduledAt || undefined,
        createdBy: adminId,
      });
      if (!error) {
        onCreated();
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Tạo thông báo mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Nhập tiêu đề thông báo..."
              className="w-full h-10 px-3 text-sm rounded-xl border outline-none transition-colors"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: errors.title ? "#DC2626" : "var(--border)",
                color: "var(--text)",
              }}
            />
            {errors.title && (
              <p className="text-xs mt-1 text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
              Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setField("body", e.target.value)}
              rows={4}
              placeholder="Nhập nội dung thông báo..."
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none resize-none transition-colors"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: errors.body ? "#DC2626" : "var(--border)",
                color: "var(--text)",
              }}
            />
            {errors.body && (
              <p className="text-xs mt-1 text-red-500">{errors.body}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
                Đối tượng
              </label>
              <Select
                value={form.targetAudience}
                onValueChange={(v) => setField("targetAudience", v as "all" | "customers" | "providers")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="customers">Khách hàng</SelectItem>
                  <SelectItem value="providers">Nhà vận chuyển</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
                Ưu tiên
              </label>
              <Select
                value={form.priority}
                onValueChange={(v) => setField("priority", v as NotificationPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="normal">Bình thường</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduled At */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
              Lịch gửi
              <span className="block sm:inline sm:ml-1 text-xs font-normal" style={{ color: "var(--muted)" }}>
                (tùy chọn — để trống để đăng ngay)
              </span>
            </label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setField("scheduledAt", e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border outline-none transition-colors"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="min-h-11 w-full sm:w-auto">Hủy</Button>
          </DialogClose>
          <Button size="sm" className="min-h-11 w-full sm:w-auto" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Đang tạo..." : "Tạo thông báo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnnouncementRow = Pick<
  Announcement,
  | "id"
  | "title"
  | "body"
  | "target_audience"
  | "priority"
  | "is_published"
  | "sent_count"
  | "read_count"
  | "scheduled_at"
  | "published_at"
  | "created_at"
>;

// ---------------------------------------------------------------------------
// Publish Confirmation Dialog
// ---------------------------------------------------------------------------

interface PublishDialogProps {
  id: string | null;
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
}

function PublishDialog({ id, open, onClose, onPublished }: PublishDialogProps) {
  const [pending, startTransition] = useTransition();

  const handlePublish = () => {
    if (!id) return;
    startTransition(async () => {
      const { error } = await publishAnnouncement(id);
      if (!error) {
        onPublished();
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Xác nhận đăng thông báo</DialogTitle>
        </DialogHeader>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Thông báo sẽ được gửi ngay đến người dùng. Bạn có chắc chắn muốn đăng không?
        </p>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="min-h-11 w-full sm:w-auto">Hủy</Button>
          </DialogClose>
          <Button size="sm" className="min-h-11 w-full sm:w-auto" disabled={pending} onClick={handlePublish}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {pending ? "Đang đăng..." : "Đăng ngay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Announcements Table + Responsive Mobile Cards
// ---------------------------------------------------------------------------

interface AnnouncementsTableProps {
  announcements: AnnouncementRow[];
  onPublish: (id: string) => void;
}

function AnnouncementsTable({ announcements, onPublish }: AnnouncementsTableProps) {
  const [selected, setSelected] = useState<AnnouncementRow | null>(null);
  if (!announcements.length) return <EmptyState icon={Bell} title="Chưa có thông báo nào" description="Tạo thông báo để gửi cập nhật đến khách hàng và nhà vận chuyển." />;
  return <>
    <div className="grid gap-4 p-4 xl:grid-cols-2">
      {announcements.map(ann => <article key={ann.id} className="flex min-w-0 flex-col rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
        <div className="mb-3 flex flex-wrap items-center gap-2"><AnnouncementStatusBadge ann={ann}/><PriorityBadge priority={ann.priority}/></div>
        <h3 className="break-words text-base font-semibold leading-6" style={{color:"var(--text)"}}>{ann.title}</h3>
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6" style={{color:"var(--muted)"}}>{ann.body || "Chưa có nội dung."}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl p-3 text-sm" style={{backgroundColor:"var(--surface)"}}>
          <div className="col-span-2"><dt className="text-xs" style={{color:"var(--muted)"}}>Gửi đến</dt><dd className="mt-1 font-medium" style={{color:"var(--text)"}}>{audienceLabel(ann.target_audience)}</dd></div>
          <div><dt className="text-xs" style={{color:"var(--muted)"}}>Đã gửi</dt><dd className="mt-1 text-lg font-semibold" style={{color:"var(--text)"}}>{(ann.sent_count ?? 0).toLocaleString("vi-VN")}</dd></div>
          <div><dt className="text-xs" style={{color:"var(--muted)"}}>Đã đọc</dt><dd className="mt-1 text-lg font-semibold" style={{color:"var(--primary)"}}>{(ann.read_count ?? 0).toLocaleString("vi-VN")}</dd></div>
        </dl>
        <p className="mt-3 text-xs leading-5" style={{color:"var(--muted)"}}>{ann.is_published && ann.published_at ? `Đã đăng: ${formatDateTime(ann.published_at)}` : ann.scheduled_at ? `Hẹn gửi: ${formatDateTime(ann.scheduled_at)}` : `Tạo lúc: ${formatDateTime(ann.created_at)}`}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Button variant="outline" size="sm" className="min-h-11 flex-1" onClick={() => setSelected(ann)}>Xem nội dung</Button>
          {!ann.is_published && !ann.scheduled_at && <Button size="sm" className="min-h-11 flex-1" onClick={() => onPublish(ann.id)}><Send className="mr-2 h-4 w-4"/>Đăng ngay</Button>}
        </div>
      </article>)}
    </div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle className="break-words leading-7">{selected?.title}</DialogTitle></DialogHeader>
        {selected && <><div className="mb-4 flex flex-wrap gap-2"><AnnouncementStatusBadge ann={selected}/><PriorityBadge priority={selected.priority}/></div><p className="mb-4 text-sm" style={{color:"var(--muted)"}}>Gửi đến: {audienceLabel(selected.target_audience)}</p><p className="whitespace-pre-wrap break-words text-sm leading-7" style={{color:"var(--text)"}}>{selected.body || "Chưa có nội dung."}</p></>}
        <DialogFooter><DialogClose asChild><Button variant="outline" className="min-h-11">Đóng</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

export default function NotificationsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [publishId, setPublishId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const result = await getAnnouncements({ page, pageSize: 20 });
    if (result.error) setLoadError("Không tải được danh sách thông báo. Vui lòng thử lại.");
    else setAnnouncements(result.data as AnnouncementRow[]);
    setMeta(normalizeMeta(result.meta, { page, pageSize: 20 }));
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handlePublishClick = (id: string) => {
    setPublishId(id);
    setPublishOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý thông báo"
        description="Soạn nội dung, chọn người nhận và theo dõi thông báo đã gửi"
        action={
          <Button size="sm" className="min-h-11 w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo thông báo
          </Button>
        }
      />

      {/* Table card */}
      <div
        className="rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        {/* Card header */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
              Danh sách thông báo
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {meta.total} thông báo
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-colors disabled:opacity-40"
            style={{ color: "var(--muted)" }}
            aria-label="Tải lại"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {loadError && <p role="alert" className="mx-4 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--muted)" }} />
          </div>
        ) : (
          <>
            <AnnouncementsTable
              announcements={announcements}
              onPublish={handlePublishClick}
            />
            {announcements.length > 0 && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                pageSize={meta.pageSize}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <CreateAnnouncementDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />

      <PublishDialog
        id={publishId}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={load}
      />
    </div>
  );
}
