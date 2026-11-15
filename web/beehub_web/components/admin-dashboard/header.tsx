"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Sun,
  Moon,
  LogOut,
  User,
} from "lucide-react";
import * as Avatar from "@radix-ui/react-avatar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useSidebarStore } from "@/lib/admin/stores/sidebar-store";
import { useTheme } from "@/components/admin-providers/theme-provider";
import { cn } from "@/lib/admin/utils";
import { adminApi, apiClient } from "@/lib/admin/api";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { logoutToHome } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
      style={{ color: "var(--muted)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
          "var(--primary-tint)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
      }}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Admin avatar dropdown
// ---------------------------------------------------------------------------

interface AdminAvatarDropdownProps {
  profile: AdminProfile | null;
  onLogout: () => void;
}

function AdminAvatarDropdown({ profile, onLogout }: AdminAvatarDropdownProps) {
  const router = useRouter();
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "A";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1 rounded-xl transition-colors"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--primary-tint)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
          }}
          aria-label="Admin menu"
        >
          <Avatar.Root className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <Avatar.Image
              src={profile?.avatar_url ?? undefined}
              alt={profile?.full_name ?? "Admin"}
              className="w-full h-full object-cover"
            />
            <Avatar.Fallback
              className="w-full h-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {initials}
            </Avatar.Fallback>
          </Avatar.Root>
          <span
            className="hidden sm:block text-sm font-medium max-w-[120px] truncate"
            style={{ color: "var(--text)" }}
          >
            {profile?.full_name ?? profile?.email ?? "Admin"}
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-[9999] w-72 rounded-2xl border shadow-2xl p-1 outline-none",
            "animate-in fade-in-0 zoom-in-95"
          )}
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35), 0 0 0 1px var(--border)",
          }}
        >
          {profile && (
            <>
              <div className="px-4 py-3" style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-bold break-words" style={{ color: "var(--text)" }}>
                  {profile.full_name ?? "Admin"}
                </p>
                <span className="inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: "var(--primary-tint)", color: "var(--primary)" }}>
                  Quản trị viên
                </span>
                {profile.email && (
                  <p className="text-xs mt-2 break-all" style={{ color: "var(--muted)" }}>
                    {profile.email}
                  </p>
                )}
              </div>
              <DropdownMenu.Separator
                className="my-1 h-px mx-1"
                style={{ backgroundColor: "var(--border)" }}
              />
            </>
          )}

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer outline-none"
            style={{ color: "var(--text)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "var(--primary-tint)";
              (e.currentTarget as HTMLDivElement).style.color =
                "var(--primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
              (e.currentTarget as HTMLDivElement).style.color = "var(--text)";
            }}
            onSelect={() => router.push("/admin/profile")}
          >
            <User size={15} />
            Hồ sơ
          </DropdownMenu.Item>

          <DropdownMenu.Separator
            className="my-1 h-px mx-1"
            style={{ backgroundColor: "var(--border)" }}
          />

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer outline-none text-red-500"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "#FEE2E2";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
            }}
            onSelect={onLogout}
          >
            <LogOut size={15} />
            Đăng xuất
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// Main Header component
// ---------------------------------------------------------------------------

export default function Header() {
  const router = useRouter();
  const { toggleCollapsed, setMobileOpen } = useSidebarStore();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [searchValue, setSearchValue] = useState("");

  // Fetch current admin profile from API
  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      apiClient.setToken(token);
      const res = await adminApi.getProfile();

      if (res.success && res.data) {
        const user = res.data as AdminProfile;
        setProfile({
          id: user.id,
          full_name: user.full_name ?? null,
          avatar_url: user.avatar_url ?? null,
          email: user.email ?? null,
        });
        localStorage.setItem("admin_user", JSON.stringify(res.data));
        return;
      }

      // Fallback: localStorage
      const userStr = localStorage.getItem("admin_user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      setProfile({
        id: user.id as string,
        full_name: user.full_name ?? null,
        avatar_url: user.avatar_url ?? null,
        email: user.email ?? null,
      });
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      const userStr = localStorage.getItem("admin_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setProfile({
            id: user.id as string,
            full_name: user.full_name ?? null,
            avatar_url: user.avatar_url ?? null,
            email: user.email ?? null,
          });
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    function onProfileUpdated(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setProfile({
          id: detail.id,
          full_name: detail.full_name ?? null,
          avatar_url: detail.avatar_url ?? null,
          email: detail.email ?? null,
        });
      } else {
        void fetchProfile();
      }
    }

    window.addEventListener("admin-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("admin-profile-updated", onProfileUpdated);
  }, [fetchProfile]);

  const handleLogout = useCallback(async () => {
    logoutToHome(router);
  }, [router]);

  return (
    <header
      className="sticky top-0 z-[200] isolate flex items-center gap-3 px-4 border-b shrink-0"
      style={{
        height: "64px",
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Left: hamburger / collapse toggle */}
      <button
        className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors shrink-0"
        style={{ color: "var(--muted)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "var(--primary-tint)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
        }}
        onClick={() => {
          // On mobile: open drawer; on desktop: collapse sidebar
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            setMobileOpen(true);
          } else {
            toggleCollapsed();
          }
        }}
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Center: search */}
      <div className="flex-1 flex items-center min-w-0 max-w-md">
        <div className="relative w-full">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"
            style={{ color: "var(--muted)" }}
          >
            <Search size={16} />
          </span>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchValue.trim()) {
                router.push(`/admin/orders?search=${encodeURIComponent(searchValue.trim())}`);
              }
            }}
            placeholder="Tìm kiếm đơn hàng, người dùng..."
            className="w-full h-10 pl-10 pr-4 text-sm rounded-xl border outline-none transition-all placeholder:opacity-70"
            style={{
              backgroundColor: "var(--bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor =
                "var(--primary)";
              (e.currentTarget as HTMLInputElement).style.boxShadow =
                "0 0 0 3px var(--primary-tint)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLInputElement).style.boxShadow = "";
            }}
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        <NotificationBell isAdmin showCountBadge buttonClassName="rounded-xl" iconSize={18} />

        <AdminAvatarDropdown profile={profile} onLogout={handleLogout} />
      </div>
    </header>
  );
}
