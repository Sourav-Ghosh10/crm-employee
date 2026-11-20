import React, { useState, useEffect, useRef } from "react";
import {
  Cake,
  Calendar,
  Gift,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import type { BirthdayEmployee } from "../../../services/employeeService";

interface UpcomingBirthdaysCardProps {
  todayBirthdays: BirthdayEmployee[];
  upcomingBirthdays: BirthdayEmployee[];
  isLoading?: boolean;
  onCelebrateMe?: () => void;
  isTodayMyBirthday?: boolean;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const UpcomingBirthdaysCard: React.FC<UpcomingBirthdaysCardProps> = ({
  todayBirthdays = [],
  upcomingBirthdays = [],
  isLoading = false,
  onCelebrateMe,
}) => {
  const hasTodayBirthdays = todayBirthdays.length > 0;

  // Tabs: 'today' | 'upcoming'. If todayBirthdays is empty, default to 'upcoming'
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("upcoming");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoSlideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync activeTab when todayBirthdays changes: if today has birthdays, default to today
  useEffect(() => {
    if (hasTodayBirthdays) {
      setActiveTab("today");
    } else {
      setActiveTab("upcoming");
    }
    setCurrentIndex(0);
  }, [hasTodayBirthdays]);

  // Reset index when switching tabs
  const handleTabChange = (tab: "today" | "upcoming") => {
    setActiveTab(tab);
    setCurrentIndex(0);
  };

  const currentList = activeTab === "today" ? todayBirthdays : upcomingBirthdays;
  const totalSlides = currentList.length;

  // Auto-slide carousel every 4.5 seconds if not hovered and more than 1 item
  useEffect(() => {
    if (autoSlideTimerRef.current) {
      clearInterval(autoSlideTimerRef.current);
      autoSlideTimerRef.current = null;
    }

    if (!isHovered && totalSlides > 1) {
      autoSlideTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
      }, 4500);
    }

    return () => {
      if (autoSlideTimerRef.current) {
        clearInterval(autoSlideTimerRef.current);
        autoSlideTimerRef.current = null;
      }
    };
  }, [isHovered, totalSlides]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const getInitials = (firstName: string, lastName: string) => {
    const f = firstName ? firstName.charAt(0).toUpperCase() : "";
    const l = lastName ? lastName.charAt(0).toUpperCase() : "";
    return `${f}${l}` || "🎂";
  };

  const formatBirthdayDate = (month: number, day: number) => {
    const m = MONTH_NAMES[month - 1] || "";
    return `${m} ${day}`;
  };

  const avatarGradients = [
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-purple-500",
    "from-amber-500 to-orange-500",
    "from-teal-500 to-emerald-500",
    "from-blue-500 to-cyan-500",
    "from-violet-500 to-fuchsia-500",
  ];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-surface p-4 sm:p-6 rounded-2xl shadow-sm border border-border flex flex-col h-full justify-between"
    >
      {/* Top Header with Title and Tabs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 dark:text-pink-400 flex items-center justify-center">
              <Cake className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base sm:text-lg text-foreground">
              Birthdays
            </h2>
          </div>

          {/* Slider Prev / Next Controls if multiple slides */}
          {totalSlides > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                aria-label="Previous slide"
                className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-foreground-secondary hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-semibold text-foreground-secondary px-1">
                {currentIndex + 1}/{totalSlides}
              </span>
              <button
                onClick={handleNext}
                aria-label="Next slide"
                className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-foreground-secondary hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Tab Switcher: "Today" tab is ONLY displayed if todayBirthdays has data! */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl mb-4 border border-border/50">
          {hasTodayBirthdays && (
            <button
              onClick={() => handleTabChange("today")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                activeTab === "today"
                  ? "bg-surface text-pink-600 dark:text-pink-400 shadow-sm border border-pink-500/20"
                  : "text-foreground-secondary hover:text-foreground"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-current animate-pulse" />
              <span>Today ({todayBirthdays.length})</span>
            </button>
          )}

          <button
            onClick={() => handleTabChange("upcoming")}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
              activeTab === "upcoming"
                ? "bg-surface text-primary shadow-sm border border-border"
                : "text-foreground-secondary hover:text-foreground"
            )}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Upcoming ({upcomingBirthdays.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area / Slider */}
      <div className="flex-1 flex flex-col justify-center min-h-[220px]">
        {isLoading ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-24 bg-muted/60 rounded-xl"></div>
            <div className="h-6 bg-muted/40 rounded-lg w-1/2 mx-auto"></div>
          </div>
        ) : totalSlides === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-foreground-secondary border-2 border-dashed border-border rounded-xl bg-muted/20">
            <Gift className="w-8 h-8 mb-2 opacity-30 text-pink-500" />
            <p className="text-sm font-medium">No upcoming birthdays</p>
            <p className="text-xs text-foreground-secondary/70 mt-0.5">
              Birthdays will appear here when scheduled.
            </p>
          </div>
        ) : (
          <div className="relative overflow-hidden w-full rounded-2xl">
            {/* Sliding Track */}
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {currentList.map((emp, idx) => {
                const gradient = avatarGradients[idx % avatarGradients.length];
                const isToday = activeTab === "today" || emp.daysRemaining === 0;
                const isTomorrow = emp.daysRemaining === 1;

                return (
                  <div
                    key={emp._id || idx}
                    className="w-full shrink-0 px-0.5"
                  >
                    <div
                      className={cn(
                        "rounded-2xl p-4 flex flex-col items-center text-center relative border transition-all",
                        isToday
                          ? "bg-gradient-to-b from-pink-500/10 via-purple-500/10 to-amber-500/10 border-pink-500/30"
                          : "bg-gradient-to-b from-muted/40 to-muted/20 border-border/80"
                      )}
                    >
                      {/* Avatar with festive badge */}
                      <div className="relative mb-3">
                        <div
                          className={cn(
                            "w-16 h-16 rounded-full bg-gradient-to-tr text-white font-bold text-lg flex items-center justify-center shadow-md",
                            gradient
                          )}
                        >
                          {getInitials(emp.firstName, emp.lastName)}
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-base bg-surface rounded-full shadow-sm p-0.5 border border-border">
                          {isToday ? "🎂" : "🎈"}
                        </span>
                      </div>

                      {/* Employee Name */}
                      <h3 className="font-bold text-sm sm:text-base text-foreground truncate max-w-[220px] flex items-center gap-1.5 justify-center">
                        {emp.fullName}
                        {emp.isCurrentUser && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                            You
                          </span>
                        )}
                      </h3>

                      {/* Department / Designation */}
                      <p className="text-xs text-foreground-secondary truncate max-w-[220px] mt-0.5 mb-3">
                        {emp.designation || emp.department || "Team Member"}
                      </p>

                      {/* Status / Countdown Badge */}
                      {isToday ? (
                        <div className="space-y-2 w-full">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500 text-white font-bold text-xs shadow-sm animate-pulse">
                            <PartyPopper className="w-3.5 h-3.5" />
                            <span>Happy Birthday Today! 🎂</span>
                          </div>

                          {/* If current user, give button to replay celebration */}
                          {emp.isCurrentUser && onCelebrateMe && (
                            <div>
                              <button
                                onClick={onCelebrateMe}
                                className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold shadow hover:shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Celebrate with Confetti! 🎉
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-semibold text-foreground bg-surface px-2.5 py-1 rounded-lg border border-border">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {formatBirthdayDate(emp.birthMonth, emp.birthDay)}
                          </span>

                          <span
                            className={cn(
                              "text-xs font-bold px-2.5 py-1 rounded-full",
                              isTomorrow
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : emp.daysRemaining <= 7
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-muted text-foreground-secondary border border-border"
                            )}
                          >
                            {isTomorrow
                              ? "Tomorrow 🎈"
                              : `In ${emp.daysRemaining} days ⏳`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Slider Pagination Dots */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          {Array.from({ length: totalSlides }).map((_, dotIdx) => (
            <button
              key={dotIdx}
              onClick={() => setCurrentIndex(dotIdx)}
              aria-label={`Go to slide ${dotIdx + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                dotIdx === currentIndex
                  ? "w-5 bg-pink-500"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingBirthdaysCard;
