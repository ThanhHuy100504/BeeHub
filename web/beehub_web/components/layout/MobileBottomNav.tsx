"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Truck, ShoppingBag, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/lib/stores";

/** 5 tab chính cho khách hàng trên điện thoại: Trang chủ · Dịch vụ · Chợ SV · Hoạt động · Tài khoản */
const NAV_ITEMS = [
  { href: "/trang-chu", label: "Trang chủ", Icon: Home },
  { href: "/dat-chuyen", label: "Dịch vụ", Icon: Truck },
  { href: "/cho-sinh-vien", label: "Chợ SV", Icon: ShoppingBag },
  { href: "/hoat-dong", label: "Hoạt động", Icon: ClipboardList },
  { href: "/tai-khoan", label: "Tài khoản", Icon: User },
] as const;

const HIDE_ON_PREFIXES = [
  "/dat-chuyen/",
  "/don-hang/",
  "/tai-khoan/chinh-sua",
  "/tai-khoan/doi-mat-khau",
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  if (HIDE_ON_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 z-[95] lg:hidden px-2.5 sm:px-4 pointer-events-none"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)" }}
    >
      <div
        className="pointer-events-auto mx-auto grid h-[64px] max-w-md grid-cols-5 items-stretch rounded-2xl border border-blue-100/90 bg-white/95 px-1 backdrop-blur-xl"
        style={{
          boxShadow: "0 8px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(37, 99, 235, 0.08)",
        }}
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href ||
            (href === "/dat-chuyen" && pathname === "/dat-chuyen") ||
            (href === "/cho-sinh-vien" && pathname.startsWith("/cho-sinh-vien")) ||
            (href === "/hoat-dong" && (pathname.startsWith("/hoat-dong") || pathname === "/don-hang")) ||
            (href === "/tai-khoan" && pathname.startsWith("/tai-khoan"));
          const showBadge = href === "/hoat-dong" && unreadCount > 0;

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex min-w-0 flex-col items-center justify-center gap-1 no-underline select-none active:scale-95 transition-transform"
            >
              {isActive && (
                <motion.div
                  layoutId="customer-nav-pill"
                  className="absolute inset-x-1 inset-y-1.5 rounded-xl bg-[#EFF6FF]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center justify-center gap-1">
                <span className="relative flex items-center justify-center">
                  <Icon
                    className={cn(
                      "h-[20px] w-[20px] transition-all",
                      isActive ? "text-[#0047FF] -translate-y-[1px]" : "text-slate-400"
                    )}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  {showBadge && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] leading-none whitespace-nowrap tracking-tight",
                    isActive ? "font-bold text-[#0047FF]" : "font-medium text-slate-500"
                  )}
                >
                  {label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
