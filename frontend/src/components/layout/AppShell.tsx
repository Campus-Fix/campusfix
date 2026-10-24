import { useState } from "react";
import { Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { PAGE_MAX_WIDTH } from "@/lib/constants";
import { Sidebar, SidebarBrand, SidebarNav } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function AppShell() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="flex min-h-svh bg-slate-50">
      <Sidebar role={user.role} />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarBrand />
          <SidebarNav role={user.role} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <main className={`${PAGE_MAX_WIDTH} flex-1 px-4 py-6 sm:px-6 lg:px-8`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
