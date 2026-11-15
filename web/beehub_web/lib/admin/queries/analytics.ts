"use server";

import { serverGet } from "@/lib/admin/server-api";
import type { RevenueDataPoint } from "@/lib/admin/types";

export interface RevenueAnalyticsResult {
  monthly: RevenueDataPoint[];
  thisMonthDaily: RevenueDataPoint[];
}

export async function getRevenueAnalytics(months = 12): Promise<RevenueAnalyticsResult> {
  try {
    const data = await serverGet<any>("/admin/analytics/revenue", { months });
    if (data.success && data.data) {
      const monthly = data.data.map((item: any) => ({
        date: item.month,
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
      }));
      const thisMonthDaily = Array.isArray(data.thisMonthDaily)
        ? data.thisMonthDaily.map((item: any) => ({
            date: item.date,
            revenue: Number(item.revenue || 0),
            orders: Number(item.orders || 0),
          }))
        : [];
      return { monthly, thisMonthDaily };
    }
    return { monthly: [], thisMonthDaily: [] };
  } catch (error) {
    console.error("Get revenue analytics error:", error);
    return { monthly: [], thisMonthDaily: [] };
  }
}

export async function getOrderStatistics(startDate?: string, endDate?: string) {
  try {
    const data = await serverGet<any>("/admin/analytics/orders", { startDate, endDate });
    if (data.success && data.data) return data.data;
    return null;
  } catch (error) {
    console.error("Get order statistics error:", error);
    return null;
  }
}

export async function getTopProviders(limit = 10) {
  try {
    const data = await serverGet<any>("/admin/analytics/providers", { limit });
    if (data.success && data.data) return data.data;
    return [];
  } catch (error) {
    console.error("Get top providers error:", error);
    return [];
  }
}

export async function getPlatformCommissionByMonth(months = 6) {
  try {
    const data = await serverGet<any>("/admin/analytics/commission", { months });
    if (data.success && data.data) return data.data;
    return [];
  } catch (error) {
    console.error("Get platform commission error:", error);
    return [];
  }
}

export async function getGMVStats() {
  try {
    const data = await serverGet<any>("/admin/analytics/gmv");
    if (data.success && data.data) return data.data;
    return { thisGMV: 0, lastGMV: 0, growth: 0 };
  } catch (error) {
    console.error("Get GMV stats error:", error);
    return { thisGMV: 0, lastGMV: 0, growth: 0 };
  }
}
