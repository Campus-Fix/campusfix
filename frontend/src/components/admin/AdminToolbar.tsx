import type { ReactNode } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminToolbar({
  id,
  search,
  onSearchChange,
  placeholder,
  addLabel,
  onAdd,
  filters,
}: {
  id: string;
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  addLabel: string;
  onAdd: () => void;
  filters?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Label htmlFor={id} className="sr-only">
          {placeholder}
        </Label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          id={id}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-9 pl-9"
        />
      </div>
      {filters}
      <Button type="button" onClick={onAdd} className="h-9 shrink-0">
        <Plus data-icon="inline-start" />
        {addLabel}
      </Button>
    </div>
  );
}
