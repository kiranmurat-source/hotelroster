import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: "up" | "down";
}

const StatCard = ({ title, value, icon, description, trend }: StatCardProps) => (
  <Card className="animate-fade-in">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-accent">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold">{value}</span>
        {trend && (
          trend === "up"
            ? <TrendingUp className="h-4 w-4 text-success" />
            : <TrendingDown className="h-4 w-4 text-warning" />
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

export default StatCard;
