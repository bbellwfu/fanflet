import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Ensures a URL string has an https:// protocol prefix.
 * Handles common user inputs like "example.com" or "www.example.com".
 * Returns null/undefined passthrough for empty values.
 */
export function ensureUrl(url: string | null | undefined): string | null {
    if (!url || !url.trim()) return null
    const trimmed = url.trim()
    // Already has a protocol
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    // Has some other protocol (mailto:, ftp:, etc.) — leave as-is
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
    // No protocol — prepend https://
    return `https://${trimmed}`
}
