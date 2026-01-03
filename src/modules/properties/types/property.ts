// Property Types
export interface Property {
  id: string;
  organization_id: string;
  name: string;
  type: PropertyType;
  sub_type?: string;
  
  // Address
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  
  // Geolocation
  latitude?: number;
  longitude?: number;
  location?: any;
  
  // Physical Details
  year_built?: number;
  total_units: number;
  total_square_feet?: number;
  lot_size_sqft?: number;
  stories?: number;
  parking_spaces?: number;
  
  // Features
  features?: PropertyFeatures;
  
  // Management
  manager_id?: string;
  management_company?: string;
  management_fee_percent?: number;
  
  // Financial
  purchase_price?: number;
  purchase_date?: string;
  current_value?: number;
  tax_assessment?: number;
  insurance_premium?: number;
  property_tax?: number;
  hoa_fee?: number;
  
  // Status
  status: PropertyStatus;
  listing_status?: string;
  
  // Marketing
  marketing_description?: string;
  marketing_title?: string;
  photos: PropertyPhoto[];
  virtual_tour_url?: string;
  video_tour_url?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PropertyFeatures {
  amenities: string[];
  utilities_included: string[];
  pet_policy: 'no_pets' | 'cats_allowed' | 'dogs_allowed' | 'cats_dogs_allowed';
  smoking: boolean;
  furnished: boolean;
  appliances?: string[];
  flooring?: string[];
  heating?: string;
  cooling?: string;
  balcony?: boolean;
  patio?: boolean;
  storage?: boolean;
}

export interface PropertyPhoto {
  url: string;
  caption?: string;
  is_primary: boolean;
  order_index: number;
}

export type PropertyType = 
  | 'single_family'
  | 'multi_family'
  | 'apartment'
  | 'condo'
  | 'townhouse'
  | 'retail'
  | 'commercial'
  | 'office'
  | 'warehouse'
  | 'storage'
  | 'other';

export type PropertyStatus = 
  | 'active'
  | 'inactive'
  | 'maintenance'
  | 'archived';

// Filter Types
export interface PropertyFilters {
  search?: string;
  types?: PropertyType[];
  statuses?: PropertyStatus[];
  unitRange?: UnitRange | null;
}

export interface UnitRange {
  label: string;
  min: number | null;
  max: number | null;
}

// Sort Types
export type SortField = 'name' | 'type' | 'total_units' | 'created_at';
export type SortDirection = 'asc' | 'desc';

// Unit Types
export interface Unit {
  id: string;
  property_id: string;
  organization_id: string;
  
  // Identification
  unit_number: string;
  building_name?: string;
  floor?: number;
  
  // Physical Details
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  
  // Features
  features?: UnitFeatures;
  
  // Rental Details
  target_rent?: number;
  current_rent?: number;
  deposit_amount?: number;
  
  // Status
  status: UnitStatus;
  availability_status: UnitAvailability;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface UnitFeatures {
  appliances: string[];
  flooring: string[];
  heating?: string;
  cooling?: string;
  balcony?: boolean;
  patio?: boolean;
  storage?: boolean;
}

export type UnitStatus = 
  | 'active'
  | 'inactive'
  | 'maintenance'
  | 'archived';

export type UnitAvailability = 
  | 'available'
  | 'occupied'
  | 'maintenance'
  | 'pending';

// Service Response Types
export interface PropertyServiceResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PropertyStats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  archived: number;
  total_units: number;
  active_units: number;
  available_units: number;
}

// Property Form Types
export interface PropertyFormData {
  name: string;
  type: PropertyType;
  sub_type?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  year_built?: number;
  total_units: number;
  total_square_feet?: number;
  lot_size_sqft?: number;
  stories?: number;
  parking_spaces?: number;
  features?: PropertyFeatures;
  management_company?: string;
  management_fee_percent?: number;
  purchase_price?: number;
  purchase_date?: string;
  current_value?: number;
  tax_assessment?: number;
  insurance_premium?: number;
  property_tax?: number;
  hoa_fee?: number;
  marketing_description?: string;
  marketing_title?: string;
  photos?: PropertyPhoto[];
}

// Action Types for Row Actions
export type PropertyAction = 
  | 'edit'
  | 'delete'
  | 'archive'
  | 'view_units'
  | 'duplicate';

// Constants
export const PROPERTY_TYPE_OPTIONS = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhome' },
  { value: 'retail', label: 'Retail' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'office', label: 'Office' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'archived', label: 'Archived' },
] as const;

export const UNIT_RANGE_OPTIONS = [
  { label: '1 Unit', min: 1, max: 1 },
  { label: '2-5 Units', min: 2, max: 5 },
  { label: '6-10 Units', min: 6, max: 10 },
  { label: '11-25 Units', min: 11, max: 25 },
  { label: '26+ Units', min: 26, max: null },
] as const;

// Wizard-specific types
export interface PropertyTypeOption {
  id: string;
  category: 'residential' | 'commercial';
  title: string;
  description: string[];
  icon: string;
}

export interface PropertyAddress {
  streetAddress: string;
  unitAptSuite: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface UnitDetails {
  totalUnits: number;
  unitTypes: string[];
  squareFootage: number;
  floors: number;
  leaseTypes: string[];
  rentRanges: {
    min: number;
    max: number;
  };
}

export interface BankAccount {
  id: string;
  nickname: string;
  bankName: string;
  accountType: 'checking' | 'savings' | 'money_market';
  routingNumber: string;
  accountNumber: string;
  isPrimary: boolean;
}

export interface OwnershipInfo {
  ownerType: 'individual' | 'llc' | 'corporation' | 'partnership' | 'trust';
  legalName: string;
  contactInfo: {
    email: string;
    phone: string;
    address?: PropertyAddress;
  };
  ownershipPercentage: number;
}

export interface PropertyData {
  type: PropertyTypeOption | null;
  address: PropertyAddress;
  unitDetails: UnitDetails;
  bankAccounts: BankAccount[];
  ownership: OwnershipInfo;
}