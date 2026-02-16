"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ToggleLeft,
  CreditCard,
  LogOut,
  Shield,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@fanflet/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@fanflet/ui/sheet";

const THEME_KEY = "fanflet-admin-theme";

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    const preferred = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(preferred);
    if (preferred === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") localStorage.setItem(THEME_KEY, next);
    if (next === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

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
    <div className="h-full flex flex-col bg-card text-card-foreground border-r border-border">
      <div className="p-6 flex items-center gap-3">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <span className="text-lg font-bold tracking-tight">Fanflet</span>
          <span className="ml-1.5 text-xs font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded">
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
                  ? "text-muted-foreground/70 cursor-not-allowed"
                  : isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              aria-disabled={item.disabled}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.disabled && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2 px-3">
          <ThemeToggle />
          <p className="text-xs text-muted-foreground truncate min-w-0">{email}</p>
        </div>
        <form action="/api/auth/signout" method="POST" className="w-full">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
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
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 fixed inset-y-0 left-0 z-50">
        <NavContent pathname={pathname} email={email} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-card border-b border-border flex items-center px-4 justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Admin</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r border-border bg-card w-64 text-card-foreground">
              <NavContent pathname={pathname} email={email} />
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
