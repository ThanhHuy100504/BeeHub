"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/admin/utils";

/* ── Root ────────────────────────────────────────────────────────────────── */

const Tabs = TabsPrimitive.Root;

/* ── List ────────────────────────────────────────────────────────────────── */

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, style, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex w-full flex-wrap items-center justify-start rounded-xl p-1 gap-1 sm:inline-flex sm:w-auto",
      className,
    )}
    style={{
      backgroundColor: "var(--primary-tint)",
      ...style,
    }}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/* ── Trigger ─────────────────────────────────────────────────────────────── */

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, style, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex min-h-11 flex-1 sm:flex-none items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
      "transition-all duration-200 cursor-pointer select-none",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1",
      "disabled:pointer-events-none disabled:opacity-50",
      // inactive state
      "text-[var(--muted)] hover:text-[var(--text)]",
      // active state: primary bg + white text
      "data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white data-[state=active]:shadow-sm",
      className,
    )}
    style={style}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/* ── Content ─────────────────────────────────────────────────────────────── */

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none",
      "focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
