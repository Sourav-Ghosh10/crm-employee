import api from "./api";
import type { AxiosRequestConfig } from "axios";

export interface RecentActivity {
    type: string;
    timestamp: string;
    title: string;
    description: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
}

export interface ActivityResponse {
    success: boolean;
    message: string;
    data: {
        date: string;
        employeeId: string;
        activities: RecentActivity[];
    };
}

export interface BirthdayEmployee {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    department?: string;
    designation?: string;
    dateOfBirth: string;
    birthMonth: number;
    birthDay: number;
    nextBirthdayDate: string;
    daysRemaining: number;
    isCurrentUser: boolean;
}

export interface UpcomingBirthdaysData {
    todayDate: string;
    isTodayMyBirthday: boolean;
    myDaysRemaining: number | null;
    myNextBirthdayDate: string | null;
    todayBirthdays: BirthdayEmployee[];
    upcomingBirthdays: BirthdayEmployee[];
}

export interface UpcomingBirthdaysResponse {
    success: boolean;
    message: string;
    data: UpcomingBirthdaysData;
}

export const employeeService = {
    getRecentActivity: async (params: { date: string; employeeId?: string }, config?: AxiosRequestConfig) => {
        const response = await api.get<ActivityResponse>("/employee/recent-activity", { ...config, params });
        return response.data;
    },
    getUpcomingBirthdays: async (config?: AxiosRequestConfig) => {
        const response = await api.get<UpcomingBirthdaysResponse>("/employee/upcoming-birthdays", config);
        return response.data;
    }
};
