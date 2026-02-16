"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { createClient } from "@/lib/supabase/client";
import { updateSpeakerPhoto } from "@/app/dashboard/settings/actions";
import { clampPhotoFrame, type PhotoFrame } from "@/lib/photo-frame";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PREVIEW_SIZE = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface PhotoCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  /** When set, edit an already-uploaded photo (load from this URL instead of file). */
  existingPhotoUrl: string | null;
  initialFrame?: PhotoFrame | null;
  authUserId: string;
  onSaved: (photoUrl: string, photoFrame: PhotoFrame) => void;
}

export function PhotoCropModal({
  open,
  onOpenChange,
  file,
  existingPhotoUrl,
  initialFrame = null,
  authUserId,
  onSaved,
}: PhotoCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
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
  const handleZoomChange = useCallback(
    (value: number[]) => {
      const newZoom = value[0];
      const z1 = prevZoomRef.current;
      const z2 = newZoom;
      if (z1 > 0 && z2 !== z1) {
        const ratio = z2 / z1;
        setOffset((prev) => ({
          x: PREVIEW_SIZE / 2 - (PREVIEW_SIZE / 2 - prev.x) * ratio,
          y: PREVIEW_SIZE / 2 - (PREVIEW_SIZE / 2 - prev.y) * ratio,
        }));
      }
      prevZoomRef.current = newZoom;
      setZoom(newZoom);
    },
    []
  );

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    const normalized = clampPhotoFrame(initialFrame ?? { zoom: 1, offsetX: 0, offsetY: 0 });
    setZoom(normalized.zoom);
    setOffset({
      x: normalized.offsetX * PREVIEW_SIZE,
      y: normalized.offsetY * PREVIEW_SIZE,
    });
    prevZoomRef.current = normalized.zoom;
  }, [initialFrame]);

  // Ref for current pan offset so the native pointer handler reads the latest value
  const displayOffsetRef = useRef(displayOffset);
  displayOffsetRef.current = displayOffset;

  // Native pointerdown on the container (bypasses React/Radix) and add document listeners
  // synchronously so we don't miss the first pointermove.
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

  const handleSave = useCallback(async () => {
    const hasSource = file || existingPhotoUrl;
    if (!hasSource || !authUserId || !imageLoaded) return;

    setSaving(true);
    try {
      let photoUrlToSave = existingPhotoUrl ?? "";
      const supabase = createClient();
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${authUserId}/${Date.now()}.${ext}`;

        // Upload the original file as-is to preserve original dimensions/aspect ratio.
        const { error } = await supabase.storage.from("avatars").upload(path, file, {
          upsert: true,
        });

        if (error) {
          toast.error(error.message || "Upload failed.");
          return;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        photoUrlToSave = data.publicUrl;
      }

      if (!photoUrlToSave) {
        toast.error("No photo source available.");
        return;
      }

      const photoFrame = clampPhotoFrame({
        zoom,
        offsetX: offset.x / PREVIEW_SIZE,
        offsetY: offset.y / PREVIEW_SIZE,
      });

      const result = await updateSpeakerPhoto(photoUrlToSave, photoFrame);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      onSaved(photoUrlToSave, photoFrame);
      toast.success("Photo updated.");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }, [
    file,
    existingPhotoUrl,
    authUserId,
    imageLoaded,
    zoom,
    offset,
    onSaved,
    onOpenChange,
  ]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !saving) {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setImageLoaded(false);
        prevZoomRef.current = 1;
      }
      onOpenChange(next);
    },
    [onOpenChange, saving]
  );

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

  // Reset crop state when a new file is provided so the modal starts fresh
  useEffect(() => {
    if (file) {
      setImageLoaded(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      prevZoomRef.current = 1;
    }
  }, [file]);

  const imageSrc = imageUrl ?? existingPhotoUrl ?? "";
  const hasImage = Boolean(imageSrc);

  // Reset load state when source changes (e.g. open for edit after upload)
  useEffect(() => {
    if (!imageSrc) {
      setImageLoaded(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      prevZoomRef.current = 1;
    }
  }, [imageSrc]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!saving} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1B365D]">Adjust your photo</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Drag to position and use the slider to zoom. The circle shows how it will appear.
        </p>

        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden rounded-full border-2 border-[#e2e8f0] bg-slate-100 select-none touch-none"
          style={{
            width: PREVIEW_SIZE,
            height: PREVIEW_SIZE,
            cursor: imageLoaded ? (dragStart ? "grabbing" : "grab") : "default",
            touchAction: "none",
          }}
        >
          {hasImage && (
            <img
              key={imageSrc}
              src={imageSrc}
              alt="Crop preview"
              crossOrigin={existingPhotoUrl ? "anonymous" : undefined}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
              style={{
                transform: `translate(${-displayOffset.x}px, ${-displayOffset.y}px) scale(${zoom})`,
                transformOrigin: "center",
              }}
              draggable={false}
              onLoad={handleImageLoad}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#1B365D]">Zoom</label>
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
            className="border-[#e2e8f0] text-[#1B365D]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!imageLoaded || saving}
            className="bg-[#1B365D] hover:bg-[#1B365D]/90 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save photo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
