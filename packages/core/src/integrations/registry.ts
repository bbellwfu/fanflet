import type { IntegrationAdapter, PlatformId } from "./types";
import { zapierAdapter } from "./zapier";

const adapters: Partial<Record<PlatformId, IntegrationAdapter>> = {
  zapier: zapierAdapter,
};

/**
 * Retrieve the adapter for a given platform, or null if not yet implemented.
 */
export function getAdapter(platform: PlatformId): IntegrationAdapter | null {
  return adapters[platform] ?? null;
}

/**
 * List all platforms that have a working adapter.
 */
export function availableAdapters(): PlatformId[] {
  return Object.keys(adapters) as PlatformId[];
}
