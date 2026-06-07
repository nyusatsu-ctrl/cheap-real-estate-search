export type PropertyStatus = "draft" | "published" | "sold";
export type PublicationPermission = "permitted" | "pending" | "denied" | "unknown";

export type PropertyType =
  | "land"
  | "old_house_land"
  | "detached_house"
  | "warehouse"
  | "store"
  | "other";

export type PropertySource = {
  id: string;
  name: string;
  website_url: string | null;
};

export type PropertyImage = {
  id: string;
  property_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
};

export type Property = {
  id: string;
  title: string;
  property_type: PropertyType;
  price_yen: number;
  prefecture: string;
  city: string;
  address_display: string;
  land_area_m2: number | null;
  building_area_m2: number | null;
  construction_year: number | null;
  latitude: number | null;
  longitude: number | null;
  source_id: string | null;
  source_url: string;
  transaction_type?: string | null;
  listed_at?: string | null;
  source_updated_at?: string | null;
  scraped_at?: string | null;
  price_band?: string | null;
  risk_tags?: string[];
  remarks?: string | null;
  publication_permission: PublicationPermission;
  status: PropertyStatus;
  published_at: string | null;
  updated_at: string;
  property_sources?: Pick<PropertySource, "name" | "website_url"> | null;
  property_images?: PropertyImage[];
};

export type PropertyFilters = {
  prefecture?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyType;
};

export type TenderType = "goods" | "service" | "open_counter" | "unified_qualification";
export type TenderStatus = "draft" | "published" | "archived";
export type TenderSourceOrganizationType =
  | "national_government"
  | "ministry"
  | "defense_ministry"
  | "defense_equipment_agency"
  | "ground_self_defense_force"
  | "maritime_self_defense_force"
  | "air_self_defense_force"
  | "defense_bureau"
  | "defense_school"
  | "defense_hospital"
  | "defense_research"
  | "other_defense"
  | "local_branch"
  | "prefecture"
  | "designated_city"
  | "municipality"
  | "independent_agency"
  | "national_university"
  | "hospital_organization"
  | "other";
export type TenderSourceFormat = "html" | "pdf" | "excel" | "word" | "search_form" | "javascript" | "mixed";
export type TenderCrawlerType =
  | "p_portal"
  | "kkj_portal"
  | "generic_html"
  | "generic_pdf_list"
  | "defense_mod"
  | "defense_unit"
  | "ministry_page"
  | "local_government"
  | "e_procurement_system"
  | "manual_only";
export type TenderCrawlerDifficulty = "low" | "medium" | "high";
export type TenderCrawlPriority = "A" | "B" | "C" | "D";
export type TenderCrawlFrequency = "daily" | "weekly" | "manual";
export type TenderCandidateType =
  | "goods"
  | "services"
  | "open_counter"
  | "small_discretionary"
  | "qualification_required"
  | "construction"
  | "unknown";
export type TenderCandidateReviewStatus = "pending" | "approved" | "rejected" | "duplicate";
export type TenderCrawlLogStatus = "success" | "partial_success" | "failed";
export type FavoriteTenderStatus =
  | "unchecked"
  | "reviewing"
  | "preparing_quote"
  | "planning"
  | "declined"
  | "bid_submitted"
  | "won"
  | "lost";

export type TenderSource = {
  id: string;
  name: string;
  url: string;
  source_type: string;
  source_name?: string | null;
  organization_type?: TenderSourceOrganizationType | null;
  region?: string | null;
  prefecture?: string | null;
  base_url?: string | null;
  tender_list_url?: string | null;
  open_counter_url?: string | null;
  result_url?: string | null;
  target_types?: string[];
  source_format?: TenderSourceFormat | null;
  crawler_type?: TenderCrawlerType | null;
  crawler_difficulty?: TenderCrawlerDifficulty | null;
  crawl_priority?: TenderCrawlPriority | null;
  is_active: boolean;
  crawl_frequency: TenderCrawlFrequency | string;
  last_crawled_at: string | null;
  last_success_at?: string | null;
  last_error_at?: string | null;
  last_error_message?: string | null;
  robots_note?: string | null;
  terms_note?: string | null;
  admin_note?: string | null;
  crawl_ready?: boolean | null;
  tender_count?: number | null;
  latest_error?: string | null;
  created_at: string;
  updated_at: string;
};

export type Tender = {
  id: string;
  source_id?: string | null;
  source_name?: string | null;
  organization_type?: string | null;
  title: string;
  agency_name: string;
  tender_type: TenderType;
  region: string;
  prefecture: string;
  base_location?: string | null;
  published_at: string | null;
  deadline_at: string | null;
  bid_at: string | null;
  qualification_required: boolean;
  required_qualification: string | null;
  source_url: string;
  pdf_url: string | null;
  attachments?: TenderAttachment[] | null;
  raw_text?: string | null;
  detail_memo: string | null;
  original_label?: string | null;
  is_admin_verified?: boolean | null;
  is_new: boolean;
  is_deadline_soon: boolean;
  is_defense: boolean;
  status: TenderStatus;
  fetched_at: string | null;
  created_at: string;
  updated_at: string;
  tender_sources?: Pick<TenderSource, "name" | "url" | "source_name" | "organization_type" | "base_url"> | null;
};

export type TenderCandidate = {
  id: string;
  source_id: string | null;
  source_name?: string | null;
  organization_type?: string | null;
  title: string;
  agency_name: string;
  tender_type: TenderCandidateType;
  original_label: string | null;
  region: string;
  prefecture: string;
  base_location?: string | null;
  published_at: string | null;
  deadline_at: string | null;
  bid_at: string | null;
  qualification_required: boolean;
  required_qualification: string | null;
  source_url: string;
  pdf_url: string | null;
  attachments?: TenderAttachment[] | null;
  raw_text: string | null;
  ai_summary: string | null;
  classification_confidence: number | null;
  duplicate_candidate_id: string | null;
  review_status: TenderCandidateReviewStatus;
  admin_note: string | null;
  fetched_at: string | null;
  created_at: string;
  updated_at: string;
  tender_sources?: Pick<TenderSource, "name" | "source_name" | "organization_type" | "base_url"> | null;
};

export type TenderAttachment = {
  title: string;
  url: string;
  file_type: "html" | "pdf" | "excel" | "word" | "unknown";
  label: string | null;
  source_text: string | null;
};

export type TenderCrawlLog = {
  id: string;
  source_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: TenderCrawlLogStatus;
  fetched_count: number;
  created_count: number;
  duplicate_count: number;
  skipped_count: number;
  error_message: string | null;
  created_at: string;
};

export type TenderFilters = {
  region?: string;
  prefecture?: string;
  tenderType?: TenderType;
  qualification?: "required" | "not_required";
  defenseOnly?: boolean;
  openCounterOnly?: boolean;
  keyword?: string;
  sort?: "new" | "deadline";
};

export type UserFavoriteTender = {
  id: string;
  user_id: string;
  tender_id: string;
  memo: string | null;
  status: FavoriteTenderStatus;
  created_at: string;
  updated_at: string;
  tenders?: Tender | null;
};

export type ScrivenerInquiry = {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  prefecture: string;
  business_type: string;
  qualification_status: string;
  request_type: string;
  message: string;
  consent_privacy: boolean;
  consent_share_to_scrivener: boolean;
  assigned_scrivener_id: string | null;
  status: string;
  admin_note: string | null;
  shared_at: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
};
