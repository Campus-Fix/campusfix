import { useLayoutEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { QueryError } from "@/components/complaints/QueryError";
import { useDepartments } from "@/hooks/queries";
import type { Category } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage, useCreateCategory, useUpdateCategory, type CategoryWrite } from "@/components/admin/admin-api";
import { FieldError } from "@/components/admin/FieldError";
import { FormAlert } from "@/components/admin/FormAlert";
import { emptyToNull } from "@/components/admin/validation";

const ICON_OPTIONS = [
  { value: "wifi", label: "Wi-Fi" },
  { value: "monitor", label: "Monitor" },
  { value: "zap", label: "Electrical" },
  { value: "droplets", label: "Water" },
  { value: "armchair", label: "Furniture" },
  { value: "school", label: "Classroom" },
  { value: "sparkles", label: "Cleanliness" },
  { value: "bath", label: "Washroom" },
  { value: "bus", label: "Transport" },
  { value: "bed", label: "Hostel" },
  { value: "utensils", label: "Food" },
  { value: "shield-alert", label: "Safety" },
] as const;

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be 2–80 characters").max(80, "Name must be 2–80 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters"),
  icon: z.string().trim().min(1, "Choose an icon").max(40, "Icon name must be at most 40 characters"),
  slaHours: z
    .string()
    .trim()
    .refine((value) => {
      const hours = Number(value);
      return Number.isInteger(hours) && hours >= 1 && hours <= 720;
    }, "SLA must be a whole number from 1 to 720"),
  departmentId: z.string().min(1, "Choose a department"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const EMPTY_CATEGORY_FORM: CategoryFormValues = {
  name: "",
  description: "",
  icon: "none",
  slaHours: "24",
  departmentId: "",
};

function toCategoryForm(category: Category): CategoryFormValues {
  return {
    name: category.name,
    description: category.description ?? "",
    icon: category.icon ?? "none",
    slaHours: String(category.slaHours),
    departmentId: String(category.department.id),
  };
}

function toCategoryWrite(values: CategoryFormValues): CategoryWrite {
  return {
    name: values.name.trim(),
    description: emptyToNull(values.description),
    icon: values.icon === "none" ? null : values.icon,
    slaHours: Number(values.slaHours),
    departmentId: Number(values.departmentId),
  };
}

export function CategoryFormDialog({
  open,
  category,
  onOpenChange,
}: {
  open: boolean;
  category: Category | null;
  onOpenChange: (open: boolean) => void;
}) {
  const departmentsQuery = useDepartments();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: EMPTY_CATEGORY_FORM,
  });
  const { reset } = form;
  const pending = create.isPending || update.isPending;
  const iconValue = form.watch("icon");
  const knownIcon = iconValue === "none" || ICON_OPTIONS.some((option) => option.value === iconValue);

  useLayoutEffect(() => {
    if (!open) return;
    reset(category ? toCategoryForm(category) : EMPTY_CATEGORY_FORM);
    setSubmitError(null);
  }, [open, category, reset]);

  async function onSubmit(values: CategoryFormValues) {
    setSubmitError(null);
    const body = toCategoryWrite(values);
    try {
      if (category) {
        await update.mutateAsync({ id: category.id, body });
        toast.success("Category updated");
      } else {
        await create.mutateAsync(body);
        toast.success("Category created");
      }
      onOpenChange(false);
    } catch (error) {
      const message = apiErrorMessage(error, "Could not save category");
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
          <DialogTitle>{category ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>Categories decide which department receives a complaint and how long the SLA is.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" autoComplete="off" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              {...form.register("name")}
              aria-invalid={Boolean(form.formState.errors.name)}
            />
            <FieldError message={form.formState.errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-description">Description</Label>
            <Textarea id="category-description" rows={3} {...form.register("description")} />
            <FieldError message={form.formState.errors.description?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category-sla">SLA (hours)</Label>
              <Input
                id="category-sla"
                type="number"
                min={1}
                max={720}
                step={1}
                inputMode="numeric"
                {...form.register("slaHours")}
                aria-invalid={Boolean(form.formState.errors.slaHours)}
              />
              <FieldError message={form.formState.errors.slaHours?.message} />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Controller
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-label="Icon">
                      <SelectValue placeholder="Choose an icon" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[60]">
                      <SelectItem value="none">No icon</SelectItem>
                      {!knownIcon && field.value ? <SelectItem value={field.value}>{field.value}</SelectItem> : null}
                      {ICON_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <CategoryIcon name={option.value} />
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={form.formState.errors.icon?.message} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            {departmentsQuery.isPending ? (
              <p className="text-sm text-slate-500">Loading departments…</p>
            ) : null}
            {departmentsQuery.isError ? <QueryError error={departmentsQuery.error} onRetry={() => void departmentsQuery.refetch()} /> : null}
            {departmentsQuery.data ? (
              <Controller
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-label="Department">
                      <SelectValue placeholder="Choose a department" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[60]">
                      {departmentsQuery.data.map((department) => (
                        <SelectItem key={department.id} value={String(department.id)}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : null}
            {departmentsQuery.data?.length === 0 ? (
              <p className="text-sm text-slate-500">Add a department before creating categories.</p>
            ) : null}
            <FieldError message={form.formState.errors.departmentId?.message} />
          </div>
          <FormAlert message={submitError} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || departmentsQuery.isPending || !departmentsQuery.data?.length}>
              {pending ? "Saving…" : category ? "Save changes" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
