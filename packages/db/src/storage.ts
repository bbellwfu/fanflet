/**
 * File storage utilities — type allowlists, quota helpers, and formatters.
 * Shared across web app server actions, API routes, and UI components.
 */

export const STORAGE_BUCKET = "file-uploads";
export const PUBLIC_BUCKET = "resources";

/** Extension → MIME type mapping for accepted file uploads. */
export const ALLOWED_FILE_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_FILE_TYPES);
export const ALLOWED_MIME_TYPES = [...new Set(Object.values(ALLOWED_FILE_TYPES))];

/** Default quota values when plan limits are missing. */
const QUOTA_DEFAULTS = {
  storage_mb: 100,
  max_file_mb: 10,
  signed_url_minutes: 15,
} as const;

export interface StorageQuota {
  storageMb: number;
  maxFileMb: number;
  signedUrlMinutes: number;
  storageBytes: number;
  maxFileBytes: number;
}

/** Extract storage quota from plan limits, with safe defaults. */
export function getStorageQuota(
  limits: Record<string, number> | null | undefined
): StorageQuota {
  const storageMb = limits?.storage_mb ?? QUOTA_DEFAULTS.storage_mb;
  const maxFileMb = limits?.max_file_mb ?? QUOTA_DEFAULTS.max_file_mb;
  const signedUrlMinutes =
    limits?.signed_url_minutes ?? QUOTA_DEFAULTS.signed_url_minutes;
  return {
    storageMb,
    maxFileMb,
    signedUrlMinutes,
    storageBytes: storageMb * 1024 * 1024,
    maxFileBytes: maxFileMb * 1024 * 1024,
  };
}

/** Format byte count to human-readable string (e.g., "23.5 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Check if a filename has an allowed extension. */
export function isAllowedFileType(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ext !== null && ext in ALLOWED_FILE_TYPES;
}

/** Extract the lowercase file extension including the dot (e.g., ".pdf"). */
export function getFileExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return null;
  return filename.slice(lastDot).toLowerCase();
}

/** Get a display-friendly file type label from extension or MIME type. */
export function getFileTypeLabel(filenameOrType: string): string {
  const ext = getFileExtension(filenameOrType);
  if (ext) {
    const labels: Record<string, string> = {
      ".pdf": "PDF",
      ".pptx": "PowerPoint",
      ".ppt": "PowerPoint",
      ".docx": "Word",
      ".doc": "Word",
      ".xlsx": "Excel",
      ".xls": "Excel",
      ".csv": "CSV",
      ".txt": "Text",
      ".zip": "ZIP",
      ".png": "PNG",
      ".jpg": "JPEG",
      ".jpeg": "JPEG",
      ".gif": "GIF",
      ".webp": "WebP",
      ".svg": "SVG",
    };
    return labels[ext] ?? ext.slice(1).toUpperCase();
  }
  // Fall back to MIME-based labels
  if (filenameOrType.includes("pdf")) return "PDF";
  if (filenameOrType.includes("presentation") || filenameOrType.includes("powerpoint"))
    return "PowerPoint";
  if (filenameOrType.includes("word") || filenameOrType.includes("document"))
    return "Word";
  if (filenameOrType.includes("spreadsheet") || filenameOrType.includes("excel"))
    return "Excel";
  return "File";
}

/**
 * Build the storage path for a file upload.
 * Convention: {speaker_id}/{library_item_id}/{safe_filename}
 */
export function buildStoragePath(
  speakerId: string,
  libraryItemId: string,
  originalFilename: string
): string {
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  return `${speakerId}/${libraryItemId}/${safeName}`;
}

/**
 * Extract the original filename from a storage path.
 * Strips the timestamp-random prefix added by buildStoragePath.
 */
export function extractFilename(storagePath: string): string {
  const parts = storagePath.split("/");
  const filename = parts[parts.length - 1];
  // Pattern: {timestamp}-{random}-{original_filename}
  const match = filename.match(/^\d+-[a-z0-9]+-(.+)$/);
  return match ? match[1].replace(/_/g, " ") : filename;
}
