import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiData, apiRequest } from "@/lib/api";
import type { ApiErrorBody, Category, Department, PaginationMeta, Role, User } from "@/types";

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as ApiErrorBody).message;
    if (typeof message === "string" && message.trim().length > 0) return message;
  }
  return fallback;
}

export interface CategoryWrite {
  name: string;
  description: string | null;
  icon: string | null;
  slaHours: number;
  departmentId: number;
}

export interface DepartmentWrite {
  name: string;
  email: string | null;
  description: string | null;
}

export interface UserCreateBody {
  name: string;
  email: string;
  password: string;
  role: Role;
  departmentId?: number | null;
}

export interface UserUpdateBody {
  name?: string;
  role?: Role;
  departmentId?: number | null;
  isActive?: boolean;
  password?: string;
}

export interface ProfileUpdateBody {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UserListParams {
  role?: string;
  departmentId?: string;
  search?: string;
  page?: string;
  limit?: string;
}

function toQuery(params: UserListParams): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: ["users", params],
    placeholderData: keepPreviousData,
    queryFn: () =>
      apiRequest<User[]>("get", `/users${toQuery(params)}`).then((result) => ({
        rows: result.data,
        meta: result.meta as PaginationMeta | undefined,
      })),
  });
}

function useAdminClient() {
  return useQueryClient();
}

export function useCreateCategory() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: (body: CategoryWrite) => apiData<Category>("post", "/categories", body),
    onSuccess: (created) => {
      queryClient.setQueryData<Category[]>(["categories"], (current) => {
        const next = { ...created, complaintCount: created.complaintCount ?? 0 };
        return current ? [...current, next] : [next];
      });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CategoryWrite }) =>
      apiData<Category>("put", `/categories/${id}`, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<Category[]>(["categories"], (current) =>
        current?.map((row) =>
          row.id === updated.id
            ? { ...row, ...updated, complaintCount: updated.complaintCount ?? row.complaintCount }
            : row,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: (id: number) => apiData<void>("delete", `/categories/${id}`),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Category[]>(["categories"], (current) => current?.filter((row) => row.id !== id));
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: (body: DepartmentWrite) => apiData<Department>("post", "/departments", body),
    onSuccess: (created) => {
      queryClient.setQueryData<Department[]>(["departments"], (current) => {
        const next = {
          ...created,
          staffCount: created.staffCount ?? 0,
          categoryCount: created.categoryCount ?? 0,
        };
        return current ? [...current, next] : [next];
      });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: DepartmentWrite }) =>
      apiData<Department>("put", `/departments/${id}`, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<Department[]>(["departments"], (current) =>
        current?.map((row) =>
          row.id === updated.id
            ? {
                ...row,
                ...updated,
                staffCount: updated.staffCount ?? row.staffCount,
                categoryCount: updated.categoryCount ?? row.categoryCount,
              }
            : row,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: (id: number) => apiData<void>("delete", `/departments/${id}`),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Department[]>(["departments"], (current) => current?.filter((row) => row.id !== id));
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

interface UserListCache {
  rows: User[];
  meta?: PaginationMeta;
}

function isUserRecord(value: unknown): value is User {
  return Boolean(value && typeof value === "object" && "id" in value && "email" in value);
}

function patchCachedUser(queryClient: ReturnType<typeof useQueryClient>, updated: User) {
  queryClient.setQueriesData<UserListCache>({ queryKey: ["users"] }, (current) => {
    if (!current?.rows) return current;
    return {
      ...current,
      rows: current.rows.map((row) => (row.id === updated.id ? updated : row)),
    };
  });
}

export function useCreateUser() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: (body: UserCreateBody) => apiData<User>("post", "/users", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UserUpdateBody }) => apiData<User>("put", `/users/${id}`, body),
    onSuccess: (updated) => {
      if (isUserRecord(updated)) patchCachedUser(queryClient, updated);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: (id: number) => apiData<User>("delete", `/users/${id}`),
    onSuccess: (updated) => {
      if (isUserRecord(updated)) patchCachedUser(queryClient, updated);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useReactivateUser() {
  const queryClient = useAdminClient();
  return useMutation({
    mutationFn: (id: number) => apiData<User>("put", `/users/${id}`, { isActive: true } satisfies UserUpdateBody),
    onSuccess: (updated) => {
      if (isUserRecord(updated)) patchCachedUser(queryClient, updated);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (body: ProfileUpdateBody) => apiData<{ user: User }>("put", "/auth/me", body),
  });
}
