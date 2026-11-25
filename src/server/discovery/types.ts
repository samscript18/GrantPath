import type { ScholarshipData } from "@/server/scholarships/schema";
export const ADAPTER_VERSION = "official-directory-2.0.0";
export const SCHEMA_VERSION = "scholarship-2.0.0";
export const POLICY_VERSION = "publication-1.0.0";
export type DetailMapping = {
  key: string;
  provider: { key: string; name: string; url: string; countryCode?: string };
  programme: string;
  url: string;
  cycle: string;
  cycleConfirmed: boolean;
  heading: string;
  data: ScholarshipData;
  // Exact reviewed source text, grouped by field, never AI confidence.
  passages: Record<string, string>;
  // Full relevant section text hashes detect added/removed unsupported conditions.
  sections?: { selector: string; hash: string }[];
  requirementsComplete: boolean;
  deadlineSelector?: string;
  levelSelector?: string;
  levelRuleId?: string;
  supportPages?: string[];
  supportSections?: { url: string; selector: string; hash: string }[];
  // Reviewed CMS defect only; never expands the network URL allowlist.
  reviewedCanonicalFallback?: string;
  contentSelector?: string;
  preserveHeaders?: string;
  // Code-reviewed non-award widgets only; never inferred from page content.
  ignoredSelectors?: string[];
  applicationWindow?: import("./application-windows").WindowInput & { url?: string };
};
export type DirectoryDefinition = {
  id: string;
  url: string;
  heading: string;
  linkSelector: string;
  detailLinkWrapper?: { host: string; path: string; queryKey: string };
  allowedDetails: {
    host: string;
    pathPrefix: string;
    exact?: boolean;
    query?: Record<string, string>;
  }[];
  pagination?: { selector: string; pathPrefix: string; queryKeys: string[] };
  mappings: DetailMapping[];
  restrictToSupportedDetails?: boolean;
  // Identifiers must resolve in the code-reviewed adapter registry, never module paths.
  dynamicDetail?: string;
  directoryAdapter?: string;
  detailFormat?: "html" | "pdf";
  directoryFormat?: "html" | "json";
  resumePagination?: boolean;
  // Reviewed templates with separately labelled opening and closing dates.
  discoverApplicationRounds?: boolean;
  review?: { reviewedAt: string; rationale: string; limitations: string[] };
  bounds?: { pages: number; candidates: number };
};
export type Validation = {
  codes: string[];
  structure: boolean;
  matchedFields: string[];
  requirementsComplete: boolean;
  cycleConfirmed: boolean;
};
