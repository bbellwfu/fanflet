"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  ExternalLink,
  Mail,
  Linkedin,
  Twitter,
  Globe,
  ChevronRight,
} from "lucide-react";
import { SubscribeForm } from "./subscribe-form";
import { trackResourceClick } from "./analytics-script";

type Speaker = {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  social_links: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  } | null;
};

type ResourceBlock = {
  id: string;
  type: "link" | "file" | "embed" | "text" | "sponsor";
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  image_url: string | null;
  section_name: string | null;
  metadata: {
    logo_url?: string;
    cta_text?: string;
    file_size?: string;
  } | null;
};

type Fanflet = {
  id: string;
  title: string;
  description: string | null;
  event_name: string;
  event_date: string | null;
  resource_blocks: ResourceBlock[];
};

type LandingPageProps = {
  speaker: Speaker;
  fanflet: Fanflet;
  subscriberCount: number;
};

function getStorageUrl(filePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/resources/${filePath}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LandingPage({
  speaker,
  fanflet,
  subscriberCount,
}: LandingPageProps) {
  const nonSponsorBlocks = fanflet.resource_blocks.filter(
    (b) => b.type !== "sponsor"
  );
  const sponsorBlocks = fanflet.resource_blocks.filter(
    (b) => b.type === "sponsor"
  );

  const blocksBySection = nonSponsorBlocks.reduce<Record<string, ResourceBlock[]>>(
    (acc, block) => {
      const section = block.section_name || "Resources";
      if (!acc[section]) acc[section] = [];
      acc[section].push(block);
      return acc;
    },
    {}
  );

  const socialLinks = speaker.social_links ?? {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B365D] via-[#1e3f6e] to-[#0f2440]" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#3BA5D9]/15 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#3BA5D9]/10 rounded-full blur-3xl -ml-16 -mb-16" />

        <div className="relative z-10 px-5 sm:px-8 pt-10 sm:pt-12 pb-16 max-w-lg md:max-w-2xl mx-auto">
          {/* Event badge */}
          {fanflet.event_name && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-semibold text-blue-200 border border-white/15">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                {fanflet.event_name}
              </div>
            </div>
          )}

          {/* Speaker info */}
          <div className="flex items-start gap-5 mb-6">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-[3px] ring-white/30 ring-offset-2 ring-offset-transparent shadow-xl shrink-0">
              <AvatarImage
                src={speaker.photo_url ?? undefined}
                alt={speaker.name}
                className="object-cover"
              />
              <AvatarFallback className="text-xl font-bold bg-slate-700 text-white">
                {getInitials(speaker.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                {speaker.name}
              </h1>
              {speaker.bio && (
                <p className="text-blue-200/90 text-sm sm:text-base font-medium mt-1 leading-relaxed">
                  {speaker.bio}
                </p>
              )}
              <div className="flex items-center gap-2.5 mt-3">
                {socialLinks.linkedin && (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-blue-200 hover:text-white transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-blue-200 hover:text-white transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.website && (
                  <a
                    href={socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-blue-200 hover:text-white transition-colors"
                    aria-label="Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Talk title + description */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 sm:px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-blue-300/70 font-semibold mb-2">
              Presentation
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-white leading-snug">
              {fanflet.title}
            </h2>
            {fanflet.description && (
              <p className="text-sm sm:text-base text-blue-200/80 mt-2 leading-relaxed">
                {fanflet.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg md:max-w-2xl mx-auto px-4 sm:px-8 -mt-5 space-y-6 relative z-10 pb-16">
        {/* Subscribe Card */}
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3BA5D9] to-[#1B365D] flex items-center justify-center">
                <Mail className="h-4 w-4 text-white" />
              </div>
              Stay Connected
            </CardTitle>
            <CardDescription className="text-sm">
              Get the slides and future updates from this speaker.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <SubscribeForm
              speakerId={speaker.id}
              fanfletId={fanflet.id}
              subscriberCount={subscriberCount}
            />
          </CardContent>
        </Card>

        {/* Resource Blocks by Section */}
        {Object.entries(blocksBySection).map(([sectionName, blocks]) => (
          <div key={sectionName} className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
              {sectionName}
            </h3>

            {blocks.map((block) => {
              if (block.type === "text") {
                return (
                  <div
                    key={block.id}
                    className="rounded-xl border border-slate-200/80 bg-white p-5"
                  >
                    <h4 className="font-semibold text-slate-900 mb-1">
                      {block.title}
                    </h4>
                    {block.description && (
                      <p className="text-sm sm:text-base text-slate-500 whitespace-pre-wrap leading-relaxed">
                        {block.description}
                      </p>
                    )}
                  </div>
                );
              }

              if (block.type === "link" && block.url) {
                return (
                  <a
                    key={block.id}
                    href={block.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    onClick={() => trackResourceClick(fanflet.id, block.id)}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-purple-300/40">
                      {block.image_url ? (
                        <>
                          <div
                            className="relative w-full bg-slate-50 flex items-center justify-center overflow-hidden"
                            style={{ minHeight: "80px", maxHeight: "180px" }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={block.image_url}
                              alt={block.title || "Resource"}
                              className="w-full h-auto max-h-[180px] object-contain group-hover:scale-[1.02] transition-transform duration-300"
                            />
                          </div>
                          <div className="p-4 sm:p-5 flex items-center gap-3 border-t border-slate-100">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900">
                                {block.title}
                              </h4>
                              {block.description && (
                                <p className="text-sm text-slate-400 line-clamp-2 mt-0.5">
                                  {block.description}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors shrink-0" />
                          </div>
                        </>
                      ) : (
                        <div className="p-4 sm:p-5 flex items-center gap-4">
                          <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                            <ExternalLink className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900">
                              {block.title}
                            </h4>
                            {block.description && (
                              <p className="text-sm text-slate-400 line-clamp-2">
                                {block.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors shrink-0" />
                        </div>
                      )}
                    </Card>
                  </a>
                );
              }

              if (block.type === "file" && block.file_path) {
                const fileUrl = getStorageUrl(block.file_path);
                const fileInfo =
                  block.metadata?.file_size ||
                  block.description ||
                  "Download";
                return (
                  <a
                    key={block.id}
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="block"
                    onClick={() => trackResourceClick(fanflet.id, block.id)}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-[#3BA5D9]/30">
                      <div className="p-4 sm:p-5 flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#1B365D] group-hover:bg-[#1B365D] group-hover:text-white transition-colors shrink-0">
                          <Download className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900">
                            {block.title}
                          </h4>
                          <p className="text-sm text-slate-400">{fileInfo}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#3BA5D9] transition-colors" />
                      </div>
                    </Card>
                  </a>
                );
              }

              if (block.type === "embed" && block.url) {
                return (
                  <a
                    key={block.id}
                    href={block.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    onClick={() => trackResourceClick(fanflet.id, block.id)}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-emerald-300/40">
                      <div className="p-4 sm:p-5 flex items-center gap-4">
                        <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                          <ExternalLink className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900">
                            {block.title}
                          </h4>
                          {block.description && (
                            <p className="text-sm text-slate-400">
                              {block.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </Card>
                  </a>
                );
              }

              return null;
            })}
          </div>
        ))}

        {/* Sponsors Section */}
        {sponsorBlocks.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                Featured Partner{sponsorBlocks.length > 1 ? "s" : ""}
              </span>
              <Separator className="flex-1" />
            </div>

            {sponsorBlocks.map((block) => (
              <Card
                key={block.id}
                className="bg-slate-900 text-white overflow-hidden border-0 shadow-lg"
              >
                <div className="p-6 text-center space-y-4">
                  {block.image_url ? (
                    <div className="bg-white rounded-xl px-8 py-5 mx-auto max-w-[85%] flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={block.image_url}
                        alt={block.title || "Sponsor"}
                        className="max-h-20 max-w-full w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <h3 className="text-2xl font-black tracking-tighter">
                      {block.title}
                    </h3>
                  )}
                  {block.description && (
                    <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-md mx-auto">
                      {block.description}
                    </p>
                  )}
                  {block.url && (
                    <a
                      href={block.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                      onClick={() => trackResourceClick(fanflet.id, block.id)}
                    >
                      <span className="inline-flex items-center justify-center w-full bg-[#3BA5D9] hover:bg-[#2d8fbd] text-white font-semibold text-base h-11 rounded-md transition-colors">
                        {block.metadata?.cta_text ?? "Learn More"}
                      </span>
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-4 border-t border-slate-200/60 pt-6">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          Powered by{" "}
          <span className="font-bold text-[#1B365D] flex items-center gap-1">
            <Image
              src="/logo.png"
              alt="Fanflet Logo"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            Fanflet
          </span>
        </p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-slate-400">
          <Link
            href="/signup"
            className="hover:text-[#1B365D] transition-colors"
          >
            Create your own
          </Link>
          <Link href="#" className="hover:text-[#1B365D] transition-colors">
            Privacy
          </Link>
          <Link href="#" className="hover:text-[#1B365D] transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
