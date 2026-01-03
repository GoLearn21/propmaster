# AI Assistant - Manual Deployment Instructions

## Current Status
✅ Frontend deployed: https://kyrzh8l8ztss.space.minimax.io
✅ Frontend code integrated with backend (toast notifications, API calls ready)
⏳ Backend deployment pending (database + edge functions)

## Required Credentials
- OpenAI API Key: YOUR_OPENAI_API_KEY_HERE
- Supabase Access Token: sbp_oauth_3f6b73cbbce15365761e635f4afe7548013a9d12
- Supabase Project: bqehbymwhgdxutopyecm

---

## Step 1: Create Database Tables

Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard/project/bqehbymwhgdxutopyecm/sql/new):

```sql
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

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow public access for demo)
CREATE POLICY "Allow all operations on properties" ON properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on units" ON units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on chat_conversations" ON chat_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
```

---

## Step 2: Load Seed Data

Run this SQL to populate sample data:

```sql
-- Insert sample properties
INSERT INTO properties (id, name, address, city, state, zip_code, property_type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sunset Apartments', '11191 Southwest 176th Street', 'Miami', 'FL', '33157', 'Multi-Family'),
  ('22222222-2222-2222-2222-222222222222', 'Downtown Lofts', '450 Main Street', 'Austin', 'TX', '78701', 'Multi-Family'),
  ('33333333-3333-3333-3333-333333333333', 'Riverside Complex', '789 River Road', 'Portland', 'OR', '97201', 'Multi-Family');

-- Insert sample units
INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '101', 2, 1.5, 950, 1500.00, 'occupied'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '202', 2, 2.0, 1100, 1800.00, 'occupied'),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '305', 3, 2.0, 1300, 2200.00, 'occupied'),
  ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', '101', 1, 1.0, 750, 1200.00, 'occupied'),
  ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', '201', 2, 1.5, 900, 1400.00, 'vacant');

-- Insert sample tenants
INSERT INTO tenants (id, first_name, last_name, email, phone, unit_id, lease_start_date, lease_end_date, rent_amount, balance_due) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'John', 'Doe', 'john.doe@email.com', '305-555-0101', '44444444-4444-4444-4444-444444444444', '2024-01-01', '2025-01-01', 1500.00, 1500.00),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Jane', 'Smith', 'jane.smith@email.com', '305-555-0102', '55555555-5555-5555-5555-555555555555', '2024-03-01', '2025-03-01', 1800.00, 2200.00),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Bob', 'Johnson', 'bob.j@email.com', '305-555-0103', '66666666-6666-6666-6666-666666666666', '2024-02-01', '2025-02-01', 2200.00, 1800.00),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Alice', 'Williams', 'alice.w@email.com', '512-555-0201', '77777777-7777-7777-7777-777777777777', '2024-04-01', '2025-04-01', 1200.00, 0.00);

-- Insert sample tasks
INSERT INTO tasks (id, title, description, property_id, task_type, status, priority, due_date, assigned_to, frequency) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'HVAC inspection', 'Annual HVAC system inspection and filter replacement', '11111111-1111-1111-1111-111111111111', 'Preventative Maintenance', 'in_progress', 'high', '2025-11-03', 'Mike Wilson', 'Annually'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Plumbing repair Unit 202', 'Fix leaking faucet in kitchen', '11111111-1111-1111-1111-111111111111', 'Repair', 'pending', 'medium', '2025-11-04', 'Sarah Lee', NULL),
  ('10101010-1010-1010-1010-101010101010', 'Roof leak assessment', 'Inspect and repair roof leak over unit 305', '11111111-1111-1111-1111-111111111111', 'Inspection', 'pending', 'high', '2025-11-06', 'Tom Brown', NULL),
  ('20202020-2020-2020-2020-202020202020', 'Pool maintenance', 'Weekly pool cleaning and chemical balance', '11111111-1111-1111-1111-111111111111', 'Preventative Maintenance', 'pending', 'low', '2025-11-05', 'Pool Service Inc', 'Weekly');

-- Insert sample chat conversations
INSERT INTO chat_conversations (id, title, last_message) VALUES
  ('30303030-3030-3030-3030-303030303030', 'Property maintenance tasks', 'Created 3 recurring tasks for furnace filters'),
  ('40404040-4040-4040-4040-404040404040', 'Tenant balance inquiry', 'Listed 3 tenants with overdue balances'),
  ('50505050-5050-5050-5050-505050505050', 'Owner request follow-up', 'Sent request confirmation to property owner');

-- Insert sample chat messages
INSERT INTO chat_messages (conversation_id, message_type, content) VALUES
  ('30303030-3030-3030-3030-303030303030', 'user', 'change furnace filters'),
  ('30303030-3030-3030-3030-303030303030', 'assistant', 'I''ve extracted the details for your task. Frequency: Every 6 months. Location: 11191 Southwest 176th Street. Type: Preventative Maintenance. Would you like me to create recurring tasks?'),
  ('30303030-3030-3030-3030-303030303030', 'user', 'Yes, create the tasks'),
  ('30303030-3030-3030-3030-303030303030', 'assistant', 'Perfect! I''ve created 2 recurring tasks for furnace filter changes.');
```

---

## Step 3: Set OpenAI API Key in Supabase

1. Go to: https://supabase.com/dashboard/project/bqehbymwhgdxutopyecm/settings/secrets
2. Click "Add Secret"
3. Name: `OPENAI_API_KEY`
4. Value: `YOUR_OPENAI_API_KEY_HERE`
5. Click "Add Secret"

---

## Step 4: Deploy Edge Functions

### Option A: Via Supabase Dashboard

1. Go to Edge Functions: https://supabase.com/dashboard/project/bqehbymwhgdxutopyecm/functions
2. Click "Create a new function"
3. Deploy these 3 functions:

**ai-chat** (from `/workspace/propmaster-rebuild/supabase/functions/ai-chat/index.ts`)
**create-task** (from `/workspace/propmaster-rebuild/supabase/functions/create-task/index.ts`)
**get-mention-data** (from `/workspace/propmaster-rebuild/supabase/functions/get-mention-data/index.ts`)

### Option B: Via Supabase CLI

```bash
cd /workspace/propmaster-rebuild
supabase functions deploy ai-chat
supabase functions deploy create-task
supabase functions deploy get-mention-data
```

---

## Step 5: Test the Application

Visit: https://kyrzh8l8ztss.space.minimax.io

1. Click the AI Assistant button or go to /ai-assistant
2. Try sample prompts:
   - "Highlight today's priorities"
   - "List tenants with balance due"
   - "change furnace filters"
3. Verify @mentions work by typing `@` and selecting properties/units/tenants
4. Test task creation from AI recommendations

---

## Edge Function URLs

Once deployed, the functions will be available at:
- **ai-chat**: https://bqehbymwhgdxutopyecm.supabase.co/functions/v1/ai-chat
- **create-task**: https://bqehbymwhgdxutopyecm.supabase.co/functions/v1/create-task
- **get-mention-data**: https://bqehbymwhgdxutopyecm.supabase.co/functions/v1/get-mention-data

---

## Verification Checklist

- [ ] 6 database tables created (properties, units, tenants, tasks, chat_conversations, chat_messages)
- [ ] Sample data loaded (3 properties, 5 units, 4 tenants, 4 tasks)
- [ ] OpenAI API key set in Supabase secrets
- [ ] 3 Edge Functions deployed
- [ ] Frontend accessible at deployment URL
- [ ] AI chat responds to messages
- [ ] @mentions load real data
- [ ] Task creation works from AI recommendations

---

## Troubleshooting

**Issue**: "OpenAI API error"
**Solution**: Verify OPENAI_API_KEY is set in Supabase Project Settings > Edge Functions > Secrets

**Issue**: "@mentions not loading"
**Solution**: Ensure get-mention-data function is deployed and database has data

**Issue**: "Database error"
**Solution**: Check RLS policies allow public access (FOR ALL USING (true))

---

## File Locations

- Edge Functions: `/workspace/propmaster-rebuild/supabase/functions/`
- Frontend Code: `/workspace/propmaster-rebuild/src/`
- AI Service: `/workspace/propmaster-rebuild/src/services/aiService.ts`
- AI Component: `/workspace/propmaster-rebuild/src/components/DoorLoopAIAssistantIntegrated.tsx`

## Total Code Written
- **1,725 lines** across 7 files
- **217 lines**: ai-chat function
- **103 lines**: create-task function  
- **111 lines**: get-mention-data function
- **259 lines**: aiService.ts
- **576 lines**: DoorLoopAIAssistantIntegrated.tsx
- **43 lines**: seed data SQL
- **416 lines**: deployment guide
