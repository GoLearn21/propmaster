#!/usr/bin/env node
/**
 * Setup Demo Portal Users
 * Creates demo users for testing tenant, vendor, and owner portals
 *
 * Demo Credentials:
 * - Tenant: demo.tenant@propmaster.test / DemoTenant123!
 * - Vendor: demo.vendor@propmaster.test / DemoVendor123!
 * - Owner: demo.owner@propmaster.test / DemoOwner123!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Demo user configurations
const DEMO_USERS = {
  tenant: {
    email: 'demo.tenant@propmaster.test',
    password: 'DemoTenant123!',
    first_name: 'Demo',
    last_name: 'Tenant',
    phone: '(555) 100-0001',
    table: 'tenants',
    extraFields: {
      status: 'active',
      portal_access: true,
      portal_onboarding_completed: true,
      balance_due: '0.00',
      communication_preferences: {
        email: true,
        sms: true,
        push: true,
        payment_reminders: true,
        maintenance_updates: true,
        lease_notifications: true
      }
    }
  },
  vendor: {
    email: 'demo.vendor@propmaster.test',
    password: 'DemoVendor123!',
    first_name: 'Demo',
    last_name: 'Vendor',
    phone: '(555) 200-0001',
    table: 'vendors',
    extraFields: {
      status: 'active',
      portal_access: true,
      company_name: 'Demo Maintenance Services',
      role: 'vendor',
      specialty: 'general',
      service_areas: ['NC', 'SC'],
      hourly_rate: '75.00',
      rating: 4.8,
      completed_jobs_count: 25,
      active_jobs_count: 3
    }
  },
  owner: {
    email: 'demo.owner@propmaster.test',
    password: 'DemoOwner123!',
    first_name: 'Demo',
    last_name: 'Owner',
    phone: '(555) 300-0001',
    table: 'owners',
    extraFields: {
      status: 'active',
      portal_access: true,
      ownership_percentage: '100.00',
      distribution_method: 'check',
      tax_id_last4: '1234'
    }
  }
};

/**
 * Create or update a Supabase auth user
 */
async function createOrGetAuthUser(email, password, metadata = {}) {
  console.log(`  Creating/finding auth user: ${email}`);

  // First, try to find existing user
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('  Error listing users:', listError.message);
  }

  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    console.log(`  Found existing auth user: ${existingUser.id}`);

    // Update password to ensure it's correct
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password, user_metadata: metadata }
    );

    if (updateError) {
      console.error('  Error updating user:', updateError.message);
    }

    return existingUser;
  }

  // Create new user
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: metadata
  });

  if (createError) {
    console.error(`  Error creating auth user: ${createError.message}`);
    return null;
  }

  console.log(`  Created new auth user: ${newUser.user.id}`);
  return newUser.user;
}

/**
 * Create or update portal user record
 */
async function createOrUpdatePortalUser(userType, authUser) {
  const config = DEMO_USERS[userType];
  console.log(`  Setting up ${userType} record in ${config.table}...`);

  // Check if record already exists with this user_id
  const { data: existing, error: fetchError } = await supabase
    .from(config.table)
    .select('*')
    .eq('user_id', authUser.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error(`  Error checking existing ${userType}:`, fetchError.message);
  }

  const userData = {
    user_id: authUser.id,
    email: config.email,
    first_name: config.first_name,
    last_name: config.last_name,
    phone: config.phone,
    ...config.extraFields,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    // Update existing record
    const { data: updated, error: updateError } = await supabase
      .from(config.table)
      .update(userData)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      console.error(`  Error updating ${userType}:`, updateError.message);
      return null;
    }

    console.log(`  Updated existing ${userType} record: ${updated.id}`);
    return updated;
  }

  // Create new record
  userData.created_at = new Date().toISOString();

  // For tenants, we may need a property/unit link - find one
  if (userType === 'tenant') {
    const { data: units } = await supabase
      .from('units')
      .select('id, property_id')
      .limit(1)
      .single();

    if (units) {
      userData.unit_id = units.id;
      userData.property_id = units.property_id;
    }
  }

  // For owners, link to a property
  if (userType === 'owner') {
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .limit(1)
      .single();

    if (property) {
      userData.property_id = property.id;
    }
  }

  const { data: created, error: createError } = await supabase
    .from(config.table)
    .insert(userData)
    .select()
    .single();

  if (createError) {
    console.error(`  Error creating ${userType}:`, createError.message);
    return null;
  }

  console.log(`  Created new ${userType} record: ${created.id}`);
  return created;
}

/**
 * Main setup function
 */
async function setupDemoUsers() {
  console.log('='.repeat(60));
  console.log('PropMaster Demo Portal Users Setup');
  console.log('='.repeat(60));
  console.log('');

  const results = {};

  for (const [userType, config] of Object.entries(DEMO_USERS)) {
    console.log(`\n[${userType.toUpperCase()}]`);
    console.log('-'.repeat(40));

    // Create auth user
    const authUser = await createOrGetAuthUser(
      config.email,
      config.password,
      { first_name: config.first_name, last_name: config.last_name }
    );

    if (!authUser) {
      console.error(`  Failed to create auth user for ${userType}`);
      results[userType] = { success: false };
      continue;
    }

    // Create portal user record
    const portalUser = await createOrUpdatePortalUser(userType, authUser);

    results[userType] = {
      success: !!portalUser,
      email: config.email,
      password: config.password,
      authUserId: authUser.id,
      portalUserId: portalUser?.id
    };
  }

  // Print summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('DEMO CREDENTIALS SUMMARY');
  console.log('='.repeat(60));
  console.log('');

  for (const [userType, result] of Object.entries(results)) {
    const config = DEMO_USERS[userType];
    const status = result.success ? '✓' : '✗';

    console.log(`${status} ${userType.toUpperCase()} PORTAL:`);
    console.log(`   Email:    ${config.email}`);
    console.log(`   Password: ${config.password}`);
    console.log(`   URL:      http://localhost:5173/${userType}/login`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('');

  // Check if all succeeded
  const allSuccess = Object.values(results).every(r => r.success);
  if (!allSuccess) {
    console.error('Some demo users failed to set up. Check errors above.');
    process.exit(1);
  }

  console.log('All demo users set up successfully!');
}

// Run setup
setupDemoUsers().catch(console.error);
