import { store } from "../store/store";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Gets the current user's timezone from the Redux store
 */
export const getUserTimezone = (): string => {
    try {
        const state = store.getState();
        return state.auth.user?.timezone || DEFAULT_TIMEZONE;
    } catch (_error) {
        return DEFAULT_TIMEZONE;
    }
};

/**
 * Formats a date string or object according to the user's timezone
 */
export const formatInTimezone = (
    date: Date | string | number,
    options: Intl.DateTimeFormatOptions = {},
    timezone?: string
): string => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid Date";

    const tz = timezone || getUserTimezone() || DEFAULT_TIMEZONE;

    return new Intl.DateTimeFormat("en-US", {
        ...options,
        timeZone: tz,
    }).format(d);
};

/**
 * Helper to get a date object whose year, month, day, hour correspond to the user's timezone.
 */
export const getDateInTimezone = (date: Date | string | number, timezone?: string): Date => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date();

    const tz = timezone || getUserTimezone() || DEFAULT_TIMEZONE;

    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: false
        }).formatToParts(d);

        const year = parseInt(parts.find(p => p.type === "year")?.value || "1970", 10);
        const month = parseInt(parts.find(p => p.type === "month")?.value || "1", 10) - 1;
        const day = parseInt(parts.find(p => p.type === "day")?.value || "1", 10);
        let hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
        if (hour === 24) hour = 0;
        const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
        const second = parseInt(parts.find(p => p.type === "second")?.value || "0", 10);

        return new Date(year, month, day, hour, minute, second);
    } catch (_error) {
        return d;
    }
};
