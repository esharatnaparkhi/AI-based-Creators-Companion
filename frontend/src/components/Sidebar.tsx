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
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Link2 },
  { href: "/drafts", label: "Drafts", icon: FileText },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const { pathname } = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-600" size={22} />
          <span className="font-bold text-gray-900 text-lg">CreatorAI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-200">
        {user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}