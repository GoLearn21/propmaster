-- Check calendar events
SELECT
  id,
  title,
  event_type,
  start_time,
  end_time,
  status,
  created_by,
  TO_CHAR(start_time, 'YYYY-MM-DD HH24:MI') as formatted_start
FROM calendar_events
ORDER BY start_time;
