"use client";

import { useState, useCallback, useMemo } from "react";
import { type PhotoFrame, clampPhotoFrame, getFramedImageStyle } from "@/lib/photo-frame";
import { cn } from "@/lib/utils";

interface FramedAvatarProps {
  src: string | undefined;
  frame: PhotoFrame | null | undefined;
  alt?: string;
  size: number;
  fallback?: React.ReactNode;
  className?: string;
}

export function FramedAvatar({
  src,
  frame,
  alt = "",
  size,
  fallback,
  className,
}: FramedAvatarProps) {
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalAspect(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  const handleError = useCallback(() => setImgError(true), []);

  const safeFrame = useMemo(
    () => (frame ? clampPhotoFrame(frame) : { zoom: 1, offsetX: 0, offsetY: 0 }),
    [frame],
  );

  const imgStyle = useMemo(() => {
    if (!naturalAspect) return undefined;
    return getFramedImageStyle(safeFrame, size, naturalAspect);
  }, [safeFrame, size, naturalAspect]);

  const showFallback = !src || imgError;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full shrink-0 select-none",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {!showFallback && (
        <img
          src={src}
          alt={alt}
          className="pointer-events-none select-none"
          style={imgStyle ?? { width: "100%", height: "100%", objectFit: "cover" }}
          draggable={false}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      {showFallback && fallback}
    </div>
  );
}
