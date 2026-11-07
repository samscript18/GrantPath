import type { ScholarshipData } from "@/server/scholarships/schema";
export const ADAPTER_VERSION = "official-directory-1.0.0";
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
};
export type DirectoryDefinition = {
  id: string;
  url: string;
  heading: string;
  linkSelector: string;
  allowedDetails: { host: string; pathPrefix: string }[];
  pagination?: { selector: string; pathPrefix: string; queryKeys: string[] };
  mappings: DetailMapping[];
  dynamicDetail?: "makerere-announcement-1";
};
export type Validation = {
  codes: string[];
  structure: boolean;
  matchedFields: string[];
  requirementsComplete: boolean;
  cycleConfirmed: boolean;
};
