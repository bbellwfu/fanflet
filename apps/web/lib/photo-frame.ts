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

/**
 * Compute inline styles that position a photo inside a square container,
 * matching the crop-modal's direct-positioning approach.
 *
 * `containerSize` is the rendered width/height of the avatar (e.g. 80).
 * `aspect` is the image's naturalWidth / naturalHeight.
 */
export function getFramedImageStyle(
  frame: PhotoFrame,
  containerSize: number,
  aspect: number,
): CSSProperties {
  const safe = clampPhotoFrame(frame);

  let baseW: number;
  let baseH: number;
  if (aspect >= 1) {
    baseH = containerSize;
    baseW = containerSize * aspect;
  } else {
    baseW = containerSize;
    baseH = containerSize / aspect;
  }

  const scaledW = baseW * safe.zoom;
  const scaledH = baseH * safe.zoom;

  return {
    position: "absolute",
    width: scaledW,
    height: scaledH,
    maxWidth: "none",
    left: (containerSize - scaledW) / 2 - safe.offsetX * containerSize,
    top: (containerSize - scaledH) / 2 - safe.offsetY * containerSize,
  };
}

/** @deprecated Use FramedAvatar component instead for accurate display. */
export function getPhotoFrameImageStyle(frame: PhotoFrame | null | undefined): CSSProperties | undefined {
  if (!frame) return undefined;
  const safe = clampPhotoFrame(frame);

  const tx = -safe.offsetX * safe.zoom * 100;
  const ty = -safe.offsetY * safe.zoom * 100;

  return {
    transform: `translate(${tx}%, ${ty}%) scale(${safe.zoom})`,
    transformOrigin: "center",
  };
}

