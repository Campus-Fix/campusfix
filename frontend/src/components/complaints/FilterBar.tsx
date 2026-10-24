import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import type { ComplaintStatus, Priority } from "@/types";
import { useCategories } from "@/hooks/queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: ComplaintStatus[] = ["SUBMITTED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function FilterBar({
  values,
  onChange,
  showAssigned,
}: {
  values: {
    search?: string;
    status?: string;
    priority?: string;
    categoryId?: string;
    assignedTo?: string;
    overdue?: string;
    sort?: string;
  };
  onChange: (key: string, value: string) => void;
  showAssigned?: boolean;
}) {
  const categories = useCategories();

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          placeholder="Ticket, title, location…"
          value={values.search ?? ""}
          onChange={(event) => onChange("search", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={values.status ?? "all"} onValueChange={(value) => onChange("status", value === "all" ? "" : value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Priority</Label>
        <Select
          value={values.priority ?? "all"}
          onValueChange={(value) => onChange("priority", value === "all" ? "" : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select
          value={values.categoryId ?? "all"}
          onValueChange={(value) => onChange("categoryId", value === "all" ? "" : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Sort</Label>
        <Select value={values.sort ?? "newest"} onValueChange={(value) => onChange("sort", value === "newest" ? "" : value)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="due">Due date</SelectItem>
            <SelectItem value="upvotes">Upvotes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {showAssigned ? (
        <div className="flex items-end gap-2">
          {(["", "me", "unassigned"] as const).map((value) => (
            <Button
              key={value || "all"}
              type="button"
              size="sm"
              variant={(values.assignedTo ?? "") === value ? "default" : "outline"}
              onClick={() => onChange("assignedTo", value)}
            >
              {value === "me" ? "Assigned to me" : value === "unassigned" ? "Unassigned" : "All"}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <Switch
          checked={values.overdue === "true"}
          onCheckedChange={(checked) => onChange("overdue", checked ? "true" : "")}
          aria-label="Overdue only"
        />
        <Label>Overdue only</Label>
      </div>
    </div>
  );
}
