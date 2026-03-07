import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { staffMembers, shiftAssignments } from "@/lib/mock-data";
import { ShiftType } from "@/lib/types";
import { cn } from "@/lib/utils";

const shiftColors: Record<ShiftType, string> = {
  Morning: "bg-success/15 text-success",
  Afternoon: "bg-accent/15 text-accent",
  Night: "bg-primary/15 text-primary",
  "Day Off": "bg-muted text-muted-foreground",
};

const days = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"];
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const RosterPage = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Roster</h1>
          <p className="text-muted-foreground">March 9 – 15, 2026</p>
        </div>

        <Card className="animate-fade-in overflow-auto">
          <CardContent className="p-0">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-8 border-b bg-muted/50">
                <div className="p-3 text-sm font-semibold">Staff</div>
                {dayLabels.map((d, i) => (
                  <div key={i} className="p-3 text-sm font-semibold text-center">{d}<br /><span className="text-xs font-normal text-muted-foreground">{days[i].slice(5)}</span></div>
                ))}
              </div>
              {staffMembers.map((staff) => (
                <div key={staff.id} className="grid grid-cols-8 border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <div className="p-3">
                    <p className="text-sm font-medium">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.department}</p>
                  </div>
                  {days.map((date) => {
                    const assignment = shiftAssignments.find(
                      (a) => a.staffId === staff.id && a.date === date
                    );
                    return (
                      <div key={date} className="p-2 flex items-center justify-center">
                        <span className={cn("text-xs font-medium px-2 py-1 rounded-md", shiftColors[assignment?.shift || "Day Off"])}>
                          {assignment?.shift || "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default RosterPage;
