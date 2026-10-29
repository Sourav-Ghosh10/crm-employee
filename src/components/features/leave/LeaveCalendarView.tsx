import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { LeaveRequest, LeaveType } from "../../../types/leave.types";
import { leaveTypeLabels } from "../../../types/leave.types";

interface LeaveCalendarViewProps {
  requests: LeaveRequest[];
  onSelectDateToApply: (dateStr: string) => void;
}

const formatToYYYYMMDD = (year: number, month: number, day: number): string => {
  const y = year.toString().padStart(4, "0");
  const m = (month + 1).toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
      return {
        bg: "bg-success/15 border-success/30 text-success",
        icon: <CheckCircle2 className="w-3 h-3 shrink-0" />,
      };
    case "rejected":
      return {
        bg: "bg-error/15 border-error/30 text-error",
        icon: <XCircle className="w-3 h-3 shrink-0" />,
      };
    case "cancelled":
      return {
        bg: "bg-muted border-border text-foreground-tertiary line-through",
        icon: <XCircle className="w-3 h-3 shrink-0" />,
      };
    default:
      return {
        bg: "bg-warning/15 border-warning/30 text-warning",
        icon: <Clock className="w-3 h-3 shrink-0" />,
      };
  }
};

const LeaveCalendarView: React.FC<LeaveCalendarViewProps> = ({
  requests = [],
  onSelectDateToApply,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const todayStr = formatToYYYYMMDD(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return (
    <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-md overflow-hidden transition-all duration-300 flex flex-col">
      {/* Calendar Header */}
      <div className="p-4 sm:p-6 bg-surface/50 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Interactive Leave Calendar</h3>
            <p className="text-xs text-foreground-secondary">
              Select any date on the calendar below to instantly open & apply for leave.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-muted/80 hover:bg-muted text-xs font-semibold text-foreground transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-muted text-foreground-secondary hover:text-foreground transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-foreground min-w-[130px] text-center select-none">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-muted text-foreground-secondary hover:text-foreground transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className={cn(
              "py-3 text-center text-xs font-bold uppercase tracking-wider",
              idx === 0 || idx === 6 ? "text-error/80" : "text-foreground-secondary"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 bg-border gap-px flex-1">
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="bg-surface/30 min-h-[90px] sm:min-h-[110px] p-2 opacity-50"
          />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateStr = formatToYYYYMMDD(currentYear, currentMonth, dayNum);
          const isWeekend = new Date(currentYear, currentMonth, dayNum).getDay() === 0 || new Date(currentYear, currentMonth, dayNum).getDay() === 6;
          const isToday = dateStr === todayStr;

          // Find leaves spanning across this date
          const dayLeaves = requests.filter((req) => {
            if (!req.startDate || !req.endDate) return false;
            return dateStr >= req.startDate && dateStr <= req.endDate;
          });

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDateToApply(dateStr)}
              className={cn(
                "group relative bg-card hover:bg-primary/[0.04] transition-all duration-200 min-h-[90px] sm:min-h-[110px] p-2 flex flex-col justify-between cursor-pointer border-transparent hover:z-10 hover:shadow-lg select-none"
              )}
            >
              {/* Day Number and Badges */}
              <div className="flex items-start justify-between gap-1">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110",
                    isToday
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : isWeekend
                      ? "text-error/80 font-semibold"
                      : "text-foreground"
                  )}
                >
                  {dayNum}
                </span>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  <span className="px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-0.5 shadow-sm">
                    <Plus className="w-2.5 h-2.5" /> Apply
                  </span>
                </div>
              </div>

              {/* Leave Requests inside the day box */}
              <div className="mt-1 space-y-1 overflow-hidden">
                {dayLeaves.map((leave) => {
                  const badge = getStatusBadge(leave.status);
                  const typeLabel = leaveTypeLabels[leave.leaveType as LeaveType] || leave.leaveType;
                  return (
                    <div
                      key={leave._id || `${leave.startDate}-${leave.leaveType}`}
                      className={cn(
                        "px-1.5 py-1 rounded-lg border text-[11px] font-medium flex items-center justify-between gap-1 shadow-xs truncate transition-transform hover:scale-[1.02]",
                        badge.bg
                      )}
                      title={`${typeLabel} (${leave.status || 'pending'}) - ${leave.reason || ''}`}
                      onClick={(e) => {
                        // Clicking an existing leave also triggers applying or inspecting on that date
                        e.stopPropagation();
                        onSelectDateToApply(dateStr);
                      }}
                    >
                      <div className="flex items-center gap-1 truncate">
                        {badge.icon}
                        <span className="truncate font-semibold">{typeLabel.replace(" Leave", "")}</span>
                      </div>
                    </div>
                  );
                })}

                {dayLeaves.length === 0 && (
                  <div className="hidden group-hover:flex items-center justify-center py-2 text-[11px] text-foreground-tertiary italic font-medium">
                    Click to select
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend & Guide footer */}
      <div className="p-3 bg-surface/40 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-foreground-secondary">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="font-medium">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="font-medium">Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" />
            <span className="font-medium">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-error" />
            <span className="font-medium">Rejected</span>
          </div>
        </div>
        <div className="text-[11px] text-foreground-tertiary">
          💡 Click any date cell to apply for leave starting on that date.
        </div>
      </div>
    </div>
  );
};

export default LeaveCalendarView;
