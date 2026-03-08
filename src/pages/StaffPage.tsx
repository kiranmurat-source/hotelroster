import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { staffMembers } from "@/lib/mock-data";
import { Mail, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const StaffPage = () => {
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("staff.title")}</h1>
          <p className="text-muted-foreground">{t("staff.subtitle").replace("{count}", String(staffMembers.length))}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffMembers.map((staff) => (
            <Card key={staff.id} className="animate-fade-in hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                    {staff.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.role}</p>
                    <span className="inline-block mt-1 text-xs bg-secondary px-2 py-0.5 rounded-full">{staff.department}</span>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" />{staff.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" />{staff.phone}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default StaffPage;
