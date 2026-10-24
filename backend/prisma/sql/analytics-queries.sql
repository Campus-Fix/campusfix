-- Reference SQL queries used by analytics.service.ts and duplicate.service.ts (Section 9.6)

-- 1. Summary KPIs
-- Note: Staff calls add `WHERE department_id = $dept`
SELECT
  COUNT(*)                                                         AS total,
  COUNT(*) FILTER (WHERE status = 'SUBMITTED')                     AS submitted,
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')                   AS in_progress,
  COUNT(*) FILTER (WHERE status = 'RESOLVED')                      AS resolved,
  COUNT(*) FILTER (WHERE status = 'REJECTED')                      AS rejected,
  COUNT(*) FILTER (WHERE status IN ('SUBMITTED','IN_PROGRESS') AND due_at < now()) AS overdue,
  ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
        FILTER (WHERE resolved_at IS NOT NULL)::numeric, 1)        AS avg_resolution_hours,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')  AS last_7_days
FROM complaints;

-- Avg Rating
SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating FROM feedback;

-- 2. By Category
SELECT c.id, c.name, c.icon, COUNT(x.id) AS count
FROM categories c
LEFT JOIN complaints x ON x.category_id = c.id
GROUP BY c.id ORDER BY count DESC;

-- 3. By Department (with performance)
SELECT d.id, d.name,
  COUNT(x.id)                                                  AS total,
  COUNT(x.id) FILTER (WHERE x.status IN ('SUBMITTED','IN_PROGRESS')) AS open,
  COUNT(x.id) FILTER (WHERE x.status = 'RESOLVED')             AS resolved,
  COUNT(x.id) FILTER (WHERE x.status IN ('SUBMITTED','IN_PROGRESS') AND x.due_at < now()) AS overdue,
  ROUND(AVG(EXTRACT(EPOCH FROM (x.resolved_at - x.created_at)) / 3600)
        FILTER (WHERE x.resolved_at IS NOT NULL)::numeric, 1)  AS avg_resolution_hours
FROM departments d
LEFT JOIN complaints x ON x.department_id = d.id
GROUP BY d.id ORDER BY total DESC;

-- 4. Daily Trend (created vs resolved, last N days)
SELECT to_char(day, 'YYYY-MM-DD') AS date,
  (SELECT COUNT(*) FROM complaints WHERE created_at::date  = day) AS created,
  (SELECT COUNT(*) FROM complaints WHERE resolved_at::date = day) AS resolved
FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') AS day
ORDER BY day;

-- 5. AI Accuracy
SELECT
  COUNT(*) FILTER (WHERE x.ai_category_name IS NOT NULL)          AS ai_suggested,
  COUNT(*) FILTER (WHERE x.ai_category_name = c.name)             AS category_kept,
  COUNT(*) FILTER (WHERE x.ai_priority = x.priority)              AS priority_kept
FROM complaints x JOIN categories c ON c.id = x.category_id;

-- 6. Save Embedding
UPDATE complaints SET embedding = $1::vector WHERE id = $2;

-- 7. Find Similar Open Complaints
SELECT x.id, x.ticket_code, x.title, x.location, x.status,
       c.name AS category_name,
       (SELECT COUNT(*) FROM upvotes u WHERE u.complaint_id = x.id) AS upvote_count,
       1 - (x.embedding <=> $1::vector) AS similarity
FROM complaints x
JOIN categories c ON c.id = x.category_id
WHERE x.embedding IS NOT NULL
  AND x.status IN ('SUBMITTED', 'IN_PROGRESS')
  AND x.created_at >= now() - interval '30 days'
ORDER BY x.embedding <=> $1::vector
LIMIT 5;
