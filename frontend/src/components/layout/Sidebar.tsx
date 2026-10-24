import { NavLink } from "react-router";
import { LogoMark, LogoWordmark } from "@/components/brand/Logo";
import { navItemsForRole } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const items = navItemsForRole(role);

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={`${item.to}-${item.label}`}
            to={item.to}
            end={item.to === "/app/complaints"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <LogoMark />
      <div className="min-w-0">
        <LogoWordmark className="block truncate" />
        <p className="text-[11px] text-slate-500">Campus operations</p>
      </div>
    </div>
  );
}

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <SidebarBrand />
      <SidebarNav role={role} />
    </aside>
  );
}
