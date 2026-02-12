export type CityMode = "auto" | "list" | "customField" | "label";

export type CityResolutionMode = Exclude<CityMode, "auto">;

export type DueCategory = "overdue" | "upcoming" | "noDue" | "none";

export interface DashboardStats {
  totalDesigns: number;
  overdueDesigns: number;
  upcomingDesigns: number;
  noDueDesigns: number;
  undefinedDesigns: number;
}

export interface LabelCounter {
  key: string;
  name: string;
  color: string | null;
  count: number;
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string | null;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
}

export interface TrelloAttachment {
  id: string;
  name: string;
  url: string;
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  due: string | null;
  dueComplete: boolean;
  idMember: string | null;
  pos: number;
}

export interface TrelloChecklist {
  id: string;
  name: string;
  items: TrelloCheckItem[];
}

export type TrelloCustomFieldScalar = string | number | boolean | null;

export interface TrelloCustomFieldValue {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  value: TrelloCustomFieldScalar;
  rawValue: unknown;
}

export interface TrelloDesign {
  id: string;
  name: string;
  desc: string;
  shortUrl: string;
  url: string;
  coverImageUrl: string | null;
  idList: string;
  listName: string;
  city: string;
  citySource: CityResolutionMode;
  due: string | null;
  dueComplete: boolean;
  dueCategory: DueCategory;
  isUndefined: boolean;
  labels: TrelloLabel[];
  designers: string[];
  idMembers: string[];
  members: TrelloMember[];
  attachments: TrelloAttachment[];
  checklists: TrelloChecklist[];
  customFields: TrelloCustomFieldValue[];
  dateLastActivity: string | null;
  createdAt: string | null;
  createdAtSource: "cardId" | "unknown";
}

export interface CitySummary extends DashboardStats {
  city: string;
  source: CityResolutionMode;
  labelCounters: LabelCounter[];
  designs: TrelloDesign[];
}

export interface TrelloDashboardData {
  boardId: string;
  fetchedAt: string;
  cityModeResolved: CityResolutionMode;
  cityFieldName: string;
  upcomingDays: number;
  totals: DashboardStats;
  labelCounters: LabelCounter[];
  cities: CitySummary[];
}
