-- Phase 5: Core Property Management Modules - Database Schema Extensions

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

-- 2. Applications Table (for Leasing module)
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  applicant_first_name VARCHAR(100) NOT NULL,
  applicant_last_name VARCHAR(100) NOT NULL,
  applicant_email VARCHAR(255) NOT NULL,
  applicant_phone VARCHAR(20),
  application_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, screening
  income_amount DECIMAL(10,2),
  employment_status VARCHAR(50),
  credit_score INTEGER,
  screening_status VARCHAR(50), -- pending, passed, failed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Communications Table (for Communications module)
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sender_type VARCHAR(50), -- admin, tenant, vendor
  recipient_type VARCHAR(50), -- admin, tenant, vendor, all
  recipient_id UUID, -- nullable for broadcasts
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  communication_type VARCHAR(50), -- email, sms, notification, internal
  status VARCHAR(50) DEFAULT 'sent', -- draft, sent, read
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Notes Table (for Notes module)
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  note_type VARCHAR(50), -- property, tenant, task, general
  reference_id UUID, -- id of related entity (property, tenant, task)
  category VARCHAR(100),
  tags TEXT[], -- array of tags
  is_pinned BOOLEAN DEFAULT false,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Documents Table (for Files & Agreements module)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  document_type VARCHAR(100), -- lease, contract, photo, legal, other
  related_entity_type VARCHAR(50), -- property, unit, tenant, task
  related_entity_id UUID,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  uploaded_by VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Calendar Events Table (for Calendar module)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50), -- maintenance, showing, inspection, meeting, deadline
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  assigned_to VARCHAR(255),
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled
  recurrence_rule TEXT, -- RRULE format for recurring events
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Financial Transactions Table (enhanced for Accounting module)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- income, expense, transfer
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  description TEXT,
  payment_method VARCHAR(50), -- cash, check, credit, ach, wire
  reference_number VARCHAR(100),
  is_recurring BOOLEAN DEFAULT false,
  reconciled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);

CREATE INDEX IF NOT EXISTS idx_applications_property ON applications(property_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE INDEX IF NOT EXISTS idx_communications_recipient ON communications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_communications_property ON communications(property_id);

CREATE INDEX IF NOT EXISTS idx_notes_reference ON notes(reference_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(note_type);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(related_entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_property ON documents(property_id);

CREATE INDEX IF NOT EXISTS idx_calendar_property ON calendar_events(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_dates ON calendar_events(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_transactions_property ON transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- Enable Row Level Security
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now - can be restricted based on user roles later)
CREATE POLICY "Allow all operations on leases" ON leases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on applications" ON applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on communications" ON communications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on notes" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on calendar_events" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
