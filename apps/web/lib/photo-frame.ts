import type { CSSProperties } from "react";

export interface PhotoFrame {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampPhotoFrame(frame: PhotoFrame): PhotoFrame {
  return {
    zoom: clamp(frame.zoom, 1, 3),
    offsetX: clamp(frame.offsetX, -1, 1),
    offsetY: clamp(frame.offsetY, -1, 1),
  };
}

export function readPhotoFrame(socialLinks: unknown): PhotoFrame | null {
  if (!isRecord(socialLinks)) return null;
  const candidate = socialLinks.photo_frame;
  if (!isRecord(candidate)) return null;

  const zoom = typeof candidate.zoom === "number" ? candidate.zoom : 1;
  const offsetX = typeof candidate.offsetX === "number" ? candidate.offsetX : 0;
  const offsetY = typeof candidate.offsetY === "number" ? candidate.offsetY : 0;

  return clampPhotoFrame({ zoom, offsetX, offsetY });
}

export function getPhotoFrameImageStyle(frame: PhotoFrame | null | undefined): CSSProperties | undefined {
  if (!frame) return undefined;
  const safe = clampPhotoFrame(frame);

  return {
    transform: `translate(${-safe.offsetX * 100}%, ${-safe.offsetY * 100}%) scale(${safe.zoom})`,
    transformOrigin: "center",
  };
}

