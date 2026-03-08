import { getSiteUrl } from "@fanflet/db/config";

const CONTENT = (base: string) => `# Fanflet

> Digital resource platform for professional speakers. Attendees scan a QR code
> and get instant access to curated resources — slides, links, files, and sponsor
> content. Built by a team with decades of experience in clinical dental practice,
> KOL management, organized dentistry leadership, and enterprise technology.

## Product

- [Features](${base}/#features): QR code resource sharing, lead capture, and sponsor ROI tracking for professional speakers
- [Pricing](${base}/pricing): Free and Pro plans with feature comparison and FAQ. Pro is free during Early Access.
- [Demo](${base}/demo): Live demo with sample dental conference speaker page showing all resource types

## For Speakers

- [Overview](${base}/#speakers): Share resources via QR code, capture leads, build lasting audience relationships
- [Sign Up](${base}/signup): Create a free Fanflet account
- [Log In](${base}/login): Access the speaker dashboard

## For Sponsors

- [Overview](${base}/#sponsors): Measurable visibility with engaged professional audiences, engagement tracking, ROI data

## For Fans

- [Overview](${base}/#fans): Zero-friction access to speaker resources — scan a QR code, get everything instantly

## Company

- [About](${base}/about): Founding team background in clinical dental, KOL management, organized dentistry leadership (AGD), and enterprise technology
- [Contact](${base}/contact): Reach the team at support@fanflet.com

## Legal

- [Terms of Service](${base}/terms)
- [Privacy Policy](${base}/privacy)
`;

export function GET() {
  const base = getSiteUrl().replace(/\/$/, "");
  return new Response(CONTENT(base), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
