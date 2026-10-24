import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiData, apiRequest } from "@/lib/api";
import type {
  AiAccuracy,
  AiInsights,
  AiSuggestion,
  AnalyticsSummary,
  Category,
  CategoryCount,
  ComplaintDetail,
  ComplaintStatus,
  ComplaintSummary,
  Department,
  DepartmentPerformance,
  PaginationMeta,
  Ref,
  SimilarComplaint,
  TrackResult,
  TrendPoint,
  UpvoteResult,
} from "@/types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiData<Category[]>("get", "/categories"),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => apiData<Department[]>("get", "/departments"),
  });
}

export function useDepartmentStaff(departmentId: number | undefined) {
  return useQuery({
    queryKey: ["departments", departmentId, "staff"],
    queryFn: () => apiData<Ref[]>("get", `/departments/${departmentId}/staff`),
    enabled: Boolean(departmentId),
  });
}

export interface ComplaintListParams {
  status?: string;
  priority?: string;
  categoryId?: string;
  departmentId?: string;
  assignedTo?: string;
  overdue?: string;
  search?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

function toQuery(params: ComplaintListParams): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function useComplaints(params: ComplaintListParams) {
  return useQuery({
    queryKey: ["complaints", params],
    queryFn: () =>
      apiRequest<ComplaintSummary[]>("get", `/complaints${toQuery(params)}`).then((result) => ({
        rows: result.data,
        meta: result.meta as PaginationMeta | undefined,
      })),
  });
}

export function useFeed(params: ComplaintListParams) {
  return useQuery({
    queryKey: ["complaints", "feed", params],
    queryFn: () =>
      apiRequest<ComplaintSummary[]>("get", `/complaints/feed${toQuery(params)}`).then((result) => ({
        rows: result.data,
        meta: result.meta as PaginationMeta | undefined,
      })),
  });
}

export function useComplaint(id: string | undefined) {
  return useQuery({
    queryKey: ["complaint", id],
    queryFn: () => apiData<ComplaintDetail>("get", `/complaints/${id}`),
    enabled: Boolean(id),
  });
}

export function useTrack(ticketCode: string | undefined) {
  return useQuery({
    queryKey: ["track", ticketCode],
    queryFn: () => apiData<TrackResult>("get", `/track/${ticketCode}`),
    enabled: Boolean(ticketCode),
  });
}

export function useAnalyzeComplaint() {
  return useMutation({
    mutationFn: (input: { description: string; title?: string; location?: string; image?: File }) => {
      const form = new FormData();
      form.append("description", input.description);
      if (input.title) form.append("title", input.title);
      if (input.location) form.append("location", input.location);
      if (input.image) form.append("image", input.image);
      return apiData<AiSuggestion>("post", "/ai/analyze", form);
    },
  });
}

export function useFindDuplicates() {
  return useMutation({
    mutationFn: (body: { title?: string; description: string; categoryId?: number }) =>
      apiData<SimilarComplaint[]>("post", "/ai/duplicates", body),
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => apiData<ComplaintDetail>("post", "/complaints", form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}

export function useUpdateComplaint(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiData<ComplaintDetail>("put", `/complaints/${id}`, body),
    onSuccess: (detail) => {
      queryClient.setQueryData(["complaint", String(id)], detail);
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}

export function useDeleteComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiData<void>("delete", `/complaints/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
      void queryClient.invalidateQueries({ queryKey: ["complaint"] });
    },
  });
}

export function useChangeStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: ComplaintStatus; note?: string }) =>
      apiData<ComplaintDetail>("patch", `/complaints/${id}/status`, body),
    onSuccess: (detail) => {
      queryClient.setQueryData(["complaint", String(id)], detail);
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useAssignComplaint(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignedToId: number | null) =>
      apiData<ComplaintDetail>("patch", `/complaints/${id}/assign`, { assignedToId }),
    onSuccess: (detail) => {
      queryClient.setQueryData(["complaint", String(id)], detail);
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}

export function useToggleUpvote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, hasUpvoted }: { id: number; hasUpvoted: boolean }) => {
      const result = hasUpvoted
        ? await apiData<UpvoteResult>("delete", `/complaints/${id}/upvote`)
        : await apiData<UpvoteResult>("post", `/complaints/${id}/upvote`);
      return { id, ...result };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
      void queryClient.invalidateQueries({ queryKey: ["complaint"] });
    },
  });
}

export function useGiveFeedback(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { rating: number; comment?: string }) =>
      apiData<ComplaintDetail["feedback"]>("post", `/complaints/${id}/feedback`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["complaint", String(id)] });
    },
  });
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => apiData<AnalyticsSummary>("get", "/analytics/summary"),
  });
}

export function useAnalyticsByCategory() {
  return useQuery({
    queryKey: ["analytics", "by-category"],
    queryFn: () => apiData<CategoryCount[]>("get", "/analytics/by-category"),
  });
}

export function useAnalyticsByDepartment() {
  return useQuery({
    queryKey: ["analytics", "by-department"],
    queryFn: () => apiData<DepartmentPerformance[]>("get", "/analytics/by-department"),
  });
}

export function useAnalyticsTrend() {
  return useQuery({
    queryKey: ["analytics", "trend"],
    queryFn: () => apiData<TrendPoint[]>("get", "/analytics/trend?days=30"),
  });
}

export function useAiAccuracy() {
  return useQuery({
    queryKey: ["analytics", "ai-accuracy"],
    queryFn: () => apiData<AiAccuracy>("get", "/analytics/ai-accuracy"),
  });
}

export function useAiInsights() {
  return useQuery({
    queryKey: ["ai", "insights"],
    queryFn: () => apiData<AiInsights>("get", "/ai/insights"),
  });
}

export function useRefreshInsights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiData<AiInsights>("get", "/ai/insights?refresh=true"),
    onSuccess: (data) => {
      queryClient.setQueryData(["ai", "insights"], data);
    },
  });
}
