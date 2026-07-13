import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from "lucide-react";
import { cn } from "../../../lib/utils";

interface LeaveModalCalendarPickerProps {
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  onSelectRange: (start: string, end: string) => void;
  allowPastDates?: boolean;
}

const formatToYYYYMMDD = (year: number, month: number, day: number): string => {
  const y = year.toString().padStart(4, "0");
  const m = (month + 1).toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const LeaveModalCalendarPicker: React.FC<LeaveModalCalendarPickerProps> = ({
  startDate,
  endDate,
  isHalfDay,
  onSelectRange,
  allowPastDates = true,
}) => {
  // Initialize view month to startDate's month if present, or current month
  const initialDate = startDate ? new Date(startDate + "T00:00:00") : new Date();
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

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
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Generate calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const todayStr = formatToYYYYMMDD(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );

  const handleDateClick = (clickedDateStr: string) => {
    if (!allowPastDates && clickedDateStr < todayStr) {
      return;
    }

    if (isHalfDay) {
      // For half day, both start and end date become the clicked date
      onSelectRange(clickedDateStr, clickedDateStr);
      return;
    }

    if (!startDate || (startDate && endDate && startDate !== endDate)) {
      // Start fresh selection
      onSelectRange(clickedDateStr, "");
    } else if (startDate && !endDate) {
      // Second click: set end date or swap
      if (clickedDateStr < startDate) {
        onSelectRange(clickedDateStr, startDate);
      } else {
        onSelectRange(startDate, clickedDateStr);
      }
    } else {
      // Fallback
      onSelectRange(clickedDateStr, "");
    }
  };

  return (
    <div className="mt-4 p-4 rounded-2xl bg-surface/80 border border-border/80 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            {monthNames[currentMonth]} {currentYear}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToday}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground-secondary hover:text-foreground hover:bg-muted/80 transition-colors mr-1"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-muted text-foreground-secondary transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-muted text-foreground-secondary transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-[11px] text-foreground-secondary mb-3 flex items-center gap-1.5 bg-muted/40 p-2 rounded-lg border border-border/40">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        {isHalfDay ? (
          <span>Select a date for your half-day leave.</span>
        ) : !startDate ? (
          <span>Click on your desired <strong>Start Date</strong>.</span>
        ) : !endDate ? (
          <span>Start date: <strong className="text-primary">{startDate}</strong>. Now click on the <strong>End Date</strong>.</span>
        ) : (
          <span>Selected range: <strong className="text-primary">{startDate}</strong> to <strong className="text-primary">{endDate}</strong>. Click any date to reset or change.</span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className={cn(
              "text-[11px] font-bold py-1",
              idx === 0 || idx === 6 ? "text-error/80" : "text-foreground-secondary"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9 rounded-lg bg-transparent" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateStr = formatToYYYYMMDD(currentYear, currentMonth, dayNum);
          const isWeekend = new Date(currentYear, currentMonth, dayNum).getDay() === 0 || new Date(currentYear, currentMonth, dayNum).getDay() === 6;
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const isDisabledByPastDate = !allowPastDates && isPast;

          const isStart = startDate === dateStr;
          const isEnd = !isHalfDay && endDate === dateStr;
          const isSelectedRange =
            !isHalfDay &&
            startDate &&
            endDate &&
            dateStr >= startDate &&
            dateStr <= endDate;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabledByPastDate}
              onClick={() => !isDisabledByPastDate && handleDateClick(dateStr)}
              className={cn(
                "h-9 rounded-lg font-medium text-xs relative flex flex-col items-center justify-center transition-all duration-150 select-none",
                isDisabledByPastDate && "opacity-35 cursor-not-allowed text-foreground-tertiary bg-muted/20 hover:bg-muted/20",
                !isDisabledByPastDate && !isSelectedRange && !isStart && !isEnd && (isWeekend ? "text-error/70 hover:bg-error/5" : "text-foreground hover:bg-primary/10"),
                !isDisabledByPastDate && isToday && !isSelectedRange && !isStart && !isEnd && "border border-primary font-bold text-primary bg-primary/5",
                !isDisabledByPastDate && isSelectedRange && !isStart && !isEnd && "bg-primary/15 text-primary font-bold rounded-none first:rounded-l-lg last:rounded-r-lg",
                !isDisabledByPastDate && isStart && !isEnd && "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 scale-105 z-10",
                !isDisabledByPastDate && isEnd && !isStart && "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 scale-105 z-10",
                !isDisabledByPastDate && isStart && isEnd && "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 scale-105 z-10 rounded-lg",
                !isDisabledByPastDate && isStart && endDate && startDate !== endDate && "rounded-l-lg rounded-r-none",
                !isDisabledByPastDate && isEnd && startDate && startDate !== endDate && "rounded-r-lg rounded-l-none"
              )}
            >
              <span>{dayNum}</span>
              {(isStart || isEnd) && (
                <Check className="w-2.5 h-2.5 absolute bottom-0.5 text-white/90" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeaveModalCalendarPicker;
