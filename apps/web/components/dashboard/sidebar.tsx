"use client";

import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, FileText, BarChart3, MessageSquare, BookOpen, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPhotoFrameImageStyle, readPhotoFrame } from "@/lib/photo-frame";
import { SetupChecklistPanel } from "@/components/dashboard/setup-checklist-panel";
import { hasStoredDefaultThemePreset, isOnboardingDismissed } from "@/lib/speaker-preferences";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: FileText, label: "My Fanflets", href: "/dashboard/fanflets" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
  { icon: MessageSquare, label: "Survey Questions", href: "/dashboard/surveys" },
  { icon: BookOpen, label: "Resource Library", href: "/dashboard/resources" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

interface SidebarContentProps {
  pathname: string;
  displayName: string;
  displayEmail: string;
  photoUrl?: string;
  photoFrameStyle?: CSSProperties;
  initials: string;
}

function SidebarContent({ pathname, displayName, displayEmail, photoUrl, photoFrameStyle, initials }: SidebarContentProps) {
  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <div className="p-6 flex items-center gap-2">
        <Image src="/logo.png" alt="Fanflet Logo" width={32} height={32} className="w-8 h-8" />
        <span className="text-xl font-bold tracking-tight">Fanflet</span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-secondary text-slate-900" : "text-slate-400 hover:text-white hover:bg-white/5"
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
          <Avatar className="w-9 h-9 border border-white/20">
            <AvatarImage src={photoUrl} style={photoFrameStyle} />
            <AvatarFallback className="bg-slate-800 text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
          </div>
        </div>
        <form action="/auth/signout" method="POST" className="w-full">
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

interface SidebarProps {
  user: { email?: string; user_metadata?: { full_name?: string } };
  speaker: {
    id?: string;
    name?: string;
    email?: string;
    photo_url?: string;
    slug?: string;
    social_links?: {
      linkedin?: string;
      twitter?: string;
      website?: string;
      photo_frame?: unknown;
      default_theme_preset?: string;
      onboarding?: { dismissed?: boolean; dismissed_at?: string | null };
    } | null;
  } | null;
  fanfletCount: number;
  publishedFanfletCount: number;
  surveyQuestionCount: number;
  resourceLibraryCount: number;
  children: React.ReactNode;
}

export function Sidebar({
  user,
  speaker,
  fanfletCount,
  publishedFanfletCount,
  surveyQuestionCount,
  resourceLibraryCount,
  children,
}: SidebarProps) {
  const pathname = usePathname();

  const displayName = speaker?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";
  const displayEmail = speaker?.email ?? user.email ?? "";
  const photoUrl = speaker?.photo_url ?? undefined;
  const photoFrame = readPhotoFrame(speaker?.social_links ?? null);
  const photoFrameStyle = getPhotoFrameImageStyle(photoFrame);
  const initials = getInitials(speaker?.name ?? user.user_metadata?.full_name ?? null, displayEmail);
  const isChecklistDismissed = isOnboardingDismissed(speaker?.social_links ?? null);
  const hasCreatedFanflet =
    fanfletCount > 0 ||
    (pathname.startsWith("/dashboard/fanflets/") && pathname !== "/dashboard/fanflets/new");
  const hasPendingChecklistSteps = !(
    Boolean(speaker?.name?.trim()) &&
    Boolean(speaker?.photo_url) &&
    Boolean(speaker?.slug?.trim()) &&
    hasStoredDefaultThemePreset(speaker?.social_links ?? null) &&
    surveyQuestionCount > 0 &&
    resourceLibraryCount > 0 &&
    hasCreatedFanflet &&
    publishedFanfletCount > 0
  );
  const showChecklistPanel = hasPendingChecklistSteps && (!isChecklistDismissed || pathname === "/dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 fixed inset-y-0 left-0 z-50">
        <SidebarContent pathname={pathname} displayName={displayName} displayEmail={displayEmail} photoUrl={photoUrl} photoFrameStyle={photoFrameStyle} initials={initials} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        {/* Mobile Header with Sheet */}
        <header className="md:hidden h-16 bg-white border-b flex items-center px-4 justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Fanflet Logo" width={24} height={24} className="w-6 h-6" />
            <span className="font-bold text-slate-900">Fanflet</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-slate-800 bg-slate-900 w-64 text-white">
              <SidebarContent pathname={pathname} displayName={displayName} displayEmail={displayEmail} photoUrl={photoUrl} photoFrameStyle={photoFrameStyle} initials={initials} />
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-[1400px]">
            {showChecklistPanel && (
              <div className="xl:hidden mb-4">
                <SetupChecklistPanel
                  speaker={speaker}
                  fanfletCount={fanfletCount}
                  publishedFanfletCount={publishedFanfletCount}
                  surveyQuestionCount={surveyQuestionCount}
                  resourceLibraryCount={resourceLibraryCount}
                  pathname={pathname}
                  compact
                />
              </div>
            )}
            <div className={showChecklistPanel ? "xl:flex xl:items-start xl:gap-8" : ""}>
              <div className="min-w-0 flex-1">{children}</div>
              {showChecklistPanel && (
                <aside className="hidden xl:block w-80 shrink-0 sticky top-8">
                  <SetupChecklistPanel
                    speaker={speaker}
                    fanfletCount={fanfletCount}
                    publishedFanfletCount={publishedFanfletCount}
                    surveyQuestionCount={surveyQuestionCount}
                    resourceLibraryCount={resourceLibraryCount}
                    pathname={pathname}
                  />
                </aside>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
