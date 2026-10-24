import { Link, useLocation, useNavigate } from "react-router";
import { LogOut, Menu, Plus, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { pageTitleFromPath } from "@/lib/nav";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const title = pageTitleFromPath(location.pathname, user?.role);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{title}</h1>
      </div>
      <Button asChild size="lg" className="shadow-sm">
        <Link to="/app/complaints/new">
          <Plus data-icon="inline-start" />
          <span className="hidden sm:inline">Raise Complaint</span>
          <span className="sm:hidden">Raise</span>
        </Link>
      </Button>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Account menu"
          >
            <Avatar size="sm">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-left md:block">
              <span className="block max-w-[140px] truncate text-sm font-medium text-slate-900">{user.name}</span>
              <Badge className={ROLE_COLORS[user.role]} variant="outline">
                {ROLE_LABELS[user.role]}
              </Badge>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/app/profile")}>
              <UserRound />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  );
}
