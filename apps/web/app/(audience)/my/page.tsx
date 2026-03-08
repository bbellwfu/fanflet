import { requireAudience } from "@/lib/auth-context";
import { isExpired } from "@/lib/expiration";
import { Bookmark, Calendar, Clock, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

interface SavedFanflet {
  id: string;
  saved_at: string;
  save_source: string;
  fanflet_id: string;
  fanflet_title: string | null;
  fanflet_slug: string | null;
  fanflet_event_name: string | null;
  fanflet_event_date: string | null;
  fanflet_expiration_date: string | null;
  fanflet_status: string | null;
  speaker_name: string | null;
  speaker_slug: string | null;
  speaker_photo_url: string | null;
}

export default async function PortfolioPage() {
  const { audienceId, supabase } = await requireAudience();

  const { data: rows } = await supabase
    .from("audience_saved_fanflets")
    .select(`
      id,
      saved_at,
      save_source,
      fanflet_id,
      fanflets!inner (
        title,
        slug,
        event_name,
        event_date,
        expiration_date,
        status,
        speaker_id,
        speakers!inner (
          name,
          slug,
          photo_url
        )
      )
    `)
    .eq("audience_account_id", audienceId)
    .order("saved_at", { ascending: false });

  const savedFanflets: SavedFanflet[] = (rows ?? []).map((row) => {
    const f = row.fanflets as unknown as Record<string, unknown> | null;
    const s = (f?.speakers as unknown as Record<string, unknown>) ?? null;
    return {
      id: row.id,
      saved_at: row.saved_at,
      save_source: row.save_source,
      fanflet_id: row.fanflet_id,
      fanflet_title: (f?.title as string) ?? null,
      fanflet_slug: (f?.slug as string) ?? null,
      fanflet_event_name: (f?.event_name as string) ?? null,
      fanflet_event_date: (f?.event_date as string) ?? null,
      fanflet_expiration_date: (f?.expiration_date as string) ?? null,
      fanflet_status: (f?.status as string) ?? null,
      speaker_name: (s?.name as string) ?? null,
      speaker_slug: (s?.slug as string) ?? null,
      speaker_photo_url: (s?.photo_url as string) ?? null,
    };
  });

  if (savedFanflets.length === 0) {
    return <EmptyPortfolio />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Portfolio</h1>
        <p className="text-sm text-slate-500 mt-1">
          Fanflets you&apos;ve saved from events and talks.
        </p>
      </div>

      <div className="grid gap-4">
        {savedFanflets.map((item) => (
          <FanfletCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function FanfletCard({ item }: { item: SavedFanflet }) {
  const expired = isExpired(item.fanflet_expiration_date);
  const isUnavailable = item.fanflet_status !== "published" && !expired;
  const href =
    !expired && !isUnavailable && item.speaker_slug && item.fanflet_slug
      ? `/${item.speaker_slug}/${item.fanflet_slug}?ref=portfolio`
      : null;

  const formattedDate = item.fanflet_event_date
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(item.fanflet_event_date + "T12:00:00Z"))
    : null;

  const content = (
    <Card
      className={`overflow-hidden transition-all ${
        href
          ? "hover:shadow-md hover:border-slate-300 cursor-pointer"
          : "opacity-75"
      }`}
    >
      <div className="p-4 sm:p-5 flex gap-4">
        <div className="shrink-0">
          {item.speaker_photo_url ? (
            <Image
              src={item.speaker_photo_url}
              alt={item.speaker_name ?? ""}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">
                {item.fanflet_title ?? "Untitled Fanflet"}
              </h3>
              {item.speaker_name && (
                <p className="text-sm text-slate-500">{item.speaker_name}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {expired && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Expired
                </span>
              )}
              {isUnavailable && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                  Unavailable
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            {item.fanflet_event_name && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {item.fanflet_event_name}
              </span>
            )}
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function EmptyPortfolio() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
        <Bookmark className="w-7 h-7 text-slate-400" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">
        Your portfolio is empty
      </h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        When you visit a speaker&apos;s Fanflet page and save it, it will appear
        here. Your portfolio keeps a record of every talk and resource you
        collect.
      </p>
      <p className="text-xs text-slate-400">
        Tip: Look for the &ldquo;Save to Portfolio&rdquo; button on any Fanflet page.
      </p>
    </div>
  );
}
