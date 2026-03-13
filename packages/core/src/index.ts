export type {
  ServiceResult,
  ServiceError,
  ErrorCode,
  SpeakerEntitlements,
  SponsorEntitlements,
  UserScopedClient,
} from "./types";
export { ok, err } from "./types";

export {
  createFanflet,
  publishFanflet,
  unpublishFanflet,
  updateFanfletDetails,
  cloneFanflet,
  getFanflet,
  listFanflets,
} from "./fanflets";
export type { CreateFanfletInput, UpdateFanfletInput } from "./fanflets";

export {
  addResourceBlock,
  updateResourceBlock,
  deleteResourceBlock,
  reorderBlock,
  addLibraryBlockToFanflet,
} from "./resource-blocks";
export type { AddResourceBlockInput, UpdateResourceBlockInput } from "./resource-blocks";

export {
  listSubscribers,
  getSubscriberCount,
  deleteSubscriber,
  deleteSubscribers,
} from "./subscribers";
export type { SubscriberRow } from "./subscribers";

export {
  getDashboardOverview,
  getFanfletAnalytics,
  getResourceRankings,
  getSpeakerKPIs,
  getSpeakerDeviceBreakdown,
  getSpeakerReferrerBreakdown,
  getSpeakerResourceTypePerformance,
  getSpeakerActivityHeatmap,
  getSpeakerConversionFunnel,
  getSponsorKPIs,
  getSponsorFanfletPerformance,
  getSponsorResourceTypePerformance,
  exportSpeakerAnalyticsCSV,
  exportSponsorAnalyticsCSV,
} from "./analytics";
export type {
  FanfletAnalytics,
  ResourceRanking,
  DashboardOverview,
  DateRange,
  SpeakerKPIs,
  SponsorKPIs,
  DeviceBreakdown,
  ReferrerBreakdown,
  ResourceTypePerformance,
  SponsorFanfletPerformance,
  HeatmapCell,
  ConversionFunnelStep,
} from "./analytics";

export {
  requestSponsorConnection,
  endSpeakerSponsorConnection,
  respondToConnection,
  endSponsorConnection,
  listSponsorConnections,
} from "./sponsor-connections";

export {
  getSponsorProfile,
  updateSponsorProfile,
  checkSponsorSlugAvailability,
  updateSponsorLogo,
  removeSponsorLogo,
  getSponsorLeads,
} from "./sponsor-profile";
export type { UpdateSponsorProfileInput } from "./sponsor-profile";

export type {
  DomainEvent,
  LeadCapturedEvent,
  SubscriberAddedEvent,
  ConnectionAcceptedEvent,
  ConnectionDeclinedEvent,
  ConnectionEndedEvent,
  FanfletPublishedEvent,
  FanfletCreatedEvent,
  ReportViewedEvent,
  EventBus,
} from "./events";
export { nullEventBus } from "./events";

export type {
  IntegrationAdapter,
  PlatformId,
  ConnectionConfig,
  PushContext,
  PushResult,
  HealthCheckResult,
} from "./integrations";
export { zapierAdapter, getAdapter, availableAdapters } from "./integrations";
export { rewriteTechnicalText } from "./rewrite-ai";
export { logAiUsage, calculateAiCost } from "./ai-usage";
export type { AiUsageData, AiUsageLogEntry } from "./ai-usage";
export {
  generateDemoContent,
  generateSponsorDemoContent,
} from "./demo-ai";
export type {
  DemoProspectInput,
  SponsorDemoProspectInput,
  GeneratedDemoPayload,
  GeneratedSponsorDemoPayload,
} from "./demo-ai";
