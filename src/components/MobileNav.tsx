import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  UserPlus,
  BarChart3,
  Shield,
  FileText,
  Star,
  CalendarOff,
  GraduationCap,
} from "lucide-react";

interface NavItem {
  to: string;
  labelKey: string;
  shortLabelKey?: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  managerOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/roster", labelKey: "nav.roster", icon: CalendarDays },
  { to: "/leave-requests", labelKey: "nav.leave", icon: CalendarOff, managerOnly: true },
  { to: "/training", labelKey: "nav.training", icon: GraduationCap },
  { to: "/forecast", labelKey: "nav.forecast", icon: BarChart3 },
  { to: "/staff", labelKey: "nav.staff", icon: Users },
  { to: "/extra-hours", labelKey: "nav.extraHours", icon: Clock },
  { to: "/extra-staff", labelKey: "nav.extraStaff", icon: UserPlus, managerOnly: true },
  { to: "/reports", labelKey: "nav.reports", icon: FileText, managerOnly: true },
  { to: "/recognition", labelKey: "nav.recognition", icon: Star },
  { to: "/admin", labelKey: "nav.admin", icon: Shield, adminOnly: true },
];

const MobileNav = () => {
  const location = useLocation();
  const { isAdmin, isManager } = useUserRole();
  const { t } = useLanguage();

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.managerOnly && !isManager) return false;
    return true;
  });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex justify-around py-2">
      {visibleItems.map((item) => {
        const isActive = location.pathname === item.to;
        const label = t(item.labelKey);
        const shortLabel = label.length > 8 ? label.substring(0, 7) + "…" : label;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors",
              isActive ? "text-accent" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {shortLabel}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileNav;
