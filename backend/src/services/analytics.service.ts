import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface SummaryAnalytics {
  total: number;
  submitted: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  overdue: number;
  avgResolutionHours: number;
  avgRating: number;
  last7Days: number;
}

export interface CategoryAnalytics {
  id: number;
  name: string;
  icon: string | null;
  count: number;
}

export interface DepartmentAnalytics {
  id: number;
  name: string;
  total: number;
  open: number;
  resolved: number;
  overdue: number;
  avgResolutionHours: number;
}

export interface TrendAnalytics {
  date: string;
  created: number;
  resolved: number;
}

export interface AiAccuracyAnalytics {
  aiSuggested: number;
  categoryKept: number;
  priorityKept: number;
  categoryAccuracy: number;
  priorityAccuracy: number;
}

const toNum = (val: unknown, fallback = 0): number => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'bigint') return Number(val);
  const parsed = Number(val);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Summary KPIs: total, counts by status, overdue, avg resolution time, avg feedback rating, last 7 days.
 * Scoped to department if deptId is provided (e.g. for staff members).
 */
export async function getSummary(deptId?: number): Promise<SummaryAnalytics> {
  const whereClause = deptId ? Prisma.sql`WHERE department_id = ${deptId}` : Prisma.empty;

  const [summaryRows, ratingRows] = await Promise.all([
    prisma.$queryRaw<any[]>`
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
      FROM complaints
      ${whereClause};
    `,
    deptId
      ? prisma.$queryRaw<any[]>`
          SELECT ROUND(AVG(f.rating)::numeric, 2) AS avg_rating
          FROM feedback f
          JOIN complaints c ON c.id = f.complaint_id
          WHERE c.department_id = ${deptId};
        `
      : prisma.$queryRaw<any[]>`
          SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating FROM feedback;
        `,
  ]);

  const row = summaryRows[0] || {};
  const ratingRow = ratingRows[0] || {};

  return {
    total: toNum(row.total),
    submitted: toNum(row.submitted),
    inProgress: toNum(row.in_progress),
    resolved: toNum(row.resolved),
    rejected: toNum(row.rejected),
    overdue: toNum(row.overdue),
    avgResolutionHours: toNum(row.avg_resolution_hours, 0),
    avgRating: toNum(ratingRow.avg_rating, 0),
    last7Days: toNum(row.last_7_days),
  };
}

/**
 * Counts per category, descending.
 * Scoped to department if deptId is provided.
 */
export async function getByCategory(deptId?: number): Promise<CategoryAnalytics[]> {
  const whereClause = deptId ? Prisma.sql`WHERE c.department_id = ${deptId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<any[]>`
    SELECT c.id, c.name, c.icon, COUNT(x.id) AS count
    FROM categories c
    LEFT JOIN complaints x ON x.category_id = c.id
    ${whereClause}
    GROUP BY c.id, c.name, c.icon
    ORDER BY count DESC;
  `;

  return rows.map((r) => ({
    id: toNum(r.id),
    name: String(r.name),
    icon: r.icon ? String(r.icon) : null,
    count: toNum(r.count),
  }));
}

/**
 * Performance metrics broken down by department (total, open, resolved, overdue, avg resolution hours).
 */
export async function getByDepartment(): Promise<DepartmentAnalytics[]> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT d.id, d.name,
      COUNT(x.id)                                                        AS total,
      COUNT(x.id) FILTER (WHERE x.status IN ('SUBMITTED','IN_PROGRESS')) AS open,
      COUNT(x.id) FILTER (WHERE x.status = 'RESOLVED')                   AS resolved,
      COUNT(x.id) FILTER (WHERE x.status IN ('SUBMITTED','IN_PROGRESS') AND x.due_at < now()) AS overdue,
      ROUND(AVG(EXTRACT(EPOCH FROM (x.resolved_at - x.created_at)) / 3600)
            FILTER (WHERE x.resolved_at IS NOT NULL)::numeric, 1)        AS avg_resolution_hours
    FROM departments d
    LEFT JOIN complaints x ON x.department_id = d.id
    GROUP BY d.id, d.name
    ORDER BY total DESC;
  `;

  return rows.map((r) => ({
    id: toNum(r.id),
    name: String(r.name),
    total: toNum(r.total),
    open: toNum(r.open),
    resolved: toNum(r.resolved),
    overdue: toNum(r.overdue),
    avgResolutionHours: toNum(r.avg_resolution_hours, 0),
  }));
}

/**
 * Daily trend for the last N days (created vs resolved counts).
 */
export async function getTrend(days = 30, deptId?: number): Promise<TrendAnalytics[]> {
  const safeDays = Math.max(1, Math.min(365, days));
  const deptFilterCreated = deptId ? Prisma.sql`AND department_id = ${deptId}` : Prisma.empty;
  const deptFilterResolved = deptId ? Prisma.sql`AND department_id = ${deptId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<any[]>`
    SELECT to_char(day, 'YYYY-MM-DD') AS date,
      (SELECT COUNT(*) FROM complaints WHERE created_at::date = day ${deptFilterCreated}) AS created,
      (SELECT COUNT(*) FROM complaints WHERE resolved_at::date = day ${deptFilterResolved}) AS resolved
    FROM generate_series(current_date - (${safeDays}::int - 1), current_date, interval '1 day') AS day
    ORDER BY day;
  `;

  return rows.map((r) => ({
    date: String(r.date),
    created: toNum(r.created),
    resolved: toNum(r.resolved),
  }));
}

/**
 * AI triage accuracy metrics: suggestions kept by students/staff.
 */
export async function getAiAccuracy(): Promise<AiAccuracyAnalytics> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      COUNT(*) FILTER (WHERE x.ai_category_name IS NOT NULL)          AS ai_suggested,
      COUNT(*) FILTER (WHERE x.ai_category_name = c.name)             AS category_kept,
      COUNT(*) FILTER (WHERE x.ai_priority = x.priority)              AS priority_kept
    FROM complaints x
    JOIN categories c ON c.id = x.category_id;
  `;

  const row = rows[0] || {};
  const aiSuggested = toNum(row.ai_suggested);
  const categoryKept = toNum(row.category_kept);
  const priorityKept = toNum(row.priority_kept);

  return {
    aiSuggested,
    categoryKept,
    priorityKept,
    categoryAccuracy: aiSuggested > 0 ? Number((categoryKept / aiSuggested).toFixed(3)) : 0,
    priorityAccuracy: aiSuggested > 0 ? Number((priorityKept / aiSuggested).toFixed(3)) : 0,
  };
}
