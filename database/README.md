# Database Setup

## Initial Setup

To set up the PropMaster database in Supabase, run the SQL files in this order:

1. **base-schema.sql** - Core tables (properties, units, tenants, tasks)
2. **phase5-schema.sql** - Extended features (leases, applications, communications, etc.)
3. **people-management-schema.sql** - People management features
4. **advanced-features-schema.sql** - Advanced features (market intelligence, predictive maintenance, etc.)
5. **seed-ai-assistant-data.sql** - Optional seed data for AI assistant

## How to Run SQL Files

### Option 1: Supabase Dashboard
1. Go to your Supabase project
2. Navigate to the SQL Editor
3. Copy and paste the contents of each SQL file
4. Click "Run" to execute

### Option 2: Supabase CLI
```bash
supabase db push
```

## Base Schema Tables

The `base-schema.sql` file creates these core tables:

- **properties** - Property information (name, address, type, units)
- **units** - Individual units within properties
- **tenants** - Tenant information
- **tasks** - Maintenance and work orders

These tables must exist before running the property wizard or other features.

## Troubleshooting

If you get "column not found" errors when creating properties:

1. Make sure `base-schema.sql` has been run in your Supabase instance
2. Check that all columns in the properties table exist:
   - id
   - name
   - address
   - type
   - subtype
   - total_units
   - occupied_units
   - status
   - created_at
   - updated_at

3. You can verify table structure in Supabase Dashboard > Table Editor > properties
