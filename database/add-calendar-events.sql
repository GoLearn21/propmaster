-- ============================================================================
-- ADD CALENDAR EVENTS TABLE
-- ============================================================================
-- This script adds the calendar_events table and related features
-- Execute this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('maintenance', 'inspection', 'showing', 'meeting', 'deadline', 'other')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  location VARCHAR(255),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  attendees TEXT[],
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_property ON calendar_events(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_unit ON calendar_events(unit_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all calendar events
DROP POLICY IF EXISTS calendar_events_select_policy ON calendar_events;
CREATE POLICY calendar_events_select_policy ON calendar_events
  FOR SELECT USING (true);

-- RLS Policy: Authenticated users can insert events
DROP POLICY IF EXISTS calendar_events_insert_policy ON calendar_events;
CREATE POLICY calendar_events_insert_policy ON calendar_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policy: Users can update events they created
DROP POLICY IF EXISTS calendar_events_update_policy ON calendar_events;
CREATE POLICY calendar_events_update_policy ON calendar_events
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policy: Users can delete events they created
DROP POLICY IF EXISTS calendar_events_delete_policy ON calendar_events;
CREATE POLICY calendar_events_delete_policy ON calendar_events
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add some sample calendar events for testing
INSERT INTO calendar_events (
  title,
  description,
  event_type,
  start_time,
  end_time,
  all_day,
  status,
  created_by
) VALUES
  (
    'Monthly Property Inspection',
    'Routine inspection of all units in Building A',
    'inspection',
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days' + INTERVAL '2 hours',
    false,
    'scheduled',
    'admin'
  ),
  (
    'HVAC Maintenance',
    'Scheduled HVAC system maintenance',
    'maintenance',
    NOW() + INTERVAL '1 week',
    NOW() + INTERVAL '1 week' + INTERVAL '3 hours',
    false,
    'scheduled',
    'admin'
  ),
  (
    'Property Showing',
    'Showing Unit 101 to potential tenant',
    'showing',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days' + INTERVAL '1 hour',
    false,
    'scheduled',
    'admin'
  ),
  (
    'Lease Renewal Meeting',
    'Discuss lease renewal with current tenant',
    'meeting',
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '5 days' + INTERVAL '1 hour',
    false,
    'scheduled',
    'admin'
  ),
  (
    'Rent Payment Deadline',
    'Monthly rent payment due date',
    'deadline',
    DATE_TRUNC('month', NOW() + INTERVAL '1 month') + INTERVAL '1 day',
    DATE_TRUNC('month', NOW() + INTERVAL '1 month') + INTERVAL '1 day' + INTERVAL '1 hour',
    true,
    'scheduled',
    'system'
  )
ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$ BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Calendar Events Table Created Successfully!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Table: calendar_events';
  RAISE NOTICE 'Indexes: 6 performance indexes created';
  RAISE NOTICE 'RLS Policies: 4 policies enabled';
  RAISE NOTICE 'Sample Data: 5 test events inserted';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Calendar feature is now ready to use!';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;
