/**
 * Unified Authentication Types
 * Defines user roles and permissions across all portals
 */

/**
 * User roles in the system
 */
export type UserRole = 'property_manager' | 'tenant' | 'vendor' | 'owner';

/**
 * Base user interface
 */
export interface BaseUser {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone_number?: string;
  profile_image_url?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

/**
 * Property Manager specific fields
 */
export interface PropertyManager extends BaseUser {
  role: 'property_manager';
  company_name?: string;
  license_number?: string;
  managed_properties_count?: number;
}

/**
 * Tenant specific fields (from tenantAuthService)
 */
export interface Tenant extends BaseUser {
  role: 'tenant';
  lease_id?: string;
  unit_id?: string;
  property_id?: string;
  move_in_date?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  rent_amount?: number;
  portal_access: boolean;
  onboarding_completed: boolean;
  communication_preferences?: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
  };
}

/**
 * Vendor/Contractor specific fields
 */
export interface Vendor extends BaseUser {
  role: 'vendor';
  company_name: string;
  business_license?: string;
  insurance_policy_number?: string;
  insurance_expiry_date?: string;
  specialty: 'plumbing' | 'electrical' | 'hvac' | 'general' | 'landscaping' | 'cleaning' | 'other';
  service_areas?: string[]; // Property IDs they service
  hourly_rate?: number;
  rating?: number;
  completed_jobs_count?: number;
  active_jobs_count?: number;
  portal_access: boolean;
}

/**
 * Property Owner specific fields
 */
export interface Owner extends BaseUser {
  role: 'owner';
  owned_properties: string[]; // Property IDs
  total_units?: number;
  portfolio_value?: number;
  preferred_contact_method?: 'email' | 'phone' | 'sms';
  portal_access: boolean;
  financial_reporting_preference?: 'monthly' | 'quarterly' | 'annual';
}

/**
 * Union type for all user types
 */
export type User = PropertyManager | Tenant | Vendor | Owner;

/**
 * Auth response
 */
export interface AuthResponse {
  success: boolean;
  user?: User;
  session?: any; // Supabase Session
  error?: string;
  requires_onboarding?: boolean;
}

/**
 * Role-based permissions
 */
export const RolePermissions: Record<UserRole, string[]> = {
  property_manager: [
    'view_all_properties',
    'manage_properties',
    'manage_tenants',
    'manage_leases',
    'manage_vendors',
    'view_all_financials',
    'manage_work_orders',
    'manage_payments',
    'manage_reports',
    'manage_users',
  ],
  tenant: [
    'view_own_lease',
    'view_own_payments',
    'make_payments',
    'submit_maintenance_requests',
    'view_own_work_orders',
    'update_own_profile',
    'view_rent_balance',
  ],
  vendor: [
    'view_assigned_work_orders',
    'update_work_order_status',
    'upload_work_completion_photos',
    'view_own_payments',
    'update_own_profile',
    'view_assigned_properties',
  ],
  owner: [
    'view_owned_properties',
    'view_financial_reports',
    'view_tenants',
    'view_work_orders',
    'approve_expenses',
    'view_vacancy_reports',
    'view_maintenance_reports',
    'download_tax_documents',
  ],
};

/**
 * Check if user has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  return RolePermissions[role]?.includes(permission) || false;
}

/**
 * Get portal path for a user role
 */
export function getPortalPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    property_manager: '/',
    tenant: '/tenant/dashboard',
    vendor: '/vendor/dashboard',
    owner: '/owner/dashboard',
  };
  return paths[role];
}

/**
 * Get login path for a user role
 */
export function getLoginPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    property_manager: '/login',
    tenant: '/tenant/login',
    vendor: '/vendor/login',
    owner: '/owner/login',
  };
  return paths[role];
}
