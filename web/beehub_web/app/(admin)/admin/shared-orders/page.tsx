import React, { Suspense } from "react";
import { PageHeader } from "@/components/admin-dashboard/page-header";
import { SharedOrdersClient } from "./shared-orders-client";

export const metadata = {
  title: "Quản lý ghép đơn sinh viên | BeeHub Admin",
  description: "Quản lý nhóm ghép đơn, điều phối tài xế, tiền cọc và lộ trình ghép xe",
};

export default function AdminSharedOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Ghép đơn sinh viên"
        description="Quản lý các nhóm ghép trọ, tối ưu hóa chuyến xe, bảo đảm cọc và xử lý độc lập từng đơn hàng"
      />
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Đang tải dữ liệu ghép đơn...</div>}>
        <SharedOrdersClient />
      </Suspense>
    </div>
  );
}
