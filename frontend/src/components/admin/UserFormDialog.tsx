import { useLayoutEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { QueryError } from "@/components/complaints/QueryError";
import { useDepartments } from "@/hooks/queries";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role, User } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiErrorMessage, useCreateUser, useUpdateUser, type UserCreateBody, type UserUpdateBody } from "@/components/admin/admin-api";
import { FieldError } from "@/components/admin/FieldError";
import { FormAlert } from "@/components/admin/FormAlert";
import { isStrongPassword, PASSWORD_RULE } from "@/components/admin/validation";

const ROLES: Role[] = ["STUDENT", "STAFF", "ADMIN"];

const userSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be 2–80 characters").max(80, "Name must be 2–80 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Enter a valid email")
      .max(120, "Email must be at most 120 characters")
      .refine((value) => z.email().safeParse(value).success, "Enter a valid email"),
    password: z.string(),
    role: z.enum(["STUDENT", "STAFF", "ADMIN"]),
    departmentId: z.string(),
    mode: z.enum(["create", "edit"]),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "create" || value.password.length > 0) {
      if (!isStrongPassword(value.password)) {
        ctx.addIssue({ code: "custom", path: ["password"], message: PASSWORD_RULE });
      }
    }
    if (value.role === "STAFF" && (value.departmentId === "" || value.departmentId === "none")) {
      ctx.addIssue({ code: "custom", path: ["departmentId"], message: "Choose a department for staff" });
    }
  });

type UserFormValues = z.infer<typeof userSchema>;

const EMPTY_USER_FORM: UserFormValues = {
  name: "",
  email: "",
  password: "",
  role: "STUDENT",
  departmentId: "none",
  mode: "create",
};

function toUserForm(user: User): UserFormValues {
  return {
    name: user.name,
    email: user.email,
    password: "",
    role: user.role,
    departmentId: user.department ? String(user.department.id) : "none",
    mode: "edit",
  };
}

function departmentIdFromForm(value: string): number | null {
  if (!value || value === "none") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function UserFormDialog({
  open,
  user,
  onOpenChange,
}: {
  open: boolean;
  user: User | null;
  onOpenChange: (open: boolean) => void;
}) {
  const departmentsQuery = useDepartments();
  const create = useCreateUser();
  const update = useUpdateUser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: EMPTY_USER_FORM,
  });
  const { reset } = form;
  const pending = create.isPending || update.isPending;
  const role = form.watch("role");
  const departmentValue = form.watch("departmentId");
  const knownDepartment =
    departmentValue === "none" ||
    (departmentsQuery.data ?? []).some((department) => String(department.id) === departmentValue);

  useLayoutEffect(() => {
    if (!open) return;
    reset(user ? toUserForm(user) : EMPTY_USER_FORM);
    setSubmitError(null);
  }, [open, user, reset]);

  async function onSubmit(values: UserFormValues) {
    setSubmitError(null);
    const departmentId = departmentIdFromForm(values.departmentId);
    try {
      if (user) {
        const body: UserUpdateBody = {
          name: values.name.trim(),
          role: values.role,
          departmentId,
        };
        if (values.password) body.password = values.password;
        await update.mutateAsync({ id: user.id, body });
        toast.success("User updated");
      } else {
        const body: UserCreateBody = {
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          role: values.role,
          departmentId,
        };
        await create.mutateAsync(body);
        toast.success("User created");
      }
      onOpenChange(false);
    } catch (error) {
      const message = apiErrorMessage(error, "Could not save user");
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{user ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {user
              ? "Update the account. Email stays as it was created. Leave the password blank to keep it."
              : "Create a student, staff or admin account. Staff must belong to a department."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" autoComplete="off" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <input type="hidden" {...form.register("mode")} />
          <div className="space-y-2">
            <Label htmlFor="user-name">Name</Label>
            <Input id="user-name" autoComplete="off" {...form.register("name")} aria-invalid={Boolean(form.formState.errors.name)} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              autoComplete="off"
              readOnly={Boolean(user)}
              className={user ? "bg-slate-50 text-slate-500" : undefined}
              {...form.register("email")}
              aria-invalid={Boolean(form.formState.errors.email)}
            />
            <FieldError message={form.formState.errors.email?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-label="Role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[60]">
                      {ROLES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {ROLE_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={form.formState.errors.role?.message} />
            </div>
            <div className="space-y-2">
              <Label>{role === "STAFF" ? "Department" : "Department (optional)"}</Label>
              {departmentsQuery.isError ? (
                <QueryError error={departmentsQuery.error} onRetry={() => void departmentsQuery.refetch()} />
              ) : (
                <Controller
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={departmentsQuery.isPending}>
                      <SelectTrigger className="w-full" aria-label="Department">
                        <SelectValue placeholder={departmentsQuery.isPending ? "Loading…" : "No department"} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[60]">
                        <SelectItem value="none">No department</SelectItem>
                        {!knownDepartment && departmentValue ? (
                          <SelectItem value={departmentValue}>Saved department</SelectItem>
                        ) : null}
                        {(departmentsQuery.data ?? []).map((department) => (
                          <SelectItem key={department.id} value={String(department.id)}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              <FieldError message={form.formState.errors.departmentId?.message} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">{user ? "New password" : "Password"}</Label>
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              placeholder={user ? "Leave blank to keep the current password" : PASSWORD_RULE}
              {...form.register("password")}
              aria-invalid={Boolean(form.formState.errors.password)}
            />
            <FieldError message={form.formState.errors.password?.message} />
          </div>
          <FormAlert message={submitError} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : user ? "Save changes" : "Add user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
