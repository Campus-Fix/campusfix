import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { QueryError } from "@/components/complaints/QueryError";
import { useAuth } from "@/hooks/useAuth";
import { USE_MOCKS } from "@/lib/api";
import { findUser } from "@/mocks/data";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/constants";
import type { User } from "@/types";
import { apiErrorMessage, useUpdateProfile, type ProfileUpdateBody } from "@/components/admin/admin-api";
import { FieldError } from "@/components/admin/FieldError";
import { FormAlert } from "@/components/admin/FormAlert";
import { isStrongPassword, PASSWORD_RULE } from "@/components/admin/validation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const PROFILE_NOTICE_KEY = "campusfix.profile-notice";

const profileSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be 2–80 characters").max(80, "Name must be 2–80 characters"),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    const changing = value.currentPassword.length > 0 || value.newPassword.length > 0 || value.confirmPassword.length > 0;
    if (!changing) return;
    if (!value.currentPassword) {
      ctx.addIssue({ code: "custom", path: ["currentPassword"], message: "Enter your current password" });
    }
    if (!isStrongPassword(value.newPassword)) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: PASSWORD_RULE });
    }
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
    }
  });

type ProfileFormValues = z.infer<typeof profileSchema>;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfileForm({ user }: { user: User }) {
  const { login } = useAuth();
  const update = useUpdateProfile();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user.name);
  const savedName = useRef(user.name);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    savedName.current = user.name;
    setDisplayName(user.name);
  }, [user.name]);

  useEffect(() => {
    const notice = sessionStorage.getItem(PROFILE_NOTICE_KEY);
    if (!notice) return;
    sessionStorage.removeItem(PROFILE_NOTICE_KEY);
    toast.success(notice);
  }, []);

  async function onSubmit(values: ProfileFormValues) {
    setSubmitError(null);
    const name = values.name.trim();
    const nameChanged = name !== savedName.current;
    const passwordChanged = values.newPassword.length > 0;
    if (!nameChanged && !passwordChanged) {
      toast.message("No changes to save");
      return;
    }

    const body: ProfileUpdateBody = {};
    if (nameChanged) body.name = name;
    if (passwordChanged) {
      body.currentPassword = values.currentPassword;
      body.newPassword = values.newPassword;
    }

    const notice = passwordChanged && nameChanged ? "Profile updated" : passwordChanged ? "Password updated" : "Name updated";
    try {
      await update.mutateAsync(body);
      savedName.current = name;
      setDisplayName(name);
      if (USE_MOCKS) {
        const record = findUser(user.id);
        if (record) await login(record.email, record.password);
      }
      if (!USE_MOCKS && nameChanged) {
        sessionStorage.setItem(PROFILE_NOTICE_KEY, notice);
        window.location.reload();
        return;
      }
      toast.success(notice);
      form.reset({ name, currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      const message = apiErrorMessage(error, "Could not update your profile");
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-slate-500">Update the name on your account, or set a new password.</p>
      <form
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{displayName}</p>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                {ROLE_LABELS[user.role]}
              </Badge>
              <span className="text-xs text-slate-500">{user.department?.name ?? "No department"}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            autoComplete="name"
            {...form.register("name")}
            aria-invalid={Boolean(form.formState.errors.name)}
          />
          <FieldError message={form.formState.errors.name?.message} />
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium text-slate-900">Change password</h2>
            <p className="mt-1 text-sm text-slate-500">Leave these blank to keep your current password.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-current-password">Current password</Label>
            <Input
              id="profile-current-password"
              type="password"
              autoComplete="current-password"
              {...form.register("currentPassword")}
              aria-invalid={Boolean(form.formState.errors.currentPassword)}
            />
            <FieldError message={form.formState.errors.currentPassword?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-new-password">New password</Label>
            <Input
              id="profile-new-password"
              type="password"
              autoComplete="new-password"
              placeholder={PASSWORD_RULE}
              {...form.register("newPassword")}
              aria-invalid={Boolean(form.formState.errors.newPassword)}
            />
            <FieldError message={form.formState.errors.newPassword?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-confirm-password">Confirm new password</Label>
            <Input
              id="profile-confirm-password"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
              aria-invalid={Boolean(form.formState.errors.confirmPassword)}
            />
            <FieldError message={form.formState.errors.confirmPassword?.message} />
          </div>
        </div>

        <FormAlert message={submitError} />
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) {
    return <QueryError error={{ message: "Sign in to update your profile." }} />;
  }
  return <ProfileForm user={user} />;
}
