import Link from "next/link";
import { useRouter } from "next/router";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Link2,
  FileText,
  Calendar,
  BarChart3,
  LogOut,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts",  label: "Accounts",  icon: Link2 },
  { href: "/drafts",    label: "Drafts",     icon: FileText },
  { href: "/schedule",  label: "Schedule",   icon: Calendar },
  { href: "/analytics", label: "Analytics",  icon: BarChart3 },
];

export function Sidebar() {
  const { pathname } = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-[220px] min-h-screen bg-canvas flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
            <Zap size={15} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">CreatorAI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/45 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon size={16} className={clsx(active && "text-brand-400")} />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 m-3 mb-4 rounded-2xl bg-white/[0.05]">
        {user && (
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-white/40 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-white/35 hover:text-white/70 transition-colors"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
