import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  UserPlus,
  BarChart3,
  Shield,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roster", label: "Roster", icon: CalendarDays },
  { to: "/forecast", label: "Forecast", icon: BarChart3 },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/extra-hours", label: "Hours", icon: Clock },
  { to: "/extra-staff", label: "Staff+", icon: UserPlus },
  { to: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

const MobileNav = () => {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex justify-around py-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to;
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
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileNav;
