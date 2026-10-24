import { useSearchParams } from "react-router";
import type { ComplaintListParams } from "@/hooks/queries";

export function useComplaintFilters() {
  const [params, setParams] = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }

  const values: ComplaintListParams = {
    search: params.get("search") ?? undefined,
    status: params.get("status") ?? undefined,
    priority: params.get("priority") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    departmentId: params.get("departmentId") ?? undefined,
    assignedTo: params.get("assignedTo") ?? undefined,
    overdue: params.get("overdue") ?? undefined,
    sort: params.get("sort") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? "12",
  };

  return { values, set, page: Number(params.get("page") ?? 1) };
}
