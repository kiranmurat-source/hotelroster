import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extraStaffRequests as initialRequests } from "@/lib/mock-data";
import { ExtraStaffRequest, Department, ShiftType, ApprovalStatus } from "@/lib/types";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

const departments: Department[] = ["Front Desk", "Housekeeping", "F&B", "Kitchen", "Maintenance", "Security", "Spa", "Management"];
const shifts: ShiftType[] = ["Morning", "Afternoon", "Night"];

const ExtraStaffPage = () => {
  const [requests, setRequests] = useState<ExtraStaffRequest[]>(initialRequests);
  const [department, setDepartment] = useState<Department | "">("");
  const [date, setDate] = useState("");
  const [shift, setShift] = useState<ShiftType | "">("");
  const [numberOfStaff, setNumberOfStaff] = useState("");
  const [reason, setReason] = useState("");
  const [requestedBy, setRequestedBy] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !date || !shift || !numberOfStaff || !reason || !requestedBy) {
      toast.error("Please fill in all fields");
      return;
    }
    const newRequest: ExtraStaffRequest = {
      id: `es-${Date.now()}`,
      department: department as Department,
      date,
      shift: shift as ShiftType,
      numberOfStaff: Number(numberOfStaff),
      reason,
      requestedBy,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    setRequests((prev) => [newRequest, ...prev]);
    setDepartment(""); setDate(""); setShift(""); setNumberOfStaff(""); setReason(""); setRequestedBy("");
    toast.success("Extra staff request submitted");
  };

  const updateStatus = (id: string, status: ApprovalStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Request ${status}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Extra Staff Requests</h1>
          <p className="text-muted-foreground">Request additional staffing for shifts</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 animate-fade-in">
            <CardHeader><CardTitle className="text-lg">New Request</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Select value={shift} onValueChange={(v) => setShift(v as ShiftType)}>
                    <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                    <SelectContent>{shifts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Staff Needed</Label>
                  <Input type="number" min="1" max="20" value={numberOfStaff} onChange={(e) => setNumberOfStaff(e.target.value)} placeholder="e.g. 2" />
                </div>
                <div className="space-y-2">
                  <Label>Requested By</Label>
                  <Input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is extra staff needed?" rows={3} />
                </div>
                <Button type="submit" className="w-full">Submit Request</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 animate-fade-in">
            <CardHeader><CardTitle className="text-lg">All Requests</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{req.department} — {req.shift}</p>
                    <p className="text-xs text-muted-foreground">{req.numberOfStaff} staff · {req.date} · by {req.requestedBy}</p>
                    <p className="text-xs text-muted-foreground">{req.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <StatusBadge status={req.status} />
                    {req.status === "pending" && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success" onClick={() => updateStatus(req.id, "approved")}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => updateStatus(req.id, "rejected")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default ExtraStaffPage;
