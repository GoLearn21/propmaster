-- Seed data for AI Assistant Demo
-- Run this after creating the main tables

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
