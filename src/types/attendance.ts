export type AttendanceStatus = "clock_in" | "clock_out" | "break_start" | "break_resume" | "present" | "on_break" | "not_clocked" | "loading";

export interface AttendanceActionTime {
    time: string;
    ipAddress?: string;
}

export interface AttendanceSession {
    checkIn: AttendanceActionTime;
    checkOut?: AttendanceActionTime;
    durationMs: number;
    durationString: string;
    breakMs: number;
    breakDurationString: string;
    breakCount: number;
    netMs: number;
    netDurationString: string;
}

export interface IncompleteShift {
    _id: string;
    shiftId?: string;
    loginTime?: string;
    shiftDate?: string;
    checkIn: AttendanceActionTime;
    status: string;
}


export interface AttendanceStatusResponse {
    isClockedIn: boolean;
    isOnBreak?: boolean;
    currentSession?: AttendanceSession;
    totalSessions?: number;
    totalBreakCount?: number;
    totalHours?: number;
    totalDurationString?: string;
    totalBreakDurationString?: string;
    status?: string;
    lastAction?: string;
    timestamp?: string;
    monthlyOffDays?: string[];
    monthlyOffDaysCount?: number;
    monthlyTargetHours?: number;
    monthlyAttendancePercentage?: number;
    incompleteShift?: IncompleteShift;
    requiresLogoutCorrection?: boolean;
    shiftId?: string;
    loginTime?: string;
    shiftDate?: string;
    monthlyHolidays?: { date: string; name: string }[];
    monthlyHolidaysCount?: number;
    monthlyLeaves?: any[];
    monthlyLeavesCount?: number;
    monthlyAbsentDays?: string[];
    monthlyAbsentDaysCount?: number;
    monthlyPresentDays?: number;
    monthlyWorkingDaysSoFar?: number;
}

export interface AttendanceRecord {
    _id: string;
    date: string;
    shiftDate?: string;
    checkIn?: AttendanceActionTime;
    checkOut?: AttendanceActionTime;
    status: string;
    durationMs?: number;
}

