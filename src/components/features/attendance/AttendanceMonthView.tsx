import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Coffee,
  List,
  Grid,
  Info,
  Loader2
} from "lucide-react";
import { cn } from "../../../lib/utils";
import Card from "../../common/Card/Card";
import type { AttendanceStatusResponse } from "../../../types/attendance";
import { getDateInTimezone, getUserTimezone } from "../../../utils/timezone";
import { attendanceService } from "../../../services/attendanceService";

interface AttendanceMonthViewProps {
  attendanceData: AttendanceStatusResponse | null;
  currentTime: Date;
  workingHoursFormatted: string;
}

interface DayStatusInfo {
  dateStr: string;
  dayNum: number;
  dayOfWeek: string;
  fullDateStr: string;
  status: "present" | "absent" | "leave" | "holiday" | "off_day" | "today" | "upcoming";
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  isToday: boolean;
  isPast: boolean;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const dayNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const AttendanceMonthView: React.FC<AttendanceMonthViewProps> = ({
  attendanceData,
  currentTime,
  workingHoursFormatted,
}) => {
  const currentDateTz = useMemo(() => getDateInTimezone(currentTime), [currentTime]);

  const [viewYear, setViewYear] = useState<number>(currentDateTz.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(currentDateTz.getMonth());
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid");
  const [selectedDay, setSelectedDay] = useState<DayStatusInfo | null>(null);
  const [monthSummary, setMonthSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      setLoadingSummary(true);
      try {
        const resp = await attendanceService.getMyMonthSummary(viewYear, viewMonth + 1, { skipLoading: true } as any);
        if (isMounted && resp && resp.success) {
          setMonthSummary(resp.data);
        }
      } catch (err) {
        console.error("Failed to fetch monthly attendance summary:", err);
      } finally {
        if (isMounted) setLoadingSummary(false);
      }
    };
    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
    setSelectedDay(null);
  };

  const handleToday = () => {
    setViewYear(currentDateTz.getFullYear());
    setViewMonth(currentDateTz.getMonth());
    setSelectedDay(null);
  };

  const { daysList, summaryStats } = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayZero = new Date(currentDateTz.getFullYear(), currentDateTz.getMonth(), currentDateTz.getDate());
    const list: DayStatusInfo[] = [];

    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let holidayCount = 0;
    let offDayCount = 0;

    const hasExactSummary = monthSummary && monthSummary.year === viewYear && monthSummary.month === viewMonth + 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(viewYear, viewMonth, day);
      const yearStr = String(viewYear);
      const monthStr = String(viewMonth + 1).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

      const dayOfWeekIndex = dateObj.getDay(); // 0 is Sun, 1 is Mon...
      const dayOfWeek = dayNamesShort[dayOfWeekIndex === 0 ? 6 : dayOfWeekIndex - 1];
      const fullDateStr = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: getUserTimezone()
      });

      const dateZero = new Date(viewYear, viewMonth, day);
      const isToday =
        viewYear === currentDateTz.getFullYear() &&
        viewMonth === currentDateTz.getMonth() &&
        day === currentDateTz.getDate();

      const isPast = dateZero < todayZero;

      let status: DayStatusInfo["status"] = "upcoming";
      let label = "—";
      let bgClass = "bg-surface/40 hover:bg-surface/80";
      let textClass = "text-foreground-tertiary";
      let borderClass = "border-border/40";

      if (hasExactSummary) {
        const serverDay = monthSummary.days?.find((d: any) => d.dayNum === day);
        if (serverDay) {
          status = serverDay.status;
          label = serverDay.label;
          if (isToday && workingHoursFormatted && workingHoursFormatted !== "0h 0m") {
            label = workingHoursFormatted;
            status = "today";
          }
        }
      } else {
        // Fallback calculation while summary is loading
        const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
        const isOffDay = attendanceData?.monthlyOffDays?.includes(dateStr) || isWeekend;
        const holiday = attendanceData?.monthlyHolidays?.find((h) => h.date === dateStr);
        const leave = attendanceData?.monthlyLeaves?.find((l: any) => l.date === dateStr);
        const isExplicitlyAbsent = attendanceData?.monthlyAbsentDays?.includes(dateStr);

        if (leave) {
          status = "leave";
          label = "On Leave";
        } else if (holiday) {
          status = "holiday";
          label = holiday.name || "Holiday";
        } else if (isExplicitlyAbsent) {
          status = "absent";
          label = "Absent";
        } else if (isOffDay) {
          status = "off_day";
          label = "Off Day";
        } else if (isToday) {
          status = "today";
          label = workingHoursFormatted || "Present Today";
        } else if (isPast) {
          // If past weekday and not weekend/off/holiday/leave, assume absent unless in current month present list
          status = "absent";
          label = "Absent";
        }
      }

      // Assign styling based on determined status
      if (status === "leave") {
        bgClass = "bg-destructive/10 hover:bg-destructive/15";
        textClass = "text-destructive font-medium";
        borderClass = "border-destructive/30";
        leaveCount++;
      } else if (status === "holiday") {
        bgClass = "bg-purple-500/10 hover:bg-purple-500/15";
        textClass = "text-purple-500 font-medium";
        borderClass = "border-purple-500/30";
        holidayCount++;
      } else if (status === "absent") {
        bgClass = "bg-destructive/15 hover:bg-destructive/20";
        textClass = "text-destructive font-bold";
        borderClass = "border-destructive/40";
        absentCount++;
      } else if (status === "off_day") {
        bgClass = "bg-warning/10 hover:bg-warning/15";
        textClass = "text-warning font-medium";
        borderClass = "border-warning/30";
        offDayCount++;
      } else if (status === "today") {
        bgClass = "bg-primary/10 hover:bg-primary/15 shadow-sm";
        textClass = "text-primary font-bold";
        borderClass = "border-primary border-2";
        if (workingHoursFormatted && workingHoursFormatted !== "0h 0m" && workingHoursFormatted !== "Not Clocked In") {
          presentCount++;
        }
      } else if (status === "present") {
        bgClass = "bg-success/10 hover:bg-success/15";
        textClass = "text-success font-semibold";
        borderClass = "border-success/30";
        presentCount++;
      }

      list.push({
        dateStr,
        dayNum: day,
        dayOfWeek,
        fullDateStr,
        status,
        label,
        bgClass,
        textClass,
        borderClass,
        isToday,
        isPast,
      });
    }

    // Override summary stats if server returned accurate monthly totals
    const finalStats = hasExactSummary && monthSummary.summaryStats ? {
      present: monthSummary.summaryStats.present || presentCount,
      absent: monthSummary.summaryStats.absent || absentCount,
      leave: monthSummary.summaryStats.leave || leaveCount,
      holiday: monthSummary.summaryStats.holiday || holidayCount,
      offDay: monthSummary.summaryStats.offDay || offDayCount,
    } : {
      present: presentCount,
      absent: absentCount,
      leave: leaveCount,
      holiday: holidayCount,
      offDay: offDayCount,
    };

    return {
      daysList: list,
      summaryStats: finalStats
    };
  }, [viewYear, viewMonth, currentDateTz, attendanceData, workingHoursFormatted, monthSummary]);

  // Calendar grid padding (to start at correct weekday column Mon-Sun)
  const firstDayOfWeekIndex = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
    return firstDay === 0 ? 6 : firstDay - 1; // 0 for Mon, 6 for Sun
  }, [viewYear, viewMonth]);

  return (
    <Card className="p-4 sm:p-6 border-2 border-primary/15 shadow-lg bg-surface/90">
      {/* Top Bar: Navigation & Display Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span>{monthNames[viewMonth]} {viewYear}</span>
              {loadingSummary && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            </h2>
            <p className="text-xs text-foreground-secondary">
              Monthly Attendance & Shift Breakdown
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          {/* Month Controls */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 rounded-lg text-xs font-bold hover:bg-surface text-foreground transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grid vs List Toggle */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setDisplayMode("grid")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                displayMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground-secondary hover:text-foreground hover:bg-surface/60"
              )}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("list")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                displayMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground-secondary hover:text-foreground hover:bg-surface/60"
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span>Day List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Chips Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 py-4 border-b border-border/80">
        <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider">Present</span>
            <span className="text-base font-bold text-success">{summaryStats.present} days</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-2.5">
          <Coffee className="w-4 h-4 text-warning flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider">Off Days</span>
            <span className="text-base font-bold text-warning">{summaryStats.offDay} days</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2.5">
          <CalendarIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider">Holidays</span>
            <span className="text-base font-bold text-purple-500">{summaryStats.holiday} days</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2.5">
          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider">Leaves / Absent</span>
            <span className="text-base font-bold text-destructive">{summaryStats.leave + summaryStats.absent} days</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider">Total Days</span>
            <span className="text-base font-bold text-primary">{daysList.length} days</span>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="mt-6">
        {displayMode === "grid" ? (
          <div>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNamesShort.map((dayName, idx) => (
                <div
                  key={dayName}
                  className={cn(
                    "text-center py-2 rounded-lg text-xs font-bold uppercase tracking-wider",
                    idx >= 5 ? "text-warning bg-warning/5" : "text-foreground-secondary bg-muted/40"
                  )}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty padding cells before first day */}
              {Array.from({ length: firstDayOfWeekIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[86px] sm:min-h-[105px] rounded-2xl bg-muted/20 border border-border/20 opacity-30" />
              ))}

              {/* Month Days */}
              {daysList.map((dayInfo) => {
                const isSelected = selectedDay?.dateStr === dayInfo.dateStr;
                return (
                  <div
                    key={dayInfo.dateStr}
                    onClick={() => setSelectedDay(dayInfo)}
                    className={cn(
                      "min-h-[86px] sm:min-h-[105px] p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer select-none",
                      dayInfo.bgClass,
                      dayInfo.borderClass,
                      isSelected ? "ring-2 ring-primary shadow-md scale-[1.02] z-10" : ""
                    )}
                  >
                    {/* Top: Day Num and Weekday short on mobile */}
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        dayInfo.isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
                      )}>
                        {dayInfo.dayNum}
                      </span>
                      {dayInfo.isToday && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold uppercase animate-pulse">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Bottom: Status Pill */}
                    <div className="mt-2">
                      <div className={cn(
                        "px-2 py-1 rounded-xl text-[11px] sm:text-xs font-bold text-center truncate shadow-sm bg-surface/90 dark:bg-surface/80 border border-border/40",
                        dayInfo.textClass
                      )}>
                        {dayInfo.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View Area */
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {daysList.map((dayInfo) => (
              <div
                key={dayInfo.dateStr}
                onClick={() => setSelectedDay(dayInfo)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer",
                  dayInfo.bgClass,
                  dayInfo.borderClass,
                  selectedDay?.dateStr === dayInfo.dateStr ? "ring-2 ring-primary shadow-md" : ""
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-sm shadow-sm bg-surface/90 border border-border/60",
                    dayInfo.textClass
                  )}>
                    <span>{dayInfo.dayNum}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{dayInfo.fullDateStr}</span>
                      {dayInfo.isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                          TODAY
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-foreground-secondary font-medium">
                      Day {dayInfo.dayNum} of {monthNames[viewMonth]} • {dayInfo.dayOfWeek}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                  <span className={cn("px-3.5 py-1.5 rounded-xl text-xs font-bold bg-surface shadow-sm border border-border/50", dayInfo.textClass)}>
                    {dayInfo.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Day Details Panel */}
      {selectedDay && (
        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-surface border-2 border-primary/30 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <h4 className="font-bold text-sm sm:text-base text-foreground">
                Selected Day Details
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground-secondary transition-colors"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <div>
              <span className="text-xs text-foreground-secondary block mb-1">Date</span>
              <span className="font-bold text-sm text-foreground">{selectedDay.fullDateStr}</span>
            </div>
            <div>
              <span className="text-xs text-foreground-secondary block mb-1">Status</span>
              <span className={cn("inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase", selectedDay.textClass, "bg-muted/50 border border-border/60")}>
                {selectedDay.status.replace("_", " ")}
              </span>
            </div>
            <div>
              <span className="text-xs text-foreground-secondary block mb-1">Recorded Hours / Note</span>
              <span className="font-semibold text-sm text-foreground">
                {selectedDay.label}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AttendanceMonthView;
