-- ============================================================================
-- PROPMASTER PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================
-- These indexes are critical for dashboard performance
-- Run this migration to drastically improve query response times
-- ============================================================================

BEGIN;

-- ============================================================================
-- CORE TABLE INDEXES FOR DASHBOARD QUERIES
-- ============================================================================

-- Properties indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_status_active
  ON properties(status) WHERE status = 'active';

-- Units indexes - critical for occupancy calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_property_status
  ON units(property_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_status_occupied
  ON units(status) WHERE status = 'occupied';

-- Leases indexes - critical for revenue and occupancy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_status_active
  ON leases(status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_property_status
  ON leases(property_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_end_date_active
  ON leases(end_date, status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_unit_status
  ON leases(unit_id, status);

-- Tasks indexes - critical for task summaries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status_due
  ON tasks(status, due_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_priority_status
  ON tasks(priority, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_property_status
  ON tasks(property_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_created_at
  ON tasks(created_at DESC);

-- Tenants indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_status_active
  ON tenants(status) WHERE status = 'active';

-- Payment history indexes - critical for outstanding balance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_status_pending
  ON payment_history(status) WHERE status IN ('pending', 'failed');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_lease_status
  ON payment_history(lease_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_date_status
  ON payment_history(payment_date, status);

-- Payments indexes for revenue trends
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_date_status
  ON payments(payment_date, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_paid
  ON payments(status) WHERE status = 'paid';

-- Expenses indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_date_property
  ON expenses(expense_date, property_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_category_date
  ON expenses(category, expense_date);

-- Work orders indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_completed_date
  ON work_orders(completed_date, property_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_status_property
  ON work_orders(status, property_id);

-- ============================================================================
-- MATERIALIZED VIEW FOR DASHBOARD STATS (REFRESHED PERIODICALLY)
-- ============================================================================

-- Drop existing if needed to recreate
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_stats;

CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM properties WHERE status = 'active') as total_properties,
  (SELECT COUNT(*) FROM units) as total_units,
  (SELECT COUNT(*) FROM units WHERE status = 'occupied') as occupied_units,
  (SELECT COUNT(*) FROM leases WHERE status = 'active') as active_leases,
  (SELECT COALESCE(SUM(monthly_rent), 0) FROM leases WHERE status = 'active') as monthly_revenue,
  (SELECT COUNT(*) FROM tenants WHERE status = 'active') as total_tenants,
  (SELECT COUNT(*) FROM tasks WHERE status NOT IN ('completed', 'cancelled')) as active_tasks,
  (SELECT COUNT(*) FROM tasks WHERE status NOT IN ('completed', 'cancelled') AND due_date < NOW()) as overdue_tasks,
  (SELECT COALESCE(SUM(amount + COALESCE(late_fee, 0)), 0) FROM payment_history WHERE status IN ('pending', 'failed')) as outstanding_balance,
  NOW() as refreshed_at;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_dashboard_stats_idx ON mv_dashboard_stats(refreshed_at);

-- ============================================================================
-- MATERIALIZED VIEW FOR PROPERTY PERFORMANCE (REFRESHED PERIODICALLY)
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_property_performance;

CREATE MATERIALIZED VIEW mv_property_performance AS
SELECT
  p.id as property_id,
  p.name as property_name,
  COALESCE(unit_stats.total_units, 0) as total_units,
  COALESCE(unit_stats.occupied_units, 0) as occupied_units,
  CASE
    WHEN COALESCE(unit_stats.total_units, 0) > 0
    THEN ROUND((COALESCE(unit_stats.occupied_units, 0)::decimal / unit_stats.total_units) * 100, 1)
    ELSE 0
  END as occupancy_rate,
  COALESCE(lease_stats.monthly_revenue, 0) as monthly_revenue,
  COALESCE(payment_stats.outstanding_balance, 0) as outstanding_balance,
  COALESCE(maintenance_stats.maintenance_costs, 0) as maintenance_costs,
  NOW() as refreshed_at
FROM properties p
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) as total_units,
    COUNT(*) FILTER (WHERE status = 'occupied') as occupied_units
  FROM units WHERE property_id = p.id
) unit_stats ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(monthly_rent), 0) as monthly_revenue
  FROM leases WHERE property_id = p.id AND status = 'active'
) lease_stats ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount + COALESCE(late_fee, 0)), 0) as outstanding_balance
  FROM payment_history ph
  JOIN leases l ON ph.lease_id = l.id
  WHERE l.property_id = p.id AND ph.status IN ('pending', 'failed')
) payment_stats ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(actual_cost), 0) as maintenance_costs
  FROM work_orders
  WHERE property_id = p.id AND completed_date >= NOW() - INTERVAL '30 days'
) maintenance_stats ON true
WHERE p.status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS mv_property_performance_idx ON mv_property_performance(property_id);

-- ============================================================================
-- FUNCTION TO REFRESH MATERIALIZED VIEWS
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_property_performance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC FUNCTION FOR AGGREGATED DASHBOARD STATS (SINGLE QUERY)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats_optimized()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'totalProperties', (SELECT COUNT(*) FROM properties WHERE status = 'active'),
    'totalUnits', (SELECT COUNT(*) FROM units),
    'occupiedUnits', (SELECT COUNT(*) FROM units WHERE status = 'occupied'),
    'occupancyRate', (
      SELECT CASE
        WHEN COUNT(*) > 0
        THEN ROUND((COUNT(*) FILTER (WHERE status = 'occupied')::decimal / COUNT(*)) * 100, 1)
        ELSE 0
      END
      FROM units
    ),
    'activeLeases', (SELECT COUNT(*) FROM leases WHERE status = 'active'),
    'monthlyRevenue', (SELECT COALESCE(SUM(monthly_rent), 0) FROM leases WHERE status = 'active'),
    'totalTenants', (SELECT COUNT(*) FROM tenants WHERE status = 'active'),
    'activeTasks', (SELECT COUNT(*) FROM tasks WHERE status NOT IN ('completed', 'cancelled')),
    'overdueTasksCount', (SELECT COUNT(*) FROM tasks WHERE status NOT IN ('completed', 'cancelled') AND due_date < NOW()),
    'maintenanceRequests', (SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'in_progress')),
    'outstandingBalance', (SELECT COALESCE(SUM(amount + COALESCE(late_fee, 0)), 0) FROM payment_history WHERE status IN ('pending', 'failed'))
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RPC FUNCTION FOR TASK SUMMARY (SINGLE QUERY)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_task_summary_optimized()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'inProgress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'overdue', COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND due_date < NOW()),
    'byPriority', json_build_object(
      'high', COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('completed', 'cancelled')),
      'medium', COUNT(*) FILTER (WHERE priority = 'medium' AND status NOT IN ('completed', 'cancelled')),
      'low', COUNT(*) FILTER (WHERE priority = 'low' AND status NOT IN ('completed', 'cancelled'))
    )
  ) INTO result
  FROM tasks;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RPC FUNCTION FOR PROPERTY PERFORMANCE (SINGLE QUERY WITH JOINS)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_property_performance_optimized()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'units', COALESCE(u.total_units, 0),
      'occupied', COALESCE(u.occupied_units, 0),
      'occupancyRate', CASE
        WHEN COALESCE(u.total_units, 0) > 0
        THEN ROUND((COALESCE(u.occupied_units, 0)::decimal / u.total_units) * 100, 1)
        ELSE 0
      END,
      'monthlyRevenue', COALESCE(l.monthly_revenue, 0),
      'outstandingBalance', COALESCE(ph.outstanding, 0),
      'maintenanceCosts', COALESCE(wo.costs, 0)
    )
    ORDER BY COALESCE(l.monthly_revenue, 0) DESC
  ) INTO result
  FROM properties p
  LEFT JOIN (
    SELECT property_id,
           COUNT(*) as total_units,
           COUNT(*) FILTER (WHERE status = 'occupied') as occupied_units
    FROM units GROUP BY property_id
  ) u ON u.property_id = p.id
  LEFT JOIN (
    SELECT property_id, SUM(monthly_rent) as monthly_revenue
    FROM leases WHERE status = 'active' GROUP BY property_id
  ) l ON l.property_id = p.id
  LEFT JOIN (
    SELECT l.property_id, SUM(ph.amount + COALESCE(ph.late_fee, 0)) as outstanding
    FROM payment_history ph
    JOIN leases l ON ph.lease_id = l.id
    WHERE ph.status IN ('pending', 'failed')
    GROUP BY l.property_id
  ) ph ON ph.property_id = p.id
  LEFT JOIN (
    SELECT property_id, SUM(actual_cost) as costs
    FROM work_orders
    WHERE completed_date >= NOW() - INTERVAL '30 days'
    GROUP BY property_id
  ) wo ON wo.property_id = p.id
  WHERE p.status = 'active';

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RPC FUNCTION FOR REVENUE TREND (OPTIMIZED SINGLE QUERY)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_revenue_trend_optimized(months_back integer DEFAULT 6)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  WITH date_series AS (
    SELECT generate_series(
      date_trunc('month', NOW()) - ((months_back - 1) || ' months')::interval,
      date_trunc('month', NOW()),
      '1 month'::interval
    ) as month_start
  ),
  monthly_revenue AS (
    SELECT
      date_trunc('month', payment_date) as month,
      SUM(amount) as revenue
    FROM payments
    WHERE status = 'paid'
      AND payment_date >= date_trunc('month', NOW()) - ((months_back - 1) || ' months')::interval
    GROUP BY date_trunc('month', payment_date)
  ),
  monthly_expenses AS (
    SELECT
      date_trunc('month', expense_date) as month,
      SUM(amount) as expenses
    FROM expenses
    WHERE expense_date >= date_trunc('month', NOW()) - ((months_back - 1) || ' months')::interval
    GROUP BY date_trunc('month', expense_date)
  ),
  work_order_costs AS (
    SELECT
      date_trunc('month', completed_date) as month,
      SUM(actual_cost) as costs
    FROM work_orders
    WHERE completed_date >= date_trunc('month', NOW()) - ((months_back - 1) || ' months')::interval
    GROUP BY date_trunc('month', completed_date)
  )
  SELECT json_agg(
    json_build_object(
      'month', to_char(ds.month_start, 'Mon ''YY'),
      'revenue', COALESCE(mr.revenue, 0)::integer,
      'expenses', (COALESCE(me.expenses, 0) + COALESCE(wc.costs, 0))::integer,
      'profit', (COALESCE(mr.revenue, 0) - COALESCE(me.expenses, 0) - COALESCE(wc.costs, 0))::integer
    )
    ORDER BY ds.month_start
  ) INTO result
  FROM date_series ds
  LEFT JOIN monthly_revenue mr ON mr.month = ds.month_start
  LEFT JOIN monthly_expenses me ON me.month = ds.month_start
  LEFT JOIN work_order_costs wc ON wc.month = ds.month_start;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RPC FUNCTION FOR OCCUPANCY TREND
-- ============================================================================

CREATE OR REPLACE FUNCTION get_occupancy_trend_optimized(months_back integer DEFAULT 6)
RETURNS json AS $$
DECLARE
  result json;
  total_units integer;
BEGIN
  SELECT COUNT(*) INTO total_units FROM units;

  IF total_units = 0 THEN
    -- Return empty array with zeros
    SELECT json_agg(
      json_build_object(
        'month', to_char(month_start, 'Mon'),
        'occupancyRate', 0
      )
      ORDER BY month_start
    ) INTO result
    FROM generate_series(
      date_trunc('month', NOW()) - ((months_back - 1) || ' months')::interval,
      date_trunc('month', NOW()),
      '1 month'::interval
    ) as month_start;

    RETURN result;
  END IF;

  WITH date_series AS (
    SELECT generate_series(
      date_trunc('month', NOW()) - ((months_back - 1) || ' months')::interval,
      date_trunc('month', NOW()),
      '1 month'::interval
    ) as month_start
  ),
  monthly_occupancy AS (
    SELECT
      ds.month_start,
      COUNT(DISTINCT l.unit_id) as occupied_units
    FROM date_series ds
    LEFT JOIN leases l ON
      l.start_date <= (ds.month_start + interval '1 month' - interval '1 day') AND
      (l.end_date IS NULL OR l.end_date >= ds.month_start)
    GROUP BY ds.month_start
  )
  SELECT json_agg(
    json_build_object(
      'month', to_char(mo.month_start, 'Mon'),
      'occupancyRate', ROUND((mo.occupied_units::decimal / total_units) * 100, 1)
    )
    ORDER BY mo.month_start
  ) INTO result
  FROM monthly_occupancy mo;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RPC FUNCTION FOR WORKFLOW COUNTS (OPTIMIZED FOR WORKFLOW CARDS)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_workflow_counts()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'propertyCount', (SELECT COUNT(*) FROM properties WHERE status = 'active'),
    'unitCount', (SELECT COUNT(*) FROM units),
    'tenantCount', (SELECT COUNT(*) FROM tenants WHERE status = 'active'),
    'leaseCount', (SELECT COUNT(*) FROM leases WHERE status = 'active'),
    'expiringLeaseCount', (
      SELECT COUNT(*) FROM leases
      WHERE status = 'active' AND end_date <= NOW() + INTERVAL '60 days'
    ),
    'taskCount', (SELECT COUNT(*) FROM tasks WHERE status = 'pending')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;

-- Note: Run ANALYZE after creating indexes to update statistics
ANALYZE properties;
ANALYZE units;
ANALYZE leases;
ANALYZE tasks;
ANALYZE tenants;
ANALYZE payment_history;
ANALYZE payments;
ANALYZE expenses;
ANALYZE work_orders;
