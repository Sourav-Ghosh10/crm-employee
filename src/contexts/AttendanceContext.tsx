import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "../services/attendanceService";
import type { CustomAxiosConfig } from "../services/api";
import { getErrorMessage } from "../utils/errorHandlers";
import type { AttendanceStatus, AttendanceStatusResponse } from "../types/attendance";

interface AttendanceContextType {
    status: AttendanceStatus;
    lastActionTime: Date | null;
    breakStartTime: Date | null;
    attendanceData: AttendanceStatusResponse | null;
    loading: boolean;
    initialLoading: boolean;
    error: string | null;
    setError: (error: string | null) => void;
    currentTime: Date;
    actions: {
        clockIn: () => Promise<boolean>;
        clockOut: () => Promise<boolean>;
        breakStart: () => Promise<boolean>;
        breakResume: () => Promise<boolean>;
        fixIncompleteShift: (data: { shiftId: string; logoutTime: string; reason: string; shiftDate: string; remarks?: string }) => Promise<boolean>;
    };
    getNetWorkingDuration: () => { hours: number; minutes: number; totalMs: number };
    getBreakDuration: () => { hours: number; minutes: number; totalMs: number };
    workingHoursFormatted: string;
    breakDurationFormatted: string;
    refreshStatus: () => Promise<void>;
}


const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<AttendanceStatus>("loading");
    const [lastActionTime, setLastActionTime] = useState<Date | null>(null);
    const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
    const [attendanceData, setAttendanceData] = useState<AttendanceStatusResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const queryClient = useQueryClient();

    const {
        data: fetchedData,
        isLoading: queryLoading,
        refetch: refreshStatus
    } = useQuery({
        queryKey: ["attendance-status"],
        queryFn: async () => {
            const config: CustomAxiosConfig = { skipLoading: true };
            const [correctionResp, statusResp] = await Promise.allSettled([
                attendanceService.checkCorrection(config),
                attendanceService.getMyStatus(config)
            ]);

            let newAttendanceData: AttendanceStatusResponse | null = null;
            let newStatus: AttendanceStatus = "not_clocked";

            // Handle Correction Response
            if (correctionResp.status === "fulfilled" && correctionResp.value?.success && correctionResp.value?.data) {
                const correctionData = correctionResp.value.data;
                if (correctionData.requiresLogoutCorrection) {
                    newAttendanceData = {
                        requiresLogoutCorrection: true,
                        incompleteShift: {
                            _id: correctionData.shiftId || "",
                            shiftId: correctionData.shiftId,
                            loginTime: correctionData.loginTime,
                            shiftDate: correctionData.shiftDate,
                            checkIn: { time: correctionData.loginTime || "" },
                            status: "incomplete"
                        }
                    } as AttendanceStatusResponse;
                    return { attendanceData: newAttendanceData, status: "not_clocked" as AttendanceStatus };
                }
            }

            // Handle Main Status Response
            if (statusResp.status === "fulfilled" && statusResp.value?.success && statusResp.value?.data) {
                const data = statusResp.value.data as AttendanceStatusResponse;

                if (data.requiresLogoutCorrection && !data.incompleteShift) {
                    data.incompleteShift = {
                        _id: data.shiftId || "",
                        shiftId: data.shiftId,
                        loginTime: data.loginTime,
                        shiftDate: data.shiftDate,
                        checkIn: { time: data.loginTime || "" },
                        status: "incomplete"
                    };
                }
                newAttendanceData = data;

                if (typeof data.isClockedIn === "boolean") {
                    if (data.isOnBreak || data.status === "on_break" || data.status === "break_start") {
                        newStatus = "on_break";
                    } else if (data.isClockedIn) {
                        newStatus = "present";
                    } else {
                        newStatus = "clock_out";
                    }
                } else {
                    const lastAction = data.lastAction?.toLowerCase();
                    if (lastAction === "clock_in" || lastAction === "present") newStatus = "present";
                    else if (lastAction === "clock_out") newStatus = "clock_out";
                    else if (lastAction === "break_start" || lastAction === "on_break") newStatus = "on_break";
                }
                return { attendanceData: newAttendanceData, status: newStatus };
            }

            return { attendanceData: null, status: "not_clocked" as AttendanceStatus };
        },
        staleTime: 30000, // 30 seconds
    });

    // Synchronize local states with query results for derived data
    useEffect(() => {
        if (fetchedData) {
            setStatus(fetchedData.status);
            setAttendanceData(fetchedData.attendanceData);

            const data = fetchedData.attendanceData;
            const newStatus = fetchedData.status;

            if (data) {
                let timestamp = data.timestamp;
                if (newStatus === "clock_out") {
                    timestamp = data.currentSession?.checkOut?.time || data.timestamp;
                } else {
                    timestamp = data.currentSession?.checkIn?.time || data.timestamp;
                }
                const dateObj = timestamp ? new Date(timestamp) : null;
                setLastActionTime(dateObj && !isNaN(dateObj.getTime()) ? dateObj : null);

                if (newStatus === "on_break") {
                    setBreakStartTime(data.timestamp ? new Date(data.timestamp) : new Date());
                } else {
                    setBreakStartTime(null);
                }
            }
        }
    }, [fetchedData]);

    useEffect(() => {
        setInitialLoading(queryLoading);
    }, [queryLoading]);

    const handleAction = useCallback(async (action: (config?: { skipLoading?: boolean }) => Promise<unknown>, successStatus: AttendanceStatus, errorFallback: string) => {
        setLoading(true);
        setError(null);
        try {
            const resp = await action() as { success?: boolean };
            if (resp && resp.success) {
                setStatus(successStatus);
                // Invalidate query to trigger refresh
                await queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
                return true;
            }
            return false;
        } catch (err) {
            setError(getErrorMessage(err, errorFallback));
            return false;
        } finally {
            setLoading(false);
        }
    }, [queryClient]);

    const actions = useMemo(() => ({
        clockIn: () => handleAction(attendanceService.clockIn, "present", "Failed to clock in."),
        clockOut: () => handleAction(attendanceService.clockOut, "clock_out", "Failed to clock out."),
        breakStart: () => handleAction(attendanceService.breakStart, "on_break", "Failed to start break."),
        breakResume: () => handleAction(attendanceService.breakResume, "present", "Failed to resume work."),
        fixIncompleteShift: (data: { shiftId: string; logoutTime: string; reason: string; shiftDate: string; remarks?: string }) =>
            handleAction(() => attendanceService.fixIncompleteShift(data), status, "Failed to fix incomplete shift."),
    }), [handleAction, status]);

    const getNetWorkingDuration = useCallback(() => {

        if (!lastActionTime || (status !== "present" && status !== "on_break")) return { hours: 0, minutes: 0, totalMs: 0 };
        const grossElapsedMs = currentTime.getTime() - lastActionTime.getTime();
        if (grossElapsedMs < 0) return { hours: 0, minutes: 0, totalMs: 0 };
        let totalBreakMs = attendanceData?.currentSession?.breakMs || 0;
        if (status === "on_break" && breakStartTime) {
            totalBreakMs += (currentTime.getTime() - breakStartTime.getTime());
        }
        const netMs = Math.max(0, grossElapsedMs - totalBreakMs);
        const hours = Math.floor(netMs / (1000 * 60 * 60));
        const minutes = Math.floor((netMs % (1000 * 60 * 60)) / (1000 * 60));
        return { hours, minutes, totalMs: netMs };
    }, [lastActionTime, status, currentTime, breakStartTime, attendanceData]);

    const getBreakDuration = useCallback(() => {
        if (!breakStartTime) return { hours: 0, minutes: 0, totalMs: 0 };
        const diff = currentTime.getTime() - breakStartTime.getTime();
        if (diff < 0) return { hours: 0, minutes: 0, totalMs: 0 };
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { hours, minutes, totalMs: diff };
    }, [breakStartTime, currentTime]);

    const workingHoursFormatted = useMemo(() => {
        const { hours, minutes } = getNetWorkingDuration();
        return `${hours}h ${minutes}m`;
    }, [getNetWorkingDuration]);

    const breakDurationFormatted = useMemo(() => {
        const { hours, minutes } = getBreakDuration();
        return `${hours}h ${minutes}m`;
    }, [getBreakDuration]);

    const value = useMemo(() => ({
        status,
        lastActionTime,
        breakStartTime,
        attendanceData,
        loading,
        initialLoading,
        error,
        setError,
        currentTime,
        actions,
        getNetWorkingDuration,
        getBreakDuration,
        workingHoursFormatted,
        breakDurationFormatted,
        refreshStatus: () => refreshStatus() as any,
    }), [
        status,
        lastActionTime,
        breakStartTime,
        attendanceData,
        loading,
        initialLoading,
        error,
        currentTime,
        actions,
        getNetWorkingDuration,
        getBreakDuration,
        workingHoursFormatted,
        breakDurationFormatted,
        refreshStatus
    ]);


    return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
};

export const useAttendanceContext = () => {
    const context = useContext(AttendanceContext);
    if (context === undefined) {
        throw new Error("useAttendanceContext must be used within an AttendanceProvider");
    }
    return context;
};
