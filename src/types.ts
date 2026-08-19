/**
 * TypeScript interfaces mirroring the schemas documented in the Cisco IQ
 * "Assets" and "Assessments" API contracts (OpenAPI 3.1.0, API version 0.1.0,
 * beta/public preview as of 2026-07-24). Field comments are taken directly
 * from that documentation. Dates are Unix epoch milliseconds (UTC).
 */

export interface ErrorBody {
  message: string;
  trackingId?: string;
}

export interface AssetLifecycle {
  assetId: string;
  serialNumber?: string | null;
  productId?: string | null;
  milestoneType?: string | null;
  currentMilestone?: string | null;
  currentMilestoneDate?: number | null;
  nextMilestone?: string | null;
  nextMilestoneDate?: number | null;
  lastDateOfSupport?: number | null;
  bulletinReference?: string | null;
  bulletinTitle?: string | null;
  bulletinUrl?: string | null;
  endOfLifeAnnouncementDate?: number | null;
  endOfSaleDate?: number | null;
  lastShipDate?: number | null;
  endOfRoutineFailureAnalysisDate?: number | null;
  endOfNewServiceAttachmentDate?: number | null;
  endOfServiceContractRenewalDate?: number | null;
  endOfSoftwareMaintenance?: number | null;
  endOfVulnerabilitySecuritySupport?: number | null;
}

export interface AssetRelationships {
  assetId: string;
  parentAssetId?: string | null;
  relationshipType?: string | null;
  equipmentType?: string | null;
  productType?: string | null;
  productId?: string | null;
  serialNumber?: string | null;
}

export interface Assets {
  assetId?: string | null;
  customerId?: string | null;
  serialNumber?: string | null;
  productId?: string | null;
  productFamily?: string | null;
  coverageStatus?: string | null;
  currentHardwareMilestone?: string | null;
  currentHardwareMilestoneDate?: number | null;
  nextHardwareMilestone?: string | null;
  nextHardwareMilestoneDate?: number | null;
  hardwareLastDateOfSupport?: number | null;
  currentSoftwareMilestone?: string | null;
  currentSoftwareMilestoneDate?: number | null;
  nextSoftwareMilestone?: string | null;
  nextSoftwareMilestoneDate?: number | null;
  softwareLastDateOfSupport?: number | null;
  productType?: string | null;
  equipmentType?: string | null;
  productDescription?: string | null;
  hostname?: string | null;
  ipAddress?: string | null;
  softwareVersion?: string | null;
  softwareType?: string | null;
  role?: string | null;
  importance?: string | null;
  partnerName?: string | null;
  location?: string | null;
  supportTier?: string | null;
  supportType?: string | null;
  contractNumber?: string | null;
  coverageEndDate?: number | null;
  salesOrderNumber?: string | null;
  warrantyType?: string | null;
  warrantyEndDate?: number | null;
  lastSignalDate?: number | null;
  telemetryStatus?: string | null;
  dataSource?: string | null;
  securityAdvisoryCount?: number | null;
  endOfSoftwareMaintenance?: number | null;
  tags?: (string | null)[] | null;
  lastSignalType?: string | null;
  shipDate?: number | null;
}

export interface Contracts {
  customerId: string;
  contractNumber: string;
  contractStatus?: string | null;
  serviceLevel?: string | null;
  supportTier?: string | null;
  contractStartDate?: number | null;
  contractEndDate?: number | null;
  supportType?: string | null;
  serviceLevelAgreementDescription?: string | null;
  partnerName?: string | null;
  coveredAssetCount?: number | null;
}

export interface AffectedAssets {
  assetId?: string | null;
  customerId?: string | null;
  serialNumber?: string | null;
  productId?: string | null;
  productFamily?: string | null;
  coverageStatus?: string | null;
  currentHardwareMilestone?: string | null;
  nextHardwareMilestone?: string | null;
  nextHardwareMilestoneDate?: number | null;
  hardwareLastDateOfSupport?: number | null;
  currentSoftwareMilestone?: string | null;
  nextSoftwareMilestone?: string | null;
  nextSoftwareMilestoneDate?: number | null;
  softwareLastDateOfSupport?: number | null;
  productType?: string | null;
  equipmentType?: string | null;
  hostname?: string | null;
  ipAddress?: string | null;
  softwareVersion?: string | null;
  softwareType?: string | null;
  partnerName?: string | null;
  location?: string | null;
  supportTier?: string | null;
  supportType?: string | null;
  contractNumber?: string | null;
  coverageEndDate?: number | null;
  lastSignalDate?: number | null;
  telemetryStatus?: string | null;
  dataSource?: string | null;
  endOfSoftwareMaintenance?: number | null;
  lastSignalType?: string | null;
  shipDate?: number | null;
  assetType?: string | null;
  bulletinId?: number | null;
  vulnerabilityStatus?: string | null;
  vulnerabilityReasons?: (string | null)[] | null;
}

export interface FieldNotices {
  fieldNoticeId: number;
  title: string;
  url?: string | null;
  firstPublished: number;
  fieldNoticeLastUpdateDate: number;
  problemDescription?: string | null;
  description?: string | null;
  additionalNotes?: string | null;
  workaround?: string | null;
  status?: string | null;
  affectedAssetsCount?: number | null;
  potentiallyAffectedAssetsCount: number;
  impact: string;
  lastPublished?: number | null;
  ciscoBugIds?: (string | null)[] | null;
  vulnerabilityStatus?: string | null;
  vulnerabilityReasons?: (string | null)[] | null;
}

export interface SecurityAdvisories {
  psirtId: number;
  advisoryId: string;
  alertStatusCd?: string | null;
  createdAt?: number | null;
  cveIds?: (string | null)[] | null;
  cvssScore?: number | null;
  cvssTemporalScore?: number | null;
  ciscoBugIds?: (string | null)[] | null;
  additionalNotes?: string | null;
  title?: string | null;
  url?: string | null;
  firstPublished?: number | null;
  lastPublished?: number | null;
  psirtLastUpdateDate?: number | null;
  version?: string | null;
  impact?: string | null;
  description?: string | null;
  affectedAssetsCount?: string | null;
  potentiallyAffectedAssetsCount?: string | null;
  vulnerabilityStatus?: string | null;
  vulnerabilityReasons?: (string | null)[] | null;
}

/** Generic shape of every `list*` collection response: `{ items: T[] }` plus a `Link` pagination header. */
export interface CollectionResponse<T> {
  items: T[];
}

/** Parsed RFC 8288 `Link` header relations Cisco IQ documents (`next`/`prev` only; no `first`/`last`). */
export interface LinkRelations {
  next?: string;
  prev?: string;
}

/** Parsed rate-limit response headers, when present (all optional per the documented contract). */
export interface RateLimitInfo {
  principalSecondLimit?: number;
  principalSecondRemaining?: number;
  principalSecondResetSeconds?: number;
  principalDayLimit?: number;
  principalDayRemaining?: number;
  principalDayResetSeconds?: number;
  accountSecondLimit?: number;
  accountSecondRemaining?: number;
  accountSecondResetSeconds?: number;
  accountDayLimit?: number;
  accountDayRemaining?: number;
  accountDayResetSeconds?: number;
}
