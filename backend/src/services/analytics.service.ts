/**
 * TEMPORARY STUB (owner: Member 3 / Database). Created so ai.service.ts compiles before the real
 * implementation lands. Replace the bodies with the queries from MASTER_PLAN 9.6, keeping the
 * exported names and return shapes (MASTER_PLAN 10.4 "Analytics").
 */

export interface AnalyticsSummary {
  total: number;
  submitted: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  overdue: number;
  avgResolutionHours: number | null;
  avgRating: number | null;
  last7Days: number;
}

export interface CategoryCount {
  id: number;
  name: string;
  icon: string | null;
  count: number;
}

export interface DepartmentStats {
  id: number;
  name: string;
  total: number;
  open: number;
  resolved: number;
  overdue: number;
  avgResolutionHours: number | null;
}

export async function getSummary(_departmentId?: number | null): Promise<AnalyticsSummary> {
  return {
    total: 0,
    submitted: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    overdue: 0,
    avgResolutionHours: null,
    avgRating: null,
    last7Days: 0,
  };
}

export async function getByCategory(_departmentId?: number | null): Promise<CategoryCount[]> {
  return [];
}

export async function getByDepartment(): Promise<DepartmentStats[]> {
  return [];
}

export interface TrendPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface AiAccuracy {
  aiSuggested: number;
  categoryKept: number;
  priorityKept: number;
  categoryAccuracy: number;
  priorityAccuracy: number;
}

/** // STUB – DB member will replace */
export async function getTrend(_days: number, _departmentId?: number | null): Promise<TrendPoint[]> {
  return [];
}

/** // STUB – DB member will replace */
export async function getAiAccuracy(): Promise<AiAccuracy> {
  return { aiSuggested: 0, categoryKept: 0, priorityKept: 0, categoryAccuracy: 0, priorityAccuracy: 0 };
}
