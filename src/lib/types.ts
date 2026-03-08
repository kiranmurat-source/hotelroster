export type Department = "Front Desk" | "Housekeeping" | "F&B" | "Kitchen" | "Maintenance" | "Security" | "Spa" | "Management";

export type ShiftType = "Morning" | "Afternoon" | "Night" | "Day Off" | "Break";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: Department;
  email: string;
  phone: string;
  avatar?: string;
}

export interface ShiftAssignment {
  id: string;
  staffId: string;
  date: string;
  shift: ShiftType;
  department: Department;
}

export interface ExtraHoursRequest {
  id: string;
  staffId: string;
  staffName: string;
  department: Department;
  date: string;
  hours: number;
  reason: string;
  status: ApprovalStatus;
  submittedAt: string;
}

export interface ExtraStaffRequest {
  id: string;
  department: Department;
  date: string;
  shift: ShiftType;
  numberOfStaff: number;
  reason: string;
  status: ApprovalStatus;
  requestedBy: string;
  submittedAt: string;
}
