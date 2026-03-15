"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, Users, Link2, Plug, Settings, LogOut, Clock, Library, Megaphone, BarChart3 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { RoleSwitcher } from "@/components/dashboard/role-switcher";

const sponsorNavItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/sponsor/dashboard" },
  { icon: BarChart3, label: "Analytics", href: "/sponsor/analytics" },
  { icon: Library, label: "Resource Library", href: "/sponsor/library" },
  { icon: Megaphone, label: "Campaigns", href: "/sponsor/campaigns" },
  { icon: Users, label: "Leads", href: "/sponsor/leads" },
  { icon: Link2, label: "Connections", href: "/sponsor/connections" },
  { icon: Plug, label: "Integrations", href: "/sponsor/integrations" },
  { icon: Settings, label: "Settings", href: "/sponsor/settings" },
];

function getCompanyInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface SidebarContentProps {
  pathname: string;
  companyName: string;
  contactEmail: string;
  logoUrl?: string;
  isVerified: boolean;
  initials: string;
  roles?: string[];
  activeRole?: string;
  impParam?: string | null;
}

function SponsorSidebarContent({
  pathname,
  companyName,
  contactEmail,
  logoUrl,
  isVerified,
  initials,
  roles,
  activeRole,
  impParam = null,
}: SidebarContentProps) {
  const hrefWithImp = (href: string) =>
    impParam ? `${href}${href.includes("?") ? "&" : "?"}__imp=${impParam}` : href;

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-white">
      <div className="p-6 flex items-center gap-2">
        <Image src="/logo.png" alt="Fanflet Logo" width={32} height={32} className="w-8 h-8" />
        <span className="text-xl font-bold tracking-tight">Fanflet</span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-1">
        {sponsorNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/sponsor/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={hrefWithImp(item.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-teal-500 text-gray-900"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-white/20 bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={companyName}
                width={36}
                height={36}
                className="w-full h-full object-contain"
                unoptimized
              />
            ) : (
              <span className="text-sm font-semibold text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{companyName}</p>
            <div className="flex items-center gap-1.5">
              {!isVerified && (
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              )}
              <p className="text-xs text-gray-400 truncate">
                {isVerified ? contactEmail : "Pending verification"}
              </p>
            </div>
          </div>
        </div>
        {roles && activeRole && (
          <RoleSwitcher roles={roles} activeRole={activeRole} impParam={impParam} />
        )}
        <form action="/auth/signout" method="POST" className="w-full">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}

interface SponsorSidebarProps {
  user: {
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
  sponsor: {
    id: string;
    company_name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    contact_email: string;
    speaker_label?: string | null;
  };
  activeRole: string;
  children: React.ReactNode;
}

export function SponsorSidebar({ user, sponsor, activeRole, children }: SponsorSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const impParam = searchParams.get("__imp");

  const initials = getCompanyInitials(sponsor.company_name);
  const roles = (Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : []) as string[];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:block w-64 shrink-0 fixed top-[var(--banner-height,0px)] bottom-0 left-0 z-50">
        <SponsorSidebarContent
          pathname={pathname}
          companyName={sponsor.company_name}
          contactEmail={sponsor.contact_email}
          logoUrl={sponsor.logo_url ?? undefined}
          isVerified={sponsor.is_verified}
          initials={initials}
          roles={roles}
          activeRole={activeRole}
          impParam={impParam}
        />
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <header className="md:hidden h-16 bg-white border-b flex items-center px-4 justify-between sticky top-[var(--banner-height,0px)] z-40">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Fanflet Logo" width={24} height={24} className="w-6 h-6" />
            <span className="font-bold text-zinc-900">Fanflet</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" suppressHydrationWarning>
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-zinc-800 bg-zinc-900 w-64 text-white">
              <SponsorSidebarContent
                pathname={pathname}
                companyName={sponsor.company_name}
                contactEmail={sponsor.contact_email}
                logoUrl={sponsor.logo_url ?? undefined}
                isVerified={sponsor.is_verified}
                initials={initials}
                roles={roles}
                activeRole={activeRole}
                impParam={impParam}
              />
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-[1400px]">
            {!sponsor.is_verified && (
              <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Account pending verification.</span>{" "}
                  Your profile is under review by the Fanflet team. Once verified, {sponsor.speaker_label ?? "speaker"}s will be able to discover and connect with you.
                </p>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
