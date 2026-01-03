# Phase 2: AI Assistant - Backend Integration & Deployment Guide

## Overview
Complete backend integration for DoorLoop AI Assistant with OpenAI, real database, and comprehensive testing.

## Status: READY FOR DEPLOYMENT ⚡

---

## 1. Prerequisites Checklist

### Required Credentials
- [ ] Supabase Access Token (refreshed)
- [ ] OpenAI API Key
- [ ] Supabase URL and Anon Key (already configured)

### System Requirements
- [ ] Node.js 18+ installed
- [ ] pnpm package manager
- [ ] Supabase CLI (optional, for local testing)

---

## 2. Database Setup

### Step 1: Create Database Tables

Run the migration to create all required tables:

```bash
# Navigate to project
cd /workspace/propmaster-rebuild

# Apply migration (once Supabase token is refreshed)
# This will be done programmatically via apply_migration tool
```

Tables to be created:
- `properties` - Property information
- `units` - Individual rental units
- `tenants` - Tenant information and balances
- `tasks` - Work orders and maintenance tasks
- `chat_conversations` - AI chat history
- `chat_messages` - Individual chat messages

### Step 2: Seed Sample Data

```sql
-- Load seed data from: database/seed-ai-assistant-data.sql
-- This includes:
-- - 3 sample properties
-- - 5 sample units
-- - 4 sample tenants (with balance due data)
-- - 4 sample tasks (upcoming and in-progress)
-- - 3 sample chat conversations
```

---

## 3. Edge Functions Deployment

Three Edge Functions have been created:

### 1. **ai-chat** - OpenAI Integration
**Location**: `supabase/functions/ai-chat/index.ts`
**Purpose**: Processes user messages and returns intelligent AI responses
**Features**:
- GPT-4 conversational AI
- Task extraction (frequency, location, type)
- Real-time database queries for tenants and tasks
- Structured data responses (tables, bullet points)

### 2. **create-task** - Task Creation
**Location**: `supabase/functions/create-task/index.ts`
**Purpose**: Creates tasks from AI recommendations
**Features**:
- Single and recurring task creation
- Property and unit assignment
- Priority and status management

### 3. **get-mention-data** - Autocomplete Data
**Location**: `supabase/functions/get-mention-data/index.ts`
**Purpose**: Provides data for @mention functionality
**Features**:
- Properties, units, tenants autocomplete
- Search filtering
- Real-time database queries

### Deployment Command

```bash
# Deploy all three functions (once credentials are available)
# This will be done via batch_deploy_edge_functions tool
```

---

## 4. Frontend Integration

### New Files Created

1. **src/services/aiService.ts** (259 lines)
   - Complete backend API integration
   - Supabase Edge Function calls
   - Database queries for properties, tenants, tasks
   - Chat history management

2. **src/components/DoorLoopAIAssistantIntegrated.tsx** (576 lines)
   - Updated component with real backend calls
   - Toast notifications for user feedback
   - Error handling and loading states
   - Real-time @mention data loading

### Integration Steps

```bash
# 1. Update imports in AIAssistantPage.tsx
# Change from: DoorLoopAIAssistant
# Change to: DoorLoopAIAssistantIntegrated

# 2. Add toast provider to App.tsx
import { Toaster } from 'react-hot-toast';

# In App.tsx render:
<Toaster position="top-right" />

# 3. Ensure Supabase client is configured (already done)
# File: src/lib/supabase.ts
```

---

## 5. Environment Configuration

Ensure environment variables are set:

```env
VITE_SUPABASE_URL=https://bqehbymwhgdxutopyecm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Edge Function environment variables (set in Supabase):
```env
OPENAI_API_KEY=<to_be_provided>
SUPABASE_URL=<auto_configured>
SUPABASE_SERVICE_ROLE_KEY=<auto_configured>
```

---

## 6. Deployment Workflow

### Phase 1: Database & Backend (Requires Refreshed Token)
```bash
# 1. Refresh Supabase token
# [ACTION_REQUIRED] Request token refresh from coordinator

# 2. Create database tables
# Via apply_migration tool with create_ai_assistant_tables migration

# 3. Seed sample data
# Via execute_sql tool with seed-ai-assistant-data.sql

# 4. Deploy Edge Functions
# Via batch_deploy_edge_functions tool:
# - ai-chat (type: normal)
# - create-task (type: normal)
# - get-mention-data (type: normal)

# 5. Test Edge Functions
# Via test_edge_function tool for each function
```

### Phase 2: Frontend Build & Deploy
```bash
cd /workspace/propmaster-rebuild

# Update component imports
# - Replace DoorLoopAIAssistant with DoorLoopAIAssistantIntegrated in AIAssistantPage.tsx
# - Add Toaster to App.tsx

# Build production bundle
pnpm run build

# Deploy to production
# Via deploy tool
```

---

## 7. Testing Checklist

### Backend Testing

#### Database Tests
- [ ] Verify all tables created successfully
- [ ] Verify RLS policies are active
- [ ] Verify sample data loaded correctly
- [ ] Test direct database queries

#### Edge Function Tests
- [ ] Test ai-chat with sample message: "Highlight today's priorities"
- [ ] Test ai-chat with task creation: "change furnace filters"
- [ ] Test create-task with sample task data
- [ ] Test get-mention-data endpoint
- [ ] Verify OpenAI API responses
- [ ] Check structured data formatting

### Frontend Testing (via test_website tool)

#### Core Functionality
- [ ] AI chat interface loads correctly
- [ ] Can send messages and receive responses
- [ ] Predefined prompts work
- [ ] @mention dropdown appears and loads data
- [ ] Can select properties, units, tenants from @mentions
- [ ] Chat history sidebar loads conversations
- [ ] Search chats functionality works

#### AI Workflows
- [ ] Task extraction workflow:
  1. Send: "change furnace filters"
  2. Verify: Task details panel appears
  3. Verify: Frequency, Location, Type populated
  4. Click: "Create the tasks"
  5. Verify: Confirmation table appears with created tasks
  
- [ ] Tenant balance query:
  1. Send: "List tenants with balance due"
  2. Verify: Table with tenant data appears
  3. Verify: Balance amounts are displayed correctly

- [ ] Upcoming tasks query:
  1. Send: "List all tasks due in the next 7 days"
  2. Verify: Table with tasks appears
  3. Verify: Due dates and priorities displayed

#### UI/UX Testing
- [ ] Teal color scheme consistent (#20B2AA)
- [ ] Messages scroll smoothly
- [ ] Timestamps display correctly
- [ ] Loading indicators show during API calls
- [ ] Error messages display on failures
- [ ] Toast notifications appear for success/errors
- [ ] Responsive design on mobile/tablet
- [ ] Task details panel appears/disappears correctly
- [ ] Chat history sidebar toggles correctly

### Integration Testing
- [ ] End-to-end workflow: User input → AI response → Task creation → Database storage
- [ ] Verify chat conversations are saved to database
- [ ] Verify created tasks appear in tasks table
- [ ] Test error handling when API fails
- [ ] Test offline behavior

### Performance Testing
- [ ] AI response time < 3 seconds
- [ ] @mention data loads < 1 second
- [ ] Chat history loads < 1 second
- [ ] No memory leaks during extended use
- [ ] Smooth scrolling with 50+ messages

---

## 8. Implementation Status

### ✅ Completed
1. Database schema design (6 tables)
2. Seed data script with sample properties, units, tenants, tasks
3. Edge Function: ai-chat (OpenAI integration)
4. Edge Function: create-task (Task management)
5. Edge Function: get-mention-data (Autocomplete)
6. Frontend service layer (aiService.ts)
7. Updated AI Assistant component with backend integration
8. Error handling and loading states
9. Toast notifications
10. Real-time data integration

### ⏳ Pending (Blocked by Credentials)
1. Supabase token refresh
2. OpenAI API key provisioning
3. Database table creation
4. Edge Functions deployment
5. Edge Functions testing
6. Frontend integration testing
7. Production deployment
8. End-to-end testing

---

## 9. Expected Outcomes

After complete deployment:

### User Experience
- Natural language conversations with AI
- Intelligent task extraction from casual requests
- Real-time property, unit, tenant data
- Instant task creation from AI recommendations
- Persistent chat history across sessions
- Professional DoorLoop-style interface

### Technical Achievements
- Production-grade OpenAI integration
- Real Supabase database with 6 tables
- 3 operational Edge Functions
- Complete CRUD operations for all entities
- Secure RLS policies
- Error handling and resilience
- Scalable architecture

### Business Value
- Replaces placeholder data with real backend
- Production-ready AI assistant
- Matches DoorLoop's AI capabilities
- Foundation for future AI features
- Comprehensive testing coverage

---

## 10. Next Steps After Credentials

1. **Immediate** (5 minutes):
   - Get refreshed Supabase token
   - Get OpenAI API key
   
2. **Database Setup** (10 minutes):
   - Create all 6 tables
   - Load seed data
   - Verify RLS policies

3. **Backend Deployment** (15 minutes):
   - Deploy 3 Edge Functions
   - Test each function individually
   - Verify OpenAI integration

4. **Frontend Integration** (10 minutes):
   - Update component imports
   - Add toast provider
   - Build production bundle

5. **Testing** (30 minutes):
   - Test all AI workflows
   - Verify database operations
   - Check error handling
   - Performance validation

6. **Production Deploy** (5 minutes):
   - Deploy to production URL
   - Final smoke tests
   - User acceptance testing

**Total Time to Production**: ~75 minutes after credentials are provided

---

## 11. Support & Troubleshooting

### Common Issues

**Issue**: "OpenAI API error: 401"
**Solution**: Verify OPENAI_API_KEY is set in Edge Function environment

**Issue**: "new row violates row-level security policy"
**Solution**: Check RLS policies allow both 'anon' and 'service_role'

**Issue**: "@mention dropdown not showing data"
**Solution**: Verify get-mention-data Edge Function is deployed and tables have data

**Issue**: "AI response takes too long"
**Solution**: Check OpenAI API status, consider caching frequent queries

### Debug Commands

```bash
# Check Edge Function logs
# Via get_logs tool with service: edge-function

# Query database directly
# Via execute_sql tool

# Test individual Edge Function
# Via test_edge_function tool
```

---

## 12. Files Reference

### Backend Files
- `/workspace/propmaster-rebuild/supabase/functions/ai-chat/index.ts` (217 lines)
- `/workspace/propmaster-rebuild/supabase/functions/create-task/index.ts` (103 lines)
- `/workspace/propmaster-rebuild/supabase/functions/get-mention-data/index.ts` (111 lines)
- `/workspace/propmaster-rebuild/database/seed-ai-assistant-data.sql` (43 lines)

### Frontend Files
- `/workspace/propmaster-rebuild/src/services/aiService.ts` (259 lines)
- `/workspace/propmaster-rebuild/src/components/DoorLoopAIAssistantIntegrated.tsx` (576 lines)
- `/workspace/propmaster-rebuild/src/lib/supabase.ts` (existing, configured)

### Documentation
- This file: Backend Integration & Deployment Guide

**Total New Code**: 1,309 lines across 7 files

---

## Conclusion

All backend code is complete and ready for deployment. The system requires:
1. **Refreshed Supabase token** to create database tables
2. **OpenAI API key** to enable AI chat functionality

Once these credentials are provided, full deployment can proceed in ~75 minutes with comprehensive testing.

The implementation replaces all mock data with real backend services, provides production-grade AI integration, and maintains the exact DoorLoop UI/UX specified in the original requirements.
