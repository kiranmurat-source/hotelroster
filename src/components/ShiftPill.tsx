import { cn } from "@/lib/utils";
import type { ShiftTypeRecord } from "@/hooks/useShiftTypes";

const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  blue:   { bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-700 dark:text-blue-300",   dot: "bg-blue-500" },
  orange: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  green:  { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  gray:   { bg: "bg-muted",   text: "text-muted-foreground", dot: "bg-muted-foreground/50" },
};

function fmtTime(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5).replace(":", "");
}

interface ShiftPillProps {
  shiftType: ShiftTypeRecord;
  size?: "sm" | "md";
  showTime?: boolean;
  customStart?: string | null;
  customEnd?: string | null;
  className?: string;
}

export const ShiftPill = ({ shiftType, size = "sm", showTime = true, customStart, customEnd, className }: ShiftPillProps) => {
  const colors = COLOR_MAP[shiftType.color] || COLOR_MAP.gray;
  const startDisplay = customStart || shiftType.start_time;
  const endDisplay = customEnd || shiftType.end_time;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap",
        colors.bg,
        colors.text,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className,
      )}
    >
      {shiftType.code}
      {showTime && !shiftType.is_off && startDisplay && endDisplay && (
        <span className="opacity-70">
          · {fmtTime(startDisplay)}-{fmtTime(endDisplay)}
        </span>
      )}
    </span>
  );
};

/** Dot for calendar grid */
export const ShiftDot = ({ color }: { color: string }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.gray;
  return <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />;
};
