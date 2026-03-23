// import api from './api';

import api from "./api";
import type { AxiosRequestConfig } from "axios";

export const attendanceService = {
  getAll: async () => {
    const response = await api.get("/attendance");
    return response.data;
  },
  clockIn: async () => {
    const response = await api.post("/attendance/clock-in");
    return response.data;
  },
  clockOut: async () => {
    const response = await api.post("/attendance/clock-out");
    return response.data;
  },
  breakStart: async () => {
    const response = await api.post("/attendance/break-start");
    return response.data;
  },
  breakResume: async () => {
    const response = await api.post("/attendance/break-resume");
    return response.data;
  },
  getMyStatus: async (config?: AxiosRequestConfig) => {
    const response = await api.get("/attendance/status", config);
    return response.data;
  },
  checkCorrection: async (config?: AxiosRequestConfig) => {
    const response = await api.get("/attendance/check-correction", config);
    return response.data;
  },

  fixIncompleteShift: async (data: {
    shiftId: string;
    logoutTime: string;
    reason: string;
    shiftDate: string;
    remarks?: string;

  }) => {
    const response = await api.post("/attendance/correct-logout", data);
    return response.data;

  },
};

