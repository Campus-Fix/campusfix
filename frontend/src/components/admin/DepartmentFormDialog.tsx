import { useLayoutEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Department } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import {
  apiErrorMessage,
  useCreateDepartment,
  useUpdateDepartment,
  type DepartmentWrite,
} from "@/components/admin/admin-api";
import { FieldError } from "@/components/admin/FieldError";
import { FormAlert } from "@/components/admin/FormAlert";
import { emptyToNull } from "@/components/admin/validation";

const departmentSchema = z.object({
  name: z.string().trim().min(2, "Name must be 2–80 characters").max(80, "Name must be 2–80 characters"),
  email: z
    .string()
    .trim()
    .max(120, "Email must be at most 120 characters")
    .refine((value) => value.length === 0 || z.email().safeParse(value).success, "Enter a valid email"),
  description: z.string().trim().max(500, "Description must be at most 500 characters"),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

const EMPTY_DEPARTMENT_FORM: DepartmentFormValues = {
  name: "",
  email: "",
  description: "",
};

function toDepartmentForm(department: Department): DepartmentFormValues {
  return {
    name: department.name,
    email: department.email ?? "",
    description: department.description ?? "",
  };
}

function toDepartmentWrite(values: DepartmentFormValues): DepartmentWrite {
  return {
    name: values.name.trim(),
    email: emptyToNull(values.email),
    description: emptyToNull(values.description),
  };
}

export function DepartmentFormDialog({
  open,
  department,
  onOpenChange,
}: {
  open: boolean;
  department: Department | null;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: EMPTY_DEPARTMENT_FORM,
  });
  const { reset } = form;
  const pending = create.isPending || update.isPending;

  useLayoutEffect(() => {
    if (!open) return;
    reset(department ? toDepartmentForm(department) : EMPTY_DEPARTMENT_FORM);
    setSubmitError(null);
  }, [open, department, reset]);

  async function onSubmit(values: DepartmentFormValues) {
    setSubmitError(null);
    const body = toDepartmentWrite(values);
    try {
      if (department) {
        await update.mutateAsync({ id: department.id, body });
        toast.success("Department updated");
      } else {
        await create.mutateAsync(body);
        toast.success("Department created");
      }
      onOpenChange(false);
    } catch (error) {
      const message = apiErrorMessage(error, "Could not save department");
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
          <DialogTitle>{department ? "Edit department" : "Add department"}</DialogTitle>
          <DialogDescription>Departments own categories and the staff who work those complaints.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" autoComplete="off" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="department-name">Name</Label>
            <Input id="department-name" {...form.register("name")} aria-invalid={Boolean(form.formState.errors.name)} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department-email">Email</Label>
            <Input
              id="department-email"
              type="email"
              autoComplete="off"
              placeholder="it@campusfix.edu"
              {...form.register("email")}
              aria-invalid={Boolean(form.formState.errors.email)}
            />
            <FieldError message={form.formState.errors.email?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department-description">Description</Label>
            <Textarea id="department-description" rows={3} {...form.register("description")} />
            <FieldError message={form.formState.errors.description?.message} />
          </div>
          <FormAlert message={submitError} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : department ? "Save changes" : "Add department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
