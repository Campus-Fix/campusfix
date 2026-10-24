import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/logo.jpg";

export function LogoMark({ className }: { className?: string; light?: boolean }) {
  return (
    <img
      src={logoMark}
      alt=""
      className={cn("size-9 rounded-[10px] bg-white object-contain", className)}
    />
  );
}

export function LogoWordmark({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-[15px] font-semibold tracking-tight",
        light ? "text-white" : "text-slate-900",
        className,
      )}
    >
      Campus<span className={light ? "text-indigo-200" : "text-indigo-600"}>Fix</span>
    </span>
  );
}

export function Logo({
  className,
  markClassName,
  wordmark = true,
  light = false,
}: {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
  light?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      {wordmark ? <LogoWordmark light={light} /> : <span className="sr-only">{APP_NAME}</span>}
    </span>
  );
}
