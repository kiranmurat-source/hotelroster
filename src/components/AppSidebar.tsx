import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  UserPlus,
  BarChart3,
  LogOut,
  Shield,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  minRole?: "manager" | "admin";
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roster", label: "Roster", icon: CalendarDays },
  { to: "/forecast", label: "Forecast", icon: BarChart3 },
  { to: "/staff", label: "Staff", icon: Users, minRole: "manager" },
  { to: "/extra-hours", label: "Extra Hours", icon: Clock },
  { to: "/extra-staff", label: "Extra Staff", icon: UserPlus },
];

const roleBadgeColors: Record<AppRole, string> = {
  admin: "bg-destructive/20 text-destructive",
  manager: "bg-accent/20 text-accent",
  staff: "bg-muted text-muted-foreground",
};

const AppSidebar = () => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { roles, isAdmin, isManager } = useUserRole();

  const visibleItems = navItems.filter((item) => {
    if (!item.minRole) return true;
    if (item.minRole === "admin") return isAdmin;
    if (item.minRole === "manager") return isManager;
    return true;
  });

  const displayRole = isAdmin ? "admin" : isManager ? "manager" : "staff";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-primary min-h-screen p-4 gap-1">
      <div className="px-3 py-4 mb-4">
        <h1 className="text-xl font-bold text-primary-foreground tracking-tight">
          Hotel<span className="text-accent">Roster</span>
        </h1>
        <p className="text-xs text-primary-foreground/60 mt-1">Staff Management</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </RouterNavLink>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-primary-foreground/10 pt-3">
        {user && (
          <p className="px-3 text-xs text-primary-foreground/50 truncate mb-2">
            {user.email}
          </p>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
