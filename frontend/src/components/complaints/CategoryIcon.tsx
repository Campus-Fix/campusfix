import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Bath,
  Bed,
  Bus,
  CircleHelp,
  Droplets,
  Monitor,
  School,
  ShieldAlert,
  Sparkles,
  Utensils,
  Wifi,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  monitor: Monitor,
  zap: Zap,
  droplets: Droplets,
  armchair: Armchair,
  school: School,
  sparkles: Sparkles,
  bath: Bath,
  bus: Bus,
  bed: Bed,
  utensils: Utensils,
  "shield-alert": ShieldAlert,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || CircleHelp;
  return <Icon className={cn("size-4", className)} aria-hidden />;
}
