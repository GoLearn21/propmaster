#!/usr/bin/env node

/**
 * Database Setup Script for People Management
 * Creates the required tables and sample data for the People management system
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rautdxfkuemmlhcrujxq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdXRkeGZrdWVtbWxoY3J1anhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc0NjIwNSwiZXhwIjoyMDc3MzIyMjA1fQ.PDJhLUfTwFfFhV5fH5sVdNhOG5PMHlHcMGKl5wQEE7I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupPeopleDatabase() {
  try {
    console.log('🚀 Setting up People Management database...');
    
    // Read the SQL schema file
    const schemaPath = path.join(process.cwd(), 'database', 'people-management-schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split SQL statements (simple split by semicolon)
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`📋 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length === 0) continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Some errors are expected (like table already exists), so continue
        }
      } catch (err) {
        console.error(`❌ Error with statement ${i + 1}:`, err.message);
      }
    }
    
    // Alternative: try direct table creation if RPC doesn't work
    console.log('📊 Creating tables directly...');
    
    // Create people table
    const { error: peopleError } = await supabase
      .from('people')
      .select('id')
      .limit(1);
    
    if (peopleError) {
      console.log('📋 Creating people table...');
      // Table doesn't exist, create it
      await createTableViaREST('people', {
        id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        type: 'varchar(20) NOT NULL CHECK (type IN (\'tenant\', \'owner\', \'vendor\', \'prospect\'))',
        first_name: 'varchar(100) NOT NULL',
        middle_initial: 'varchar(5)',
        last_name: 'varchar(100) NOT NULL',
        date_of_birth: 'date',
        email: 'varchar(255) NOT NULL',
        phone: 'varchar(20)',
        company: 'varchar(255)',
        job_title: 'varchar(100)',
        photo_url: 'text',
        notes: 'text',
        status: 'varchar(50) DEFAULT \'active\'',
        created_at: 'timestamp with time zone DEFAULT now()',
        updated_at: 'timestamp with time zone DEFAULT now()'
      });
    }
    
    // Create tenants table  
    const { error: tenantsError } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);
      
    if (tenantsError) {
      console.log('📋 Creating tenants table...');
      await createTableViaREST('tenants', {
        id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        person_id: 'uuid REFERENCES people(id) ON DELETE CASCADE',
        email: 'varchar(255) NOT NULL',
        balance_due: 'decimal(10,2) DEFAULT 0.00',
        rent_amount: 'decimal(10,2) DEFAULT 0.00',
        lease_start_date: 'date',
        lease_end_date: 'date',
        property_id: 'uuid',
        unit_id: 'uuid',
        created_at: 'timestamp with time zone DEFAULT now()',
        updated_at: 'timestamp with time zone DEFAULT now()'
      });
    }
    
    // Insert sample data
    console.log('💾 Inserting sample data...');
    
    const samplePeople = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'tenant',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@email.com',
        phone: '(555) 123-4567',
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        type: 'tenant',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@email.com',
        phone: '(555) 234-5678',
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'owner',
        first_name: 'Robert',
        last_name: 'Johnson',
        email: 'robert.johnson@realestate.com',
        phone: '(555) 345-6789',
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        type: 'vendor',
        first_name: 'ABC',
        last_name: 'Maintenance',
        email: 'contact@abcmaintenance.com',
        phone: '(555) 456-7890',
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        type: 'prospect',
        first_name: 'Sarah',
        last_name: 'Wilson',
        email: 'sarah.wilson@email.com',
        phone: '(555) 567-8901',
        status: 'active'
      }
    ];
    
    // Insert people
    for (const person of samplePeople) {
      const { error } = await supabase
        .from('people')
        .upsert(person, { onConflict: 'id' });
      
      if (error) {
        console.log(`⚠️  Person ${person.email} already exists or error:`, error.message);
      }
    }
    
    // Insert tenant data
    const sampleTenants = [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        person_id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'john.doe@email.com',
        balance_due: 1500.00,
        rent_amount: 2500.00,
        lease_start_date: '2024-01-01',
        lease_end_date: '2024-12-31'
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        person_id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'jane.smith@email.com',
        balance_due: 0.00,
        rent_amount: 2000.00,
        lease_start_date: '2024-02-01',
        lease_end_date: '2025-01-31'
      }
    ];
    
    for (const tenant of sampleTenants) {
      const { error } = await supabase
        .from('tenants')
        .upsert(tenant, { onConflict: 'id' });
      
      if (error) {
        console.log(`⚠️  Tenant ${tenant.email} already exists or error:`, error.message);
      }
    }
    
    console.log('✅ People Management database setup complete!');
    
    // Verify setup
    const { data: people, error: verifyError } = await supabase
      .from('people')
      .select('id, type, first_name, last_name, email');
    
    if (!verifyError && people) {
      console.log(`📊 Found ${people.length} people records:`);
      people.forEach(person => {
        console.log(`  - ${person.type}: ${person.first_name} ${person.last_name} (${person.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

async function createTableViaREST(tableName, columns) {
  // Since we can't directly create tables via REST API in Supabase,
  // we'll provide instructions for manual setup
  console.log(`⚠️  Please create the '${tableName}' table manually using this SQL:`);
  console.log(`CREATE TABLE IF NOT EXISTS ${tableName} (`);
  Object.entries(columns).forEach(([name, type]) => {
    console.log(`  ${name} ${type},`);
  });
  console.log(');');
  console.log('');
}

setupPeopleDatabase();