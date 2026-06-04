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
  publication_permission: PublicationPermission;
  status: PropertyStatus;
  published_at: string | null;
  updated_at: string;
  property_sources?: Pick<PropertySource, "name" | "website_url"> | null;
  property_images?: PropertyImage[];
};

export type PropertyFilters = {
  prefecture?: string;
  maxPrice?: number;
  propertyType?: PropertyType;
};
