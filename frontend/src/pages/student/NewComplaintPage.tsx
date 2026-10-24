import { useMemo, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Copy, ImagePlus, Sparkles, TriangleAlert, X } from "lucide-react";
import { SECURITY_PHONE, PRIORITY_LABELS, AI_SURFACE } from "@/lib/constants";
import { confidencePct } from "@/lib/format";
import type { AiSuggestion, ApiErrorBody, ComplaintDetail, Priority, SimilarComplaint } from "@/types";
import {
  useAnalyzeComplaint,
  useCategories,
  useCreateComplaint,
  useFindDuplicates,
  useToggleUpvote,
} from "@/hooks/queries";
import { StatusBadge } from "@/components/complaints/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DEMO_TEXT =
  "wifi not working in Block C 2nd floor since morning, can't download assignments";

const schema = z.object({
  description: z.string().min(10, "Describe the issue in at least 10 characters").max(2000),
  location: z.string().min(2, "Location is required").max(120),
  title: z.string().min(5, "Title must be at least 5 characters").max(120),
  categoryId: z.string().min(1, "Pick a category"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  isAnonymous: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function AiFieldBadge({ reason, source }: { reason: string; source: AiSuggestion["source"] }) {
  const label = source === "fallback" ? "Suggested by keywords" : "AI suggested";
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700"
      >
        <Sparkles className="size-3" />
        {label}
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

function DuplicateWarning({
  items,
  onClaim,
  claimingId,
}: {
  items: SimilarComplaint[];
  onClaim: (item: SimilarComplaint) => void;
  claimingId: number | null;
}) {
  return (
    <div className={`${AI_SURFACE} p-4`}>
      <p className="text-sm font-semibold text-slate-900">Similar open complaints found</p>
      <p className="mt-1 text-xs text-slate-500">Upvote an existing ticket if this is the same issue.</p>
      <ul className="mt-3 space-y-2">
        {items.slice(0, 3).map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono">{item.ticketCode}</span>
                <span>{item.location}</span>
                <StatusBadge status={item.status} />
                <span>{Math.round(item.similarity * 100)}% match</span>
                <span>{item.upvoteCount} upvotes</span>
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={claimingId === item.id}
              onClick={() => onClaim(item)}
            >
              {claimingId === item.id ? "Upvoting…" : "This is my issue too"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuccessScreen({ complaint }: { complaint: ComplaintDetail }) {
  async function copyCode() {
    await navigator.clipboard.writeText(complaint.ticketCode);
    toast.success("Ticket code copied");
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-indigo-600">Submitted</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Complaint filed</h2>
      <p className="mt-2 text-sm text-slate-500">Save this ticket code to track status later.</p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <p className="font-mono text-2xl font-semibold tracking-tight text-slate-900">{complaint.ticketCode}</p>
        <Button type="button" size="icon" variant="outline" aria-label="Copy ticket code" onClick={copyCode}>
          <Copy className="size-4" />
        </Button>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to={`/track/${complaint.ticketCode}`}>Track status</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/app/complaints/${complaint.id}`}>View complaint</Link>
        </Button>
      </div>
    </div>
  );
}

export function NewComplaintPage() {
  const navigate = useNavigate();
  const categoriesQuery = useCategories();
  const analyze = useAnalyzeComplaint();
  const duplicates = useFindDuplicates();
  const create = useCreateComplaint();
  const upvote = useToggleUpvote();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [ai, setAi] = useState<AiSuggestion | null>(null);
  const [aiFilled, setAiFilled] = useState({ title: false, categoryId: false, priority: false });
  const [similar, setSimilar] = useState<SimilarComplaint[]>([]);
  const [created, setCreated] = useState<ComplaintDetail | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      location: "",
      title: "",
      categoryId: "",
      priority: "MEDIUM",
      isAnonymous: false,
    },
  });

  const description = form.watch("description");
  const categoryId = form.watch("categoryId");
  const selectedCategory = useMemo(
    () => categoriesQuery.data?.find((category) => String(category.id) === categoryId),
    [categoriesQuery.data, categoryId],
  );

  function addFiles(incoming: File[]) {
    const next = [...files];
    incoming.forEach((file) => {
      if (next.length >= 3) return;
      if (!IMAGE_TYPES.includes(file.type)) {
        toast.error("Images must be JPG, PNG or WebP");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Each image must be 5 MB or smaller");
        return;
      }
      next.push(file);
    });
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function onAnalyze() {
    const desc = form.getValues("description").trim();
    if (desc.length < 10) return;
    try {
      const suggestion = await analyze.mutateAsync({
        description: desc,
        title: form.getValues("title") || undefined,
        location: form.getValues("location") || undefined,
        image: files[0],
      });
      setAi(suggestion);
      form.setValue("title", suggestion.suggestedTitle, { shouldValidate: true });
      if (suggestion.category) {
        form.setValue("categoryId", String(suggestion.category.id), { shouldValidate: true });
      }
      form.setValue("priority", suggestion.priority, { shouldValidate: true });
      setAiFilled({ title: true, categoryId: Boolean(suggestion.category), priority: true });
      const matches = await duplicates.mutateAsync({
        title: suggestion.suggestedTitle,
        description: desc,
        categoryId: suggestion.category?.id,
      });
      setSimilar(matches);
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not analyze");
    }
  }

  async function onClaim(item: SimilarComplaint) {
    setClaimingId(item.id);
    try {
      await upvote.mutateAsync({ id: item.id, hasUpvoted: false });
      toast.success("Upvoted. Opening the existing complaint.");
      navigate(`/app/complaints/${item.id}`);
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not upvote");
    } finally {
      setClaimingId(null);
    }
  }

  async function onSubmit(values: FormValues) {
    const payload = new FormData();
    payload.append("title", values.title.trim());
    payload.append("description", values.description.trim());
    payload.append("location", values.location.trim());
    payload.append("categoryId", values.categoryId);
    payload.append("priority", values.priority);
    payload.append("isAnonymous", values.isAnonymous ? "true" : "false");
    if (ai) {
      payload.append("aiCategoryName", ai.category?.name ?? "");
      payload.append("aiPriority", ai.priority);
      payload.append("aiConfidence", String(ai.confidence));
      payload.append("aiReason", ai.reason);
    }
    files.forEach((file) => payload.append("images", file));
    try {
      const detail = await create.mutateAsync(payload);
      toast.success("Complaint submitted");
      setCreated(detail);
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not submit");
    }
  }

  if (created) return <SuccessScreen complaint={created} />;

  const analyzing = analyze.isPending || duplicates.isPending;

  return (
    <form className="mx-auto max-w-3xl space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-600">New complaint</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Describe the issue</h2>
        <p className="mt-1 text-sm text-slate-500">
          Write what is broken. AI will suggest a title, category and priority — you can edit anything.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="description">What happened?</Label>
          <Textarea
            id="description"
            className="min-h-36"
            placeholder="Example: wifi not working in Block C 2nd floor since morning…"
            {...form.register("description")}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">{description.trim().length}/2000</p>
            <button
              type="button"
              className="text-xs font-medium text-indigo-600 hover:underline"
              onClick={() => {
                form.setValue("description", DEMO_TEXT, { shouldValidate: true });
                form.setValue("location", "Block C 2nd floor", { shouldValidate: true });
              }}
            >
              Use demo text
            </button>
          </div>
          {form.formState.errors.description ? (
            <p className="text-sm text-rose-600">{form.formState.errors.description.message}</p>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="Block C 2nd floor" {...form.register("location")} />
          {form.formState.errors.location ? (
            <p className="text-sm text-rose-600">{form.formState.errors.location.message}</p>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <Label>Photos (optional, up to 3)</Label>
          <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            <ImagePlus className="size-6 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">Drop images here or click to upload</p>
            <p className="mt-1 text-xs text-slate-400">JPG, PNG or WebP · 5 MB each</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
            />
          </label>
          {previews.length ? (
            <div className="flex flex-wrap gap-2">
              {previews.map((url, index) => (
                <div key={url} className="relative size-20 overflow-hidden rounded-xl border border-slate-200">
                  <img src={url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    className="absolute top-1 right-1 rounded-full bg-slate-900/70 p-0.5 text-white"
                    onClick={() => removeFile(index)}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          className="mt-5"
          disabled={description.trim().length < 10 || analyzing}
          onClick={onAnalyze}
        >
          <Sparkles data-icon="inline-start" />
          {analyzing ? "AI is reading your complaint…" : "Analyze with AI"}
        </Button>
      </div>

      <div className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {analyzing ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80">
            <p className="animate-pulse text-sm font-medium text-violet-700">AI is reading your complaint…</p>
          </div>
        ) : null}

        {ai ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
              <Sparkles className="size-3" />
              {confidencePct(ai.confidence)} confident
            </Badge>
            {ai.source === "fallback" ? (
              <Badge variant="outline">Suggested by keywords</Badge>
            ) : null}
          </div>
        ) : null}

        {ai?.isSafetyIssue ? (
          <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              This looks like a safety issue. It will be marked CRITICAL. For emergencies,{" "}
              {SECURITY_PHONE ? `call campus security: ${SECURITY_PHONE}.` : "contact campus security immediately."}
            </p>
          </div>
        ) : null}

        {similar.length ? (
          <div className="mb-5">
            <DuplicateWarning items={similar} onClaim={onClaim} claimingId={claimingId} />
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="title">Title</Label>
              {aiFilled.title && ai ? <AiFieldBadge reason={ai.reason} source={ai.source} /> : null}
            </div>
            <Input
              id="title"
              className={aiFilled.title ? "animate-in fade-in duration-300" : undefined}
              {...form.register("title", {
                onChange: () => setAiFilled((current) => ({ ...current, title: false })),
              })}
            />
            {form.formState.errors.title ? (
              <p className="text-sm text-rose-600">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Category</Label>
                {aiFilled.categoryId && ai ? <AiFieldBadge reason={ai.reason} source={ai.source} /> : null}
              </div>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setAiFilled((current) => ({ ...current, categoryId: false }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categoriesQuery.data ?? []).map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.categoryId ? (
                <p className="text-sm text-rose-600">{form.formState.errors.categoryId.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Priority</Label>
                {aiFilled.priority && ai ? <AiFieldBadge reason={ai.reason} source={ai.source} /> : null}
              </div>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setAiFilled((current) => ({ ...current, priority: false }));
                    }}
                  >
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

          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {selectedCategory
              ? `Will be routed to: ${selectedCategory.department.name} · SLA ${selectedCategory.slaHours}h`
              : "Pick a category to see the department and SLA."}
          </p>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-900">Submit anonymously</p>
              <p className="text-xs text-slate-500">Staff still see the ticket, but your name is hidden from others.</p>
            </div>
            <Controller
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Submit anonymously" />
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Submitting…" : "Submit complaint"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate("/app/complaints")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
