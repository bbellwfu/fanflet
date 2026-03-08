export type {
  IntegrationAdapter,
  PlatformId,
  ConnectionConfig,
  PushContext,
  PushResult,
  HealthCheckResult,
} from "./types";

export { zapierAdapter } from "./zapier";
export { getAdapter, availableAdapters } from "./registry";
