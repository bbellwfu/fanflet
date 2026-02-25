"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboardIcon,
  UsersIcon,
  FileTextIcon,
  MailIcon,
  ToggleLeftIcon,
  CreditCardIcon,
  LogOutIcon,
  MenuIcon,
} from "lucide-react";
import { Button } from "@fanflet/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@fanflet/ui/sheet";

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    id: "overview",
    href: "/",
    label: "Overview",
    icon: <LayoutDashboardIcon className="w-[18px] h-[18px]" />,
  },
  {
    id: "accounts",
    href: "/accounts",
    label: "Accounts",
    icon: <UsersIcon className="w-[18px] h-[18px]" />,
  },
  {
    id: "fanflets",
    href: "/fanflets",
    label: "Fanflets",
    icon: <FileTextIcon className="w-[18px] h-[18px]" />,
  },
  {
    id: "subscribers",
    href: "/subscribers",
    label: "Subscribers",
    icon: <MailIcon className="w-[18px] h-[18px]" />,
  },
  {
    id: "features",
    href: "/features",
    label: "Features & Plans",
    icon: <ToggleLeftIcon className="w-[18px] h-[18px]" />,
  },
  {
    id: "waiting-list",
    href: "/waiting-list",
    label: "Waiting List",
    icon: <MailIcon className="w-[18px] h-[18px]" />,
  },
  {
    id: "subscriptions",
    href: "/subscriptions",
    label: "Subscriptions",
    icon: <CreditCardIcon className="w-[18px] h-[18px]" />,
    disabled: true,
    badge: "Soon",
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

interface NavContentProps {
  pathname: string;
  email: string;
}

function NavContent({ pathname, email }: NavContentProps) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-border-subtle">
      {/* Brand */}
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Fanflet Logo" width={32} height={32} className="w-8 h-8" />
          <span className="text-[15px] font-semibold text-fg tracking-tight">
            Fanflet
          </span>
          <span className="text-[10px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded bg-primary-muted text-primary-soft ml-0.5">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.id}
                href={item.disabled ? "#" : item.href}
                aria-current={active ? "page" : undefined}
                aria-disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
                  transition-all duration-150 relative group
                  ${active
                    ? "bg-primary-muted text-fg"
                    : item.disabled
                    ? "text-fg-muted cursor-not-allowed"
                    : "text-fg-secondary hover:text-fg hover:bg-surface-elevated"
                  }
                `}
                onClick={item.disabled ? (e) => e.preventDefault() : undefined}
              >
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                )}

                <span className={active ? "text-primary-soft" : ""}>
                  {item.icon}
                </span>
                <span>{item.label}</span>

                {item.badge && (
                  <span className="ml-auto text-[10px] font-medium tracking-wide uppercase text-fg-muted">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-5">
        <div className="border-t border-border-subtle pt-4 mb-3">
          <div className="px-3 mb-3">
            <p className="text-[12px] text-fg-muted truncate">{email}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-fg-secondary hover:text-fg hover:bg-surface-elevated transition-all duration-150"
            >
              <div className="w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center text-[11px] font-semibold text-fg-secondary">
                {initial}
              </div>
              <span>Sign out</span>
              <LogOutIcon className="w-3.5 h-3.5 ml-auto text-fg-muted" />
            </button>
          </form>
        </div>
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
    <div className="flex min-h-screen bg-page">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed top-0 left-0 bottom-0 w-60 z-30">
        <NavContent pathname={pathname} email={email} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-60 min-h-screen flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-sidebar border-b border-border-subtle flex items-center px-4 justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Fanflet Logo" width={28} height={28} className="w-7 h-7" />
            <span className="text-[14px] font-semibold text-fg tracking-tight">
              Fanflet
            </span>
            <span className="text-[9px] font-medium tracking-wider uppercase px-1 py-0.5 rounded bg-primary-muted text-primary-soft">
              Admin
            </span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MenuIcon className="w-5 h-5 text-fg-secondary" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-60 border-r border-border-subtle bg-sidebar">
              <NavContent pathname={pathname} email={email} />
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 p-6 md:p-8 lg:p-10 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
