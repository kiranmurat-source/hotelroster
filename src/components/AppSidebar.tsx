import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import muninnLogo from "@/assets/muninn-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  UserPlus,
  BarChart3,
  LogOut,
  Shield,
  FileText,
  Star,
  CalendarOff,
  GraduationCap,
} from "lucide-react";

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  minRole?: "manager" | "admin";
}

const navItems: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/roster", labelKey: "nav.roster", icon: CalendarDays },
  { to: "/leave-requests", labelKey: "nav.leave", icon: CalendarOff, minRole: "manager" },
  { to: "/training", labelKey: "nav.training", icon: GraduationCap },
  { to: "/forecast", labelKey: "nav.forecast", icon: BarChart3 },
  { to: "/staff", labelKey: "nav.staff", icon: Users, minRole: "manager" },
  { to: "/extra-hours", labelKey: "nav.extraHours", icon: Clock },
  { to: "/extra-staff", labelKey: "nav.extraStaff", icon: UserPlus, minRole: "manager" },
  { to: "/reports", labelKey: "nav.reports", icon: FileText, minRole: "manager" },
  { to: "/recognition", labelKey: "nav.recognition", icon: Star },
  { to: "/admin", labelKey: "nav.admin", icon: Shield, minRole: "admin" },
];

const roleBadgeColors: Record<AppRole, string> = {
  admin: "bg-warning/20 text-warning",
  manager: "bg-accent/20 text-accent",
  staff: "bg-muted text-muted-foreground",
};

const AppSidebar = () => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { roles, isAdmin, isManager } = useUserRole();
  const { t } = useLanguage();

  const visibleItems = navItems.filter((item) => {
    if (!item.minRole) return true;
    if (item.minRole === "admin") return isAdmin;
    if (item.minRole === "manager") return isManager;
    return true;
  });

  const displayRole = isAdmin ? "admin" : isManager ? "manager" : "staff";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar min-h-screen p-4 gap-1">
      <div className="px-3 py-5 mb-6">
        <img src={muninnLogo} alt="Muninn" style={{ height: 134 }} />
        <p className="text-sm font-medium text-sidebar-foreground/80 mt-2 tracking-wide">{t("nav.staffMgmt")}</p>
      </div>
      <nav className="flex flex-col gap-0.5 flex-1">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-3 border-sidebar-ring font-semibold"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border-l-3 border-transparent"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {t(item.labelKey)}
            </RouterNavLink>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-sidebar-border pt-4 space-y-3">
        <div className="px-3">
          <LanguageToggle />
        </div>
        {user && (
          <div className="px-3">
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {user.email}
            </p>
            <span className={cn("inline-flex items-center gap-1 mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", roleBadgeColors[displayRole])}>
              <Shield className="h-2.5 w-2.5" />
              {displayRole}
            </span>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {t("nav.signOut")}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
