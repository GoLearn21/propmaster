-- Phase 5: Core Property Management Modules - Database Schema Extensions (Updated)

-- 1. Leases Table (for Rentals & Leasing modules)
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  lease_number VARCHAR(50) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active', -- active, expired, terminated, renewed
  lease_type VARCHAR(50), -- fixed, month-to-month
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Lease Applications Table (for Leasing module)
CREATE TABLE IF NOT EXISTS lease_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  applicant_name VARCHAR(200) NOT NULL,
  applicant_email VARCHAR(255) NOT NULL,
  applicant_phone VARCHAR(20),
  desired_move_in_date DATE,
  employment_status VARCHAR(100),
  annual_income DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewing, approved, rejected, withdrawn
  screening_status VARCHAR(50), -- not_started, in_progress, completed, failed
  screening_score INTEGER,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Communications Table (for Communications module)
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID,
  sender_id VARCHAR(255) NOT NULL,
  recipient_id VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- email, sms, internal, notification
  status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read, failed
  is_template BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Notes Table (for Notes module)
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- property, unit, tenant, task, lease, general
  entity_id UUID,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. File Attachments Table (for Files & Agreements module)
CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- property, unit, tenant, lease, work_order, general
  entity_id UUID,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  file_url TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- lease, photo, document, contract, other
  description TEXT,
  uploaded_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Calendar Events Table (for Calendar module)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL, -- maintenance, inspection, showing, meeting, deadline, other
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  location VARCHAR(255),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  attendees TEXT[],
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);

CREATE INDEX IF NOT EXISTS idx_lease_applications_property ON lease_applications(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_applications_unit ON lease_applications(unit_id);
CREATE INDEX IF NOT EXISTS idx_lease_applications_status ON lease_applications(status);

CREATE INDEX IF NOT EXISTS idx_communications_sender ON communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_communications_recipient ON communications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_communications_thread ON communications(thread_id);

CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);

CREATE INDEX IF NOT EXISTS idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_category ON file_attachments(category);

CREATE INDEX IF NOT EXISTS idx_calendar_events_property ON calendar_events(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

-- Enable Row Level Security
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now - can be restricted based on user roles later)
CREATE POLICY "Allow all operations on leases" ON leases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on lease_applications" ON lease_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on communications" ON communications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on notes" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on file_attachments" ON file_attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on calendar_events" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
