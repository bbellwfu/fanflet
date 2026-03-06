"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PREVIEW_SIZE = 280;
const EXPORT_SIZE = 400;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface LogoCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onSaved: (croppedBlob: Blob) => void;
}

export function LogoCropModal({ open, onOpenChange, file, onSaved }: LogoCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const displayOffset = offset;
  const prevZoomRef = useRef(zoom);

  const handleZoomChange = useCallback((value: number[]) => {
    const newZoom = value[0];
    const z1 = prevZoomRef.current;
    if (z1 > 0 && newZoom !== z1) {
      const ratio = newZoom / z1;
      setOffset((prev) => ({ x: prev.x * ratio, y: prev.y * ratio }));
    }
    prevZoomRef.current = newZoom;
    setZoom(newZoom);
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setImageLoaded(true);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    prevZoomRef.current = 1;
  }, []);

  const imgStyle = useMemo(() => {
    if (!naturalSize) return { display: "none" as const };
    const { w, h } = naturalSize;
    const aspect = w / h;

    let baseW: number;
    let baseH: number;
    if (aspect >= 1) {
      baseH = PREVIEW_SIZE;
      baseW = PREVIEW_SIZE * aspect;
    } else {
      baseW = PREVIEW_SIZE;
      baseH = PREVIEW_SIZE / aspect;
    }

    const scaledW = baseW * zoom;
    const scaledH = baseH * zoom;

    return {
      width: scaledW,
      height: scaledH,
      maxWidth: "none" as const,
      left: (PREVIEW_SIZE - scaledW) / 2 - displayOffset.x,
      top: (PREVIEW_SIZE - scaledH) / 2 - displayOffset.y,
    };
  }, [naturalSize, zoom, displayOffset]);

  const displayOffsetRef = useRef(displayOffset);
  displayOffsetRef.current = displayOffset;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !imageLoaded || !open) return;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const start = {
        x: e.clientX,
        y: e.clientY,
        offsetX: displayOffsetRef.current.x,
        offsetY: displayOffsetRef.current.y,
      };
      dragStartRef.current = start;
      setDragStart(start);

      const onMove = (moveEvent: PointerEvent) => {
        const s = dragStartRef.current;
        if (!s) return;
        setOffset({
          x: s.offsetX - (moveEvent.clientX - s.x),
          y: s.offsetY - (moveEvent.clientY - s.y),
        });
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove, { capture: true });
        document.removeEventListener("pointerup", onUp, { capture: true });
        document.removeEventListener("pointercancel", onUp, { capture: true });
        dragStartRef.current = null;
        setDragStart(null);
      };

      document.addEventListener("pointermove", onMove, { capture: true });
      document.addEventListener("pointerup", onUp, { capture: true });
      document.addEventListener("pointercancel", onUp, { capture: true });
    };

    el.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => el.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [imageLoaded, open]);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (file) {
      setImageLoaded(false);
      setNaturalSize(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      prevZoomRef.current = 1;
    }
  }, [file]);

  const handleSave = useCallback(async () => {
    if (!file || !imageUrl || !naturalSize || !imageLoaded) return;

    setSaving(true);
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });

      const { w: natW, h: natH } = naturalSize;
      const aspect = natW / natH;

      let baseW: number;
      let baseH: number;
      if (aspect >= 1) {
        baseH = PREVIEW_SIZE;
        baseW = PREVIEW_SIZE * aspect;
      } else {
        baseW = PREVIEW_SIZE;
        baseH = PREVIEW_SIZE / aspect;
      }

      const scaledW = baseW * zoom;
      const scaledH = baseH * zoom;

      const drawX = (PREVIEW_SIZE - scaledW) / 2 - offset.x;
      const drawY = (PREVIEW_SIZE - scaledH) / 2 - offset.y;

      const scale = EXPORT_SIZE / PREVIEW_SIZE;

      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Canvas not supported.");
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      ctx.drawImage(loaded, drawX * scale, drawY * scale, scaledW * scale, scaledH * scale);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );

      if (!blob) {
        toast.error("Failed to export cropped logo.");
        return;
      }

      onSaved(blob);
      onOpenChange(false);
    } catch {
      toast.error("Failed to crop logo.");
    } finally {
      setSaving(false);
    }
  }, [file, imageUrl, naturalSize, imageLoaded, zoom, offset, onSaved, onOpenChange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !saving) {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setImageLoaded(false);
        setNaturalSize(null);
        prevZoomRef.current = 1;
      }
      onOpenChange(next);
    },
    [onOpenChange, saving]
  );

  const hasImage = Boolean(imageUrl);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!saving} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-900">Crop your logo</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Drag to position and use the slider to zoom. The square shows how it will appear.
          Output: 400 &times; 400px.
        </p>

        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden rounded-lg border-2 border-[#e2e8f0] bg-white select-none touch-none"
          style={{
            width: PREVIEW_SIZE,
            height: PREVIEW_SIZE,
            cursor: imageLoaded ? (dragStart ? "grabbing" : "grab") : "default",
            touchAction: "none",
          }}
        >
          {hasImage && (
            <img
              key={imageUrl}
              src={imageUrl!}
              alt="Crop preview"
              className="pointer-events-none absolute select-none"
              style={imgStyle}
              draggable={false}
              onLoad={handleImageLoad}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900">Zoom</label>
          <Slider
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            value={[zoom]}
            onValueChange={handleZoomChange}
            disabled={!imageLoaded}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
            className="border-[#e2e8f0] text-zinc-900"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!imageLoaded || saving}
            className="bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save logo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
