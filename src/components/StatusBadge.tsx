import { ApprovalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<ApprovalStatus, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

const StatusBadge = ({ status }: { status: ApprovalStatus }) => (
  <span
    className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize",
      statusStyles[status]
    )}
  >
    {status}
  </span>
);

export default StatusBadge;
