"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ToggleLeft,
  CreditCard,
  LogOut,
  Shield,
  Menu,
} from "lucide-react";
import { Button } from "@fanflet/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@fanflet/ui/sheet";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/" },
  { icon: Users, label: "Accounts", href: "/accounts" },
  { icon: ToggleLeft, label: "Features & Plans", href: "/features" },
  { icon: CreditCard, label: "Subscriptions", href: "/subscriptions", disabled: true },
];

interface NavContentProps {
  pathname: string;
  email: string;
}

function NavContent({ pathname, email }: NavContentProps) {
  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      <div className="p-6 flex items-center gap-3">
        <Shield className="w-7 h-7 text-indigo-400" />
        <div>
          <span className="text-lg font-bold tracking-tight">Fanflet</span>
          <span className="ml-1.5 text-xs font-medium bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
            Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                item.disabled
                  ? "text-slate-600 cursor-not-allowed"
                  : isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              aria-disabled={item.disabled}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.disabled && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-600">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="px-3">
          <p className="text-xs text-slate-500 truncate">{email}</p>
        </div>
        <form action="/api/auth/signout" method="POST" className="w-full">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}

interface AdminSidebarProps {
  email: string;
  children: React.ReactNode;
}

export function AdminSidebar({ email, children }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 fixed inset-y-0 left-0 z-50">
        <NavContent pathname={pathname} email={email} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-white border-b flex items-center px-4 justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-900">Admin</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-slate-800 bg-slate-950 w-64 text-white">
              <NavContent pathname={pathname} email={email} />
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
