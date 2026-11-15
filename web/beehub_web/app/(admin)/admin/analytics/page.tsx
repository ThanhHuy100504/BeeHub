export const dynamic = "force-dynamic";

import {
  getGMVStats,
  getOrderStatistics,
  getTopProviders,
  getPlatformCommissionByMonth,
  getRevenueAnalytics,
} from "@/lib/admin/queries/analytics";
import { AnalyticsPageClient } from "./page-client";

export default async function AnalyticsPage() {
  const [gmv, orderStats, topProviders, commissionData, revenueResult] =
    await Promise.all([
      getGMVStats(),
      getOrderStatistics(),
      getTopProviders(10),
      getPlatformCommissionByMonth(6),
      getRevenueAnalytics(12),
    ]);

  return (
    <AnalyticsPageClient
      gmv={gmv}
      orderStats={orderStats}
      topProviders={topProviders}
      commissionData={commissionData}
      revenueData={revenueResult.monthly}
      thisMonthDaily={revenueResult.thisMonthDaily}
    />
  );
}
