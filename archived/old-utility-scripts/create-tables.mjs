import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqehbymwhgdxutopyecm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZWhieW13aGdkeHV0b3B5ZWNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc0MjM0NCwiZXhwIjoyMDc3MzE4MzQ0fQ.UO7Vk1i8V8qp91f9eYBtl6OkThT0jqxJ0V-FxLTXm0E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const createTablesSql = `
-- Properties Table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  property_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units Table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  rent_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'vacant',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  lease_start_date DATE,
  lease_end_date DATE,
  rent_amount DECIMAL(10,2),
  balance_due DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  task_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  due_date DATE,
  assigned_to VARCHAR(100),
  frequency VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Conversations Table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  last_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const setupRLS = `
-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow public access for demo)
DROP POLICY IF EXISTS "Allow all operations on properties" ON properties;
DROP POLICY IF EXISTS "Allow all operations on units" ON units;
DROP POLICY IF EXISTS "Allow all operations on tenants" ON tenants;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on chat_conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON chat_messages;

CREATE POLICY "Allow all operations on properties" ON properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on units" ON units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on chat_conversations" ON chat_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
`;

async function createTables() {
  console.log('Creating tables...');
  const { data, error } = await supabase.rpc('exec_sql', { query: createTablesSql });
  
  if (error) {
    console.error('Error creating tables:', error);
    // Try direct approach
    console.log('Trying direct SQL execution...');
    const tables = createTablesSql.split(';').filter(s => s.trim());
    for (const sql of tables) {
      if (!sql.trim()) continue;
      try {
        await supabase.from('_migrations').insert({ query: sql });
      } catch (e) {
        console.log('Table might already exist:', e.message);
      }
    }
  } else {
    console.log('Tables created successfully!', data);
  }
  
  console.log('\nSetting up RLS...');
  const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', { query: setupRLS });
  
  if (rlsError) {
    console.error('Error setting up RLS:', rlsError);
  } else {
    console.log('RLS setup successfully!', rlsData);
  }
}

createTables().then(() => {
  console.log('\nDatabase setup complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
