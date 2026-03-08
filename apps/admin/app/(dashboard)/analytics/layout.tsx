"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  MousePointerClickIcon,
  LayoutGridIcon,
  TrendingUpIcon,
} from "lucide-react";

const tabs = [
  { href: "/analytics", label: "Platform Health", icon: ActivityIcon },
  { href: "/analytics/engagement", label: "Engagement", icon: MousePointerClickIcon },
  { href: "/analytics/content", label: "Content", icon: LayoutGridIcon },
  { href: "/analytics/growth", label: "Growth", icon: TrendingUpIcon },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/analytics") return pathname === "/analytics";
    return pathname.startsWith(href);
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <nav className="flex gap-1 border-b border-border-subtle -mx-1 px-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium
                border-b-2 transition-all whitespace-nowrap shrink-0
                ${active
                  ? "border-primary text-fg"
                  : "border-transparent text-fg-muted hover:text-fg-secondary hover:border-border-subtle"
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Page Content */}
      {children}
    </div>
  );
}
