import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "../services/attendanceService";
import type { CustomAxiosConfig } from "../services/api";
import { getErrorMessage } from "../utils/errorHandlers";
import type { AttendanceStatus, AttendanceStatusResponse } from "../types/attendance";

const getDeviceType = (): 'mobile' | 'desktop' => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    return isMobileUA || isMobileScreen ? 'mobile' : 'desktop';
};

const fetchIpCoordinates = async (): Promise<{ latitude: number; longitude: number } | null> => {
    // 1st attempt: ipwho.is (fast, CORS enabled)
    try {
        const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
            const data = await res.json();
            if (data && data.success !== false && typeof data.latitude === "number" && typeof data.longitude === "number") {
                console.log("[Geolocation] Resolved via ipwho.is:", data.latitude, data.longitude);
                return { latitude: data.latitude, longitude: data.longitude };
            }
        }
    } catch (e) {
        console.warn("[Geolocation] ipwho.is failed, trying fallback:", e);
    }

    // 2nd attempt: freeipapi.com (CORS enabled)
    try {
        const res = await fetch("https://freeipapi.com/api/json", { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data.latitude === "number" && typeof data.longitude === "number") {
                console.log("[Geolocation] Resolved via freeipapi.com:", data.latitude, data.longitude);
                return { latitude: data.latitude, longitude: data.longitude };
            }
        }
    } catch (e) {
        console.warn("[Geolocation] freeipapi.com failed:", e);
    }

    return null;
};

const getCurrentCoordinates = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
        const attemptIpFallback = async () => {
            console.log("[Geolocation] Browser GPS unavailable or timed out. Attempting IP-based network location fallback...");
            const ipCoords = await fetchIpCoordinates();
            if (ipCoords) {
                resolve(ipCoords);
            } else {
                resolve(null);
            }
        };

        if (!navigator.geolocation) {
            attemptIpFallback();
            return;
        }

        // Try standard accuracy first (fastest for laptops/PCs via Wi-Fi/network positioning)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                });
            },
            (standardErr) => {
                console.warn("[Geolocation] Standard accuracy failed:", standardErr.code, standardErr.message);

                // Try high accuracy before IP fallback
                navigator.geolocation.getCurrentPosition(
                    (highPos) => {
                        resolve({
                            latitude: highPos.coords.latitude,
                            longitude: highPos.coords.longitude
                        });
                    },
                    (highErr) => {
                        console.warn("[Geolocation] High accuracy failed:", highErr.code, highErr.message);
                        // Device GPS failed or unavailable on PC -> seamlessly fallback to IP location
                        attemptIpFallback();
                    },
                    { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
                );
            },
            { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
        );
    });
};

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
        breakStart: (breakTypeId?: string) => Promise<boolean>;
        breakResume: () => Promise<boolean>;
        fixIncompleteShift: (data: { shiftId: string; logoutTime: string; reason: string; shiftDate: string; remarks?: string }) => Promise<boolean>;
    };
    getNetWorkingDuration: () => { hours: number; minutes: number; totalMs: number };
    getBreakDuration: () => { hours: number; minutes: number; totalMs: number };
    workingHoursFormatted: string;
    breakDurationFormatted: string;
    isTimeSynced: boolean;
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
    const [isTimeSynced, setIsTimeSynced] = useState(false);

    const offsetMsRef = useRef<number | null>(null);

    useEffect(() => {
        const updateClock = () => {
            const now = Date.now();
            if (offsetMsRef.current !== null) {
                setCurrentTime(new Date(now + offsetMsRef.current));
            } else {
                setCurrentTime(new Date(now));
            }
        };

        const timer = setInterval(updateClock, 1000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateClock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
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

                    // Sync time from correction data if available
                    if (correctionData.timestamp) {
                        const serverMs = new Date(correctionData.timestamp).getTime();
                        if (!isNaN(serverMs)) {
                            offsetMsRef.current = serverMs - Date.now();
                        }
                    }

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

                // Sync clock with server time from response
                if (data.timestamp) {
                    const serverMs = new Date(data.timestamp).getTime();
                    if (!isNaN(serverMs)) {
                        offsetMsRef.current = serverMs - Date.now();
                        setIsTimeSynced(true);
                    }
                }

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
                // Sync clock if timestamp is present
                if (data.timestamp) {
                    const serverTime = new Date(data.timestamp).getTime();
                    if (!isNaN(serverTime)) {
                        offsetMsRef.current = serverTime - Date.now();
                        setCurrentTime(new Date(Date.now() + offsetMsRef.current));
                        setIsTimeSynced(true);
                    }
                }

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
            const errMsg = getErrorMessage(err, errorFallback);
            setError(errMsg);

            // If error indicates session desync or already open session, reload to sync UI state
            if (
                errMsg.toLowerCase().includes('already has open session') ||
                errMsg.toLowerCase().includes('already clocked in') ||
                errMsg.toLowerCase().includes('open session')
            ) {
                await queryClient.invalidateQueries({ queryKey: ['attendance-status'] });
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            }
            return false;
        } finally {
            setLoading(false);
        }
    }, [queryClient]);

    const actions = useMemo(() => ({
        clockIn: async () => {
            // Set loading immediately so the button disables before GPS fetch
            setLoading(true);
            setError(null);
            const coords = await getCurrentCoordinates();
            const device = getDeviceType();
            return handleAction(
                () => attendanceService.clockIn({
                    latitude: coords?.latitude,
                    longitude: coords?.longitude,
                    deviceInfo: navigator.userAgent,
                    device,
                }),
                "present",
                "Failed to clock in."
            );
        },
        clockOut: async () => {
            // Set loading immediately so the button disables before GPS fetch
            setLoading(true);
            setError(null);
            const coords = await getCurrentCoordinates();
            const device = getDeviceType();
            return handleAction(
                () => attendanceService.clockOut({
                    latitude: coords?.latitude,
                    longitude: coords?.longitude,
                    deviceInfo: navigator.userAgent,
                    device,
                }),
                "clock_out",
                "Failed to clock out."
            );
        },
        breakStart: (breakTypeId?: string) => handleAction(() => attendanceService.breakStart(breakTypeId), "on_break", "Failed to start break."),
        breakResume: () => handleAction(attendanceService.breakResume, "present", "Failed to resume work."),
        fixIncompleteShift: (data: { shiftId: string; logoutTime: string; reason: string; shiftDate: string; remarks?: string }) =>
            handleAction(() => attendanceService.fixIncompleteShift(data), status, "Failed to fix incomplete shift."),
    }), [handleAction, status]);

    // Background GPS Location Tracking (Every 30 Minutes) during active shifts
    useEffect(() => {
        if (status !== "present" && status !== "on_break") {
            return;
        }

        const trackIntervalTime = 30 * 60 * 1000; // 30 minutes

        const trackCurrentLocation = async () => {
            console.log("[Background Tracking] Running trackCurrentLocation...");
            const coords = await getCurrentCoordinates();
            console.log("[Background Tracking] Coords retrieved:", coords);
            if (coords) {
                try {
                    const result = await attendanceService.trackLocation({
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        type: "tracking"
                    });
                    console.log("[Background Tracking] API response received:", result);
                } catch (err) {
                    console.error("[Background Tracking] Failed to report background location:", err);
                }
            } else {
                console.warn("[Background Tracking] Geolocation coordinates were null (permission denied or secure context restriction). Skipping API call.");
            }
        };

        const initialTimeout = setTimeout(trackCurrentLocation, 5000);
        const intervalId = setInterval(trackCurrentLocation, trackIntervalTime);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(intervalId);
        };
    }, [status]);

    const getNetWorkingDuration = useCallback(() => {

        if (!lastActionTime || (status !== "present" && status !== "on_break")) return { hours: 0, minutes: 0, totalMs: 0 };
        const grossElapsedMs = currentTime.getTime() - lastActionTime.getTime();
        if (grossElapsedMs < 0) return { hours: 0, minutes: 0, totalMs: 0 };
        
        let totalUnpaidMs = (attendanceData?.currentSession?.durationMs || 0) - (attendanceData?.currentSession?.netMs || 0);
        if (status === "on_break" && breakStartTime) {
            const activeBreakDurationMs = currentTime.getTime() - breakStartTime.getTime();
            const isPaid = attendanceData?.currentBreak?.breakType?.isPaid === true;
            if (!isPaid) {
                totalUnpaidMs += activeBreakDurationMs;
            } else {
                const maxDurationMins = attendanceData?.currentBreak?.breakType?.maxDuration || 0;
                if (maxDurationMins > 0) {
                    const maxDurationMs = maxDurationMins * 60000;
                    if (activeBreakDurationMs > maxDurationMs) {
                        totalUnpaidMs += (activeBreakDurationMs - maxDurationMs);
                    }
                }
            }
        }
        const netMs = Math.max(0, grossElapsedMs - totalUnpaidMs);
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
        isTimeSynced,
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
        isTimeSynced,
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
