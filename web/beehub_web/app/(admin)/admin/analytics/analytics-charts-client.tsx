"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  ResponsiveContainer,
} from "recharts";
import type { RevenueDataPoint } from "@/lib/admin/types";
import { formatVND } from "@/lib/admin/formatters";

// ---------------------------------------------------------------------------
// Hook: Responsive detect mobile
// ---------------------------------------------------------------------------

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}

// ---------------------------------------------------------------------------
// Date range filter options
// ---------------------------------------------------------------------------

type DateRange = "this_month" | "last_3" | "last_6" | "this_year";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "this_month", label: "Tháng này" },
  { value: "last_3", label: "3 tháng gần nhất" },
  { value: "last_6", label: "6 tháng gần nhất" },
  { value: "this_year", label: "Năm nay" },
];

function filterByRange(
  monthlyData: RevenueDataPoint[],
  dailyData: RevenueDataPoint[] | undefined,
  range: DateRange
): RevenueDataPoint[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based

  if (range === "this_month") {
    if (dailyData && dailyData.length > 0) {
      return dailyData;
    }
    return monthlyData.filter((d) => {
      const [y, m] = d.date.split("-").map(Number);
      return y === year && m === month;
    });
  }

  return monthlyData.filter((d) => {
    const [y, m] = d.date.split("-").map(Number);
    if (range === "last_3") {
      const cutoff = new Date(year, now.getMonth() - 2, 1);
      return new Date(y, m - 1, 1) >= cutoff;
    }
    if (range === "last_6") {
      const cutoff = new Date(year, now.getMonth() - 5, 1);
      return new Date(y, m - 1, 1) >= cutoff;
    }
    if (range === "this_year") return y === year;
    return true;
  });
}

function formatMonth(date: string, isMobile = false): string {
  const parts = date.split("-").map(Number);
  if (parts.length === 3) {
    const dd = String(parts[2]).padStart(2, "0");
    const mm = String(parts[1]).padStart(2, "0");
    return isMobile ? `${dd}` : `${dd}/${mm}`;
  }
  const [, m] = parts;
  return `Th${m}`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip for Revenue & Orders
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

function CustomRevenueTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const parts = String(label ?? "").split("-").map(Number);
  const dateStr =
    parts.length === 3
      ? `Ngày ${parts[2]}/${parts[1]}/${parts[0]}`
      : `Tháng ${parts[1]}/${parts[0]}`;

  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg backdrop-blur-sm pointer-events-none"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      <div
        className="font-semibold text-xs mb-1.5 pb-1 border-b border-[var(--border)]"
        style={{ color: "var(--text)" }}
      >
        {dateStr}
      </div>
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span
              className="flex items-center gap-1.5"
              style={{ color: entry.color || "var(--muted)" }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              {entry.dataKey === "revenue"
                ? formatVND(Number(entry.value || 0))
                : `${Number(entry.value || 0).toLocaleString("vi-VN")} đơn`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue & Orders ComposedChart
// ---------------------------------------------------------------------------

interface RevenueChartProps {
  data: RevenueDataPoint[];
  range: DateRange;
  isMobile: boolean;
}

function RevenueOrdersChart({ data, range, isMobile }: RevenueChartProps) {
  const tickInterval = useMemo(() => {
    if (range === "this_month") {
      return isMobile ? 4 : 2;
    }
    return 0;
  }, [range, isMobile]);

  return (
    <div className="w-full overflow-x-auto scrollbar-none">
      <div className="min-w-[320px] sm:min-w-0">
        <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
          <ComposedChart
            data={data}
            margin={{
              top: 10,
              right: isMobile ? 4 : 20,
              left: isMobile ? -14 : 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              interval={tickInterval}
              tickFormatter={(d) => formatMonth(d, isMobile)}
              tick={{ fontSize: isMobile ? 10 : 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="revenue"
              orientation="left"
              tickFormatter={(v: number) => {
                if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(0)}T`;
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Tr`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                return String(v);
              }}
              tick={{ fontSize: isMobile ? 10 : 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              width={isMobile ? 40 : 54}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              allowDecimals={false}
              tick={{ fontSize: isMobile ? 10 : 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              width={isMobile ? 24 : 36}
            />
            <Tooltip content={<CustomRevenueTooltip />} />
            <Legend
              wrapperStyle={{
                fontSize: isMobile ? 11 : 12,
                color: "var(--muted)",
                paddingTop: 8,
              }}
            />
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              name="Doanh thu"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={range === "this_month" ? false : { r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Bar
              yAxisId="orders"
              dataKey="orders"
              name="Đơn hàng"
              fill="#93C5FD"
              radius={[4, 4, 0, 0]}
              maxBarSize={range === "this_month" ? (isMobile ? 8 : 14) : (isMobile ? 16 : 24)}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Commission BarChart
// ---------------------------------------------------------------------------

interface CommissionData {
  month: string;
  commission: number;
}

function CustomCommissionTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const parts = String(label ?? "").split("-").map(Number);
  const dateStr = `Tháng ${parts[1]}/${parts[0]}`;

  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg backdrop-blur-sm pointer-events-none"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      <div
        className="font-semibold text-xs mb-1 pb-1 border-b border-[var(--border)]"
        style={{ color: "var(--text)" }}
      >
        {dateStr}
      </div>
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <span className="text-[var(--muted)]">Hoa hồng:</span>
        <span className="font-semibold" style={{ color: "var(--primary)" }}>
          {formatVND(Number(payload[0]?.value ?? 0))}
        </span>
      </div>
    </div>
  );
}

function CommissionChart({ data, isMobile }: { data: CommissionData[]; isMobile: boolean }) {
  return (
    <div className="w-full overflow-x-auto scrollbar-none">
      <div className="min-w-[320px] sm:min-w-0">
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: isMobile ? 8 : 12,
              left: isMobile ? -14 : 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={(d) => {
                const parts = d.split("-");
                return `Th${parseInt(parts[1], 10)}`;
              }}
              tick={{ fontSize: isMobile ? 10 : 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Tr`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                return String(v);
              }}
              tick={{ fontSize: isMobile ? 10 : 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              width={isMobile ? 40 : 50}
            />
            <Tooltip content={<CustomCommissionTooltip />} />
            <Bar
              dataKey="commission"
              name="Hoa hồng"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={isMobile ? 22 : 32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported client component
// ---------------------------------------------------------------------------

interface AnalyticsChartsClientProps {
  revenueData: RevenueDataPoint[];
  thisMonthDaily?: RevenueDataPoint[];
  commissionData: CommissionData[];
}

export function AnalyticsChartsClient({
  revenueData,
  thisMonthDaily,
  commissionData,
}: AnalyticsChartsClientProps) {
  const isMobile = useIsMobile(640);
  const [range, setRange] = useState<DateRange>("this_month");

  const filteredRevenue = useMemo(
    () => filterByRange(revenueData, thisMonthDaily, range),
    [revenueData, thisMonthDaily, range]
  );

  const totals = useMemo(() => {
    const totalRev = filteredRevenue.reduce((s, d) => s + (d.revenue || 0), 0);
    const totalOrders = filteredRevenue.reduce((s, d) => s + (d.orders || 0), 0);
    return { totalRev, totalOrders };
  }, [filteredRevenue]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date range filter - horizontally scrollable on mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 scrollbar-none">
        {DATE_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
            style={
              range === opt.value
                ? { backgroundColor: "var(--primary)", color: "#fff" }
                : { backgroundColor: "var(--primary-tint)", color: "var(--muted)" }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Revenue & Orders ComposedChart */}
      <div
        className="rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <h2 className="text-sm sm:text-base font-semibold" style={{ color: "var(--text)" }}>
              Doanh thu & Đơn hàng
            </h2>
            <span className="text-[11px] sm:text-xs text-[var(--muted)]">
              {range === "this_month" ? "Theo ngày trong tháng" : "Theo tháng"}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {range === "this_month"
              ? "Doanh thu (trục trái, VND) · Số đơn (trục phải)"
              : "Doanh thu (trục trái, VND) · Số đơn (trục phải)"}
          </p>
        </div>

        {filteredRevenue.length === 0 ? (
          <div
            className="flex items-center justify-center h-36 sm:h-40 text-xs sm:text-sm"
            style={{ color: "var(--muted)" }}
          >
            Không có dữ liệu cho khoảng thời gian này.
          </div>
        ) : (
          <>
            <RevenueOrdersChart
              data={filteredRevenue}
              range={range}
              isMobile={isMobile}
            />
            {/* Quick Summary under chart */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-[var(--border)] text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--muted)]">Tổng doanh thu kỳ:</span>
                <span className="font-semibold" style={{ color: "var(--primary)" }}>
                  {formatVND(totals.totalRev)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--muted)]">Tổng đơn hàng:</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {totals.totalOrders.toLocaleString("vi-VN")} đơn
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Commission BarChart */}
      <div
        className="rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <h2 className="text-sm sm:text-base font-semibold" style={{ color: "var(--text)" }}>
              Hoa hồng nền tảng theo tháng
            </h2>
            <span className="text-[11px] sm:text-xs text-[var(--muted)]">
              6 tháng gần nhất
            </span>
          </div>
          <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Hoa hồng thu từ các đơn hàng hoàn thành (VND)
          </p>
        </div>

        {commissionData.length === 0 ? (
          <div
            className="flex items-center justify-center h-28 sm:h-32 text-xs sm:text-sm"
            style={{ color: "var(--muted)" }}
          >
            Chưa có dữ liệu hoa hồng.
          </div>
        ) : (
          <CommissionChart data={commissionData} isMobile={isMobile} />
        )}
      </div>
    </div>
  );
}
