import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  accentColor?: string;
  trend?: "up" | "down";
}

const StatCard = ({ title, value, icon, description, accentColor = "border-l-primary", trend }: StatCardProps) => (
  <Card className={`animate-fade-in border-l-4 ${accentColor}`}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-accent">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold">{value}</span>
        {trend && (
          trend === "up"
            ? <TrendingUp className="h-4 w-4 text-green-600" />
            : <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

export default StatCard;
