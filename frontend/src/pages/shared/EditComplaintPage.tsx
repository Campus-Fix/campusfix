import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PRIORITY_LABELS } from "@/lib/constants";
import type { ApiErrorBody, Priority } from "@/types";
import { useCategories, useComplaint, useUpdateComplaint } from "@/hooks/queries";
import { QueryError } from "@/components/complaints/QueryError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

interface EditValues {
  title: string;
  description: string;
  location: string;
  categoryId: string;
  priority: Priority;
  isAnonymous: boolean;
}

export function EditComplaintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useComplaint(id);
  const categories = useCategories();
  const update = useUpdateComplaint(Number(id));
  const form = useForm<EditValues>({
    defaultValues: {
      title: "",
      description: "",
      location: "",
      categoryId: "",
      priority: "MEDIUM",
      isAnonymous: false,
    },
  });

  useEffect(() => {
    if (!query.data) return;
    form.reset({
      title: query.data.title,
      description: query.data.description,
      location: query.data.location,
      categoryId: String(query.data.category.id),
      priority: query.data.priority,
      isAnonymous: query.data.isAnonymous,
    });
  }, [form, query.data]);

  if (query.isLoading) return <Skeleton className="h-96" />;
  if (query.isError || !query.data) {
    return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
  }
  if (!query.data.permissions.canEdit) {
    return <QueryError error={{ message: "This complaint can no longer be edited" }} />;
  }

  async function onSubmit(values: EditValues) {
    try {
      await update.mutateAsync({
        title: values.title,
        description: values.description,
        location: values.location,
        categoryId: Number(values.categoryId),
        priority: values.priority,
        isAnonymous: values.isAnonymous,
      });
      toast.success("Complaint updated");
      navigate(`/app/complaints/${id}`);
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not update");
    }
  }

  return (
    <form className="mx-auto max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...form.register("title", { required: true, minLength: 5 })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" className="min-h-32" {...form.register("description", { required: true, minLength: 10 })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" {...form.register("location", { required: true, minLength: 2 })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Category</Label>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
        <Label htmlFor="anon">Submit anonymously</Label>
        <Controller
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <Switch id="anon" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(`/app/complaints/${id}`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
