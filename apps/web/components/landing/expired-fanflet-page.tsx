"use client";

import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPhotoFrameImageStyle, readPhotoFrame } from "@/lib/photo-frame";
import { ensureUrl } from "@/lib/utils";
import { getThemeCSSVariables } from "@/lib/themes";

type Speaker = {
  id: string;
  name: string;
  photo_url: string | null;
  social_links: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  } | null;
};

interface ExpiredFanfletPageProps {
  speaker: Speaker;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** First available link: website, then LinkedIn, then X. */
function getCtaLink(social_links: Speaker["social_links"]): { url: string; label: string } | null {
  if (!social_links) return null;
  if (social_links.website && ensureUrl(social_links.website)) {
    return { url: ensureUrl(social_links.website)!, label: "Visit website" };
  }
  if (social_links.linkedin && ensureUrl(social_links.linkedin)) {
    return { url: ensureUrl(social_links.linkedin)!, label: "Connect on LinkedIn" };
  }
  if (social_links.twitter && ensureUrl(social_links.twitter)) {
    return { url: ensureUrl(social_links.twitter)!, label: "Follow on X" };
  }
  return null;
}

export function ExpiredFanfletPage({ speaker }: ExpiredFanfletPageProps) {
  const themeVars = getThemeCSSVariables("default");
  const photoFrameStyle = getPhotoFrameImageStyle(readPhotoFrame(speaker.social_links));
  const cta = getCtaLink(speaker.social_links);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 flex flex-col"
      style={themeVars}
    >
      <div
        className="flex-1 flex flex-col items-center justify-center px-5 py-12 max-w-lg mx-auto text-center"
        style={{
          background:
            "linear-gradient(to bottom right, var(--theme-primary), var(--theme-primary-mid), var(--theme-primary-dark))",
        }}
      >
        <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-6 py-8 w-full">
          <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-[3px] ring-white/30 ring-offset-2 ring-offset-transparent shadow-xl mx-auto mb-4">
            <AvatarImage
              src={speaker.photo_url ?? undefined}
              alt={speaker.name}
              className="object-cover"
              style={photoFrameStyle}
            />
            <AvatarFallback className="text-xl font-bold bg-slate-700 text-white">
              {getInitials(speaker.name)}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {speaker.name}
          </h1>
          <p className="text-white/90 text-sm sm:text-base mb-6">
            This Fanflet is no longer available.
          </p>
          {cta && (
            <a
              href={cta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-white text-[var(--theme-primary)] font-semibold text-sm h-11 px-6 hover:opacity-95 transition-opacity"
            >
              {cta.label}
            </a>
          )}
        </div>
      </div>

      <footer className="border-t border-slate-200/60 bg-slate-50/80 px-6 py-10 text-center">
        <div className="flex justify-center gap-2.5 mb-3">
          <Image
            src="/logo.png"
            alt="Fanflet"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-lg font-bold tracking-tight text-[#1B365D]">
            Fanflet
          </span>
        </div>
        <p className="text-base font-medium text-slate-700 mb-1">
          Engage your audience after every talk.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1B365D] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152b4d] transition-colors"
        >
          Get your free Fanflet
        </Link>
      </footer>
    </div>
  );
}
