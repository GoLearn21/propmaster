-- ============================================================================
-- MASTERKEY COMMUNICATIONS SYSTEM (Simplified - No Transaction)
-- ============================================================================
-- Run each section separately if needed
-- ============================================================================

-- ====================
-- 1. CONVERSATION THREADS
-- ====================
CREATE TABLE IF NOT EXISTS conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants UUID[] NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT,
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_participants ON conversation_threads USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_threads_property ON conversation_threads(property_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_message ON conversation_threads(last_message_at DESC);

-- ====================
-- 2. COMMUNICATIONS (MESSAGES)
-- ====================
CREATE TABLE IF NOT EXISTS communications_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) CHECK (sender_type IN ('manager', 'tenant', 'owner', 'vendor', 'system')),
  sender_id UUID NOT NULL,
  recipient_type VARCHAR(20) CHECK (recipient_type IN ('manager', 'tenant', 'owner', 'vendor', 'broadcast')),
  recipient_ids UUID[],
  subject VARCHAR(255),
  body TEXT NOT NULL,
  channel VARCHAR(20) CHECK (channel IN ('email', 'sms', 'portal', 'push', 'voice')) DEFAULT 'portal',
  status VARCHAR(20) CHECK (status IN ('draft', 'scheduled', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'sent',
  priority VARCHAR(20) CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_reason TEXT,
  metadata JSONB,
  cost DECIMAL(10,4) DEFAULT 0,
  is_broadcast BOOLEAN DEFAULT false,
  is_automated BOOLEAN DEFAULT false,
  template_id UUID,
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comms_new_thread ON communications_new(thread_id);
CREATE INDEX IF NOT EXISTS idx_comms_new_sender ON communications_new(sender_id);
CREATE INDEX IF NOT EXISTS idx_comms_new_recipients ON communications_new USING GIN(recipient_ids);
CREATE INDEX IF NOT EXISTS idx_comms_new_status ON communications_new(status);
CREATE INDEX IF NOT EXISTS idx_comms_new_sent_at ON communications_new(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_new_property ON communications_new(property_id);

-- ====================
-- 3. MESSAGE TEMPLATES
-- ====================
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('rent_reminder', 'lease_renewal', 'maintenance', 'welcome', 'move_out', 'emergency', 'payment_confirmation', 'holiday', 'general')),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  merge_fields TEXT[],
  tone VARCHAR(20) CHECK (tone IN ('formal', 'neutral', 'casual', 'friendly')) DEFAULT 'neutral',
  language VARCHAR(10) DEFAULT 'en',
  is_system_template BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON message_templates(usage_count DESC);

-- ====================
-- 4. COMMUNICATION WORKFLOWS
-- ====================
CREATE TABLE IF NOT EXISTS communication_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) CHECK (trigger_type IN ('rent_due', 'rent_overdue', 'lease_expiring', 'maintenance_completed', 'move_in', 'move_out', 'payment_received', 'custom')),
  trigger_conditions JSONB,
  steps JSONB,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON communication_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON communication_workflows(is_active);

-- ====================
-- 5. COMMUNICATION PREFERENCES
-- ====================
CREATE TABLE IF NOT EXISTS communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  user_type VARCHAR(20) CHECK (user_type IN ('manager', 'tenant', 'owner', 'vendor')),
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  portal_enabled BOOLEAN DEFAULT true,
  preferred_channel VARCHAR(20) DEFAULT 'email',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  language VARCHAR(10) DEFAULT 'en',
  notification_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prefs_user ON communication_preferences(user_id);

-- ====================
-- 6. DELIVERY TRACKING
-- ====================
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID REFERENCES communications_new(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  recipient_type VARCHAR(20),
  channel VARCHAR(20),
  status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_comm ON delivery_tracking(communication_id);
CREATE INDEX IF NOT EXISTS idx_tracking_recipient ON delivery_tracking(recipient_id);
CREATE INDEX IF NOT EXISTS idx_tracking_status ON delivery_tracking(status);

-- ====================
-- 7. QUICK REPLIES
-- ====================
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shortcut VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  is_global BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_quick_replies_user ON quick_replies(user_id);

-- ====================
-- ROW LEVEL SECURITY
-- ====================

ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view conversations they're part of
DROP POLICY IF EXISTS threads_select_policy ON conversation_threads;
CREATE POLICY threads_select_policy ON conversation_threads
  FOR SELECT USING (auth.uid() = ANY(participants) OR auth.uid() IS NOT NULL);

-- Allow authenticated users to view their communications
DROP POLICY IF EXISTS comms_select_policy ON communications_new;
CREATE POLICY comms_select_policy ON communications_new
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = ANY(recipient_ids) OR auth.uid() IS NOT NULL);

-- Allow authenticated users to send messages
DROP POLICY IF EXISTS comms_insert_policy ON communications_new;
CREATE POLICY comms_insert_policy ON communications_new
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own messages (mark as read, etc.)
DROP POLICY IF EXISTS comms_update_policy ON communications_new;
CREATE POLICY comms_update_policy ON communications_new
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Templates accessible to all authenticated users
DROP POLICY IF EXISTS templates_select_policy ON message_templates;
CREATE POLICY templates_select_policy ON message_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS templates_insert_policy ON message_templates;
CREATE POLICY templates_insert_policy ON message_templates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Preferences accessible to owner only
DROP POLICY IF EXISTS prefs_select_policy ON communication_preferences;
CREATE POLICY prefs_select_policy ON communication_preferences
  FOR SELECT USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS prefs_update_policy ON communication_preferences;
CREATE POLICY prefs_update_policy ON communication_preferences
  FOR UPDATE USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- ====================
-- INSERT SAMPLE TEMPLATES
-- ====================

INSERT INTO message_templates (name, category, subject, body, merge_fields, tone, is_system_template)
VALUES
('Friendly Rent Reminder', 'rent_reminder', 'Rent Due Reminder',
'Hi {{tenant_name}}! 👋

Just a friendly reminder that rent for {{unit_number}} is due on {{due_date}}.

Amount: {{rent_amount}}

You can pay online through your portal or use any of our other payment methods.

Let us know if you have any questions!

Best regards,
{{property_name}} Team',
ARRAY['tenant_name', 'unit_number', 'due_date', 'rent_amount', 'property_name'],
'friendly', true),

('Formal Rent Reminder', 'rent_reminder', 'Rent Payment Due',
'Dear {{tenant_name}},

This is a reminder that your rent payment of {{rent_amount}} for unit {{unit_number}} is due on {{due_date}}.

Please submit your payment promptly to avoid any late fees.

Payment Options:
• Online Portal: [Pay Now]
• Bank Transfer
• Check

If you have any questions regarding your payment, please contact us.

Sincerely,
{{property_name}} Management',
ARRAY['tenant_name', 'unit_number', 'due_date', 'rent_amount', 'property_name'],
'formal', true),

('Welcome New Tenant', 'welcome', 'Welcome to {{property_name}}!',
'Welcome {{tenant_name}}! 🎉

We are thrilled to have you as part of the {{property_name}} community!

Here are some important things to get you started:

📱 Download our tenant portal app
🔑 Your move-in date: {{move_in_date}}
📋 Move-in checklist: [View Checklist]
🏠 Unit: {{unit_number}}

If you need anything or have questions, we are here to help!

Looking forward to having you here!

The {{property_name}} Team',
ARRAY['tenant_name', 'property_name', 'move_in_date', 'unit_number'],
'friendly', true),

('Maintenance Completed', 'maintenance', 'Maintenance Request Completed',
'Hi {{tenant_name}},

Good news! The maintenance request for {{unit_number}} has been completed.

Request: {{request_description}}
Completed: {{completion_date}}
Vendor: {{vendor_name}}

We hope everything is working perfectly now. If you notice any issues or have concerns, please let us know.

How did we do? [Rate Service]

Thanks!
{{property_name}} Maintenance Team',
ARRAY['tenant_name', 'unit_number', 'request_description', 'completion_date', 'vendor_name', 'property_name'],
'friendly', true),

('Lease Renewal Offer', 'lease_renewal', 'Your Lease Renewal Offer',
'Dear {{tenant_name}},

We hope you have enjoyed living at {{property_name}}! Your current lease for unit {{unit_number}} expires on {{lease_end_date}}.

We would love to have you stay with us! Here is your renewal offer:

New Lease Term: {{new_lease_term}}
Monthly Rent: {{new_rent_amount}}
Lease Start: {{new_lease_start}}

[Review Offer] [Accept Offer] [Decline/Move Out]

Please respond by {{response_deadline}} to secure this offer.

If you have any questions or would like to discuss the terms, please reach out.

Best regards,
{{property_name}} Management',
ARRAY['tenant_name', 'property_name', 'unit_number', 'lease_end_date', 'new_lease_term', 'new_rent_amount', 'new_lease_start', 'response_deadline'],
'neutral', true)
ON CONFLICT DO NOTHING;

-- ====================
-- INSERT SAMPLE WORKFLOW
-- ====================

INSERT INTO communication_workflows (name, description, trigger_type, trigger_conditions, steps, is_active)
VALUES
('Late Rent Follow-up',
'Automated follow-up sequence for late rent payments',
'rent_overdue',
'{"days_overdue": 1}',
'[
  {"day": 0, "channel": "portal", "template": "Friendly Rent Reminder", "action": "send"},
  {"day": 1, "channel": "sms", "template": "Friendly Rent Reminder", "action": "send"},
  {"day": 3, "channel": "email", "template": "Formal Rent Reminder", "action": "send"},
  {"day": 5, "action": "create_task", "task_type": "manager_follow_up", "priority": "high"},
  {"day": 7, "channel": "email", "template": "Late Fee Notice", "action": "send"}
]',
true)
ON CONFLICT DO NOTHING;
