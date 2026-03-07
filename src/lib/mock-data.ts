import { StaffMember, ShiftAssignment, ExtraHoursRequest, ExtraStaffRequest, Department, ShiftType } from "./types";

export const staffMembers: StaffMember[] = [
  { id: "1", name: "Maria Santos", role: "Front Desk Agent", department: "Front Desk", email: "maria@hotel.com", phone: "+1 555-0101" },
  { id: "2", name: "James Chen", role: "Housekeeper", department: "Housekeeping", email: "james@hotel.com", phone: "+1 555-0102" },
  { id: "3", name: "Sofia Rodriguez", role: "Waitress", department: "F&B", email: "sofia@hotel.com", phone: "+1 555-0103" },
  { id: "4", name: "David Kim", role: "Chef de Partie", department: "Kitchen", email: "david@hotel.com", phone: "+1 555-0104" },
  { id: "5", name: "Emma Wilson", role: "Maintenance Tech", department: "Maintenance", email: "emma@hotel.com", phone: "+1 555-0105" },
  { id: "6", name: "Ahmed Hassan", role: "Security Officer", department: "Security", email: "ahmed@hotel.com", phone: "+1 555-0106" },
  { id: "7", name: "Lisa Park", role: "Spa Therapist", department: "Spa", email: "lisa@hotel.com", phone: "+1 555-0107" },
  { id: "8", name: "Carlos Mendez", role: "Night Auditor", department: "Front Desk", email: "carlos@hotel.com", phone: "+1 555-0108" },
  { id: "9", name: "Nina Patel", role: "Room Attendant", department: "Housekeeping", email: "nina@hotel.com", phone: "+1 555-0109" },
  { id: "10", name: "Tom Baker", role: "Bartender", department: "F&B", email: "tom@hotel.com", phone: "+1 555-0110" },
];

const days = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"];
const shifts: ShiftType[] = ["Morning", "Afternoon", "Night", "Day Off"];

export const shiftAssignments: ShiftAssignment[] = staffMembers.flatMap((staff, si) =>
  days.map((date, di) => ({
    id: `shift-${staff.id}-${di}`,
    staffId: staff.id,
    date,
    shift: shifts[(si + di) % 4],
    department: staff.department,
  }))
);

export const extraHoursRequests: ExtraHoursRequest[] = [
  { id: "eh-1", staffId: "1", staffName: "Maria Santos", department: "Front Desk", date: "2026-03-10", hours: 3, reason: "VIP guest late check-in requiring extended coverage", status: "pending", submittedAt: "2026-03-07T09:00:00Z" },
  { id: "eh-2", staffId: "3", staffName: "Sofia Rodriguez", department: "F&B", date: "2026-03-11", hours: 4, reason: "Large banquet event requiring additional service staff", status: "pending", submittedAt: "2026-03-07T10:30:00Z" },
  { id: "eh-3", staffId: "4", staffName: "David Kim", department: "Kitchen", date: "2026-03-09", hours: 2, reason: "Prep for weekend brunch service", status: "approved", submittedAt: "2026-03-06T14:00:00Z" },
  { id: "eh-4", staffId: "6", staffName: "Ahmed Hassan", department: "Security", date: "2026-03-12", hours: 4, reason: "Conference security coverage", status: "rejected", submittedAt: "2026-03-06T08:00:00Z" },
];

export const extraStaffRequests: ExtraStaffRequest[] = [
  { id: "es-1", department: "Housekeeping", date: "2026-03-13", shift: "Morning", numberOfStaff: 3, reason: "Full hotel occupancy — 98% booking rate", status: "pending", requestedBy: "Nina Patel", submittedAt: "2026-03-07T07:00:00Z" },
  { id: "es-2", department: "F&B", date: "2026-03-14", shift: "Afternoon", numberOfStaff: 2, reason: "Wedding reception — 200 guests", status: "pending", requestedBy: "Tom Baker", submittedAt: "2026-03-07T11:00:00Z" },
  { id: "es-3", department: "Kitchen", date: "2026-03-10", shift: "Morning", numberOfStaff: 1, reason: "Chef called in sick", status: "approved", requestedBy: "David Kim", submittedAt: "2026-03-06T06:00:00Z" },
];
