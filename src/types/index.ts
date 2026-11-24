import type { Dispatch, SetStateAction } from 'react';

export type DayStatus = 'P' | 'A';
export type OTMultiplier = 1 | 1.5 | 2;

export interface Employee {
  id: string;
  empCode: string;
  name: string;
  designation?: string;
  department?: string;
  dailyRate: number;
  active: boolean;
}

export interface DayEntry {
  day: number;
  status: DayStatus;
  otHours: number;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  dailyRate: number;
  targetPayout: number;
  otMultiplier: OTMultiplier;
  presentDays: number;
  absentDays: number;
  otHours: number;
  otPay: number;
  adjustment: number;
  days: DayEntry[];
  seed: number;
  locked?: boolean;
}

export interface AppSettings {
  companyName: string;
  address: string;
  logoBase64?: string;
  shiftHours: number;
  defaultOTMultiplier: OTMultiplier;
  maxOTPerDay: number;
}

export interface AppDB {
  version: number;
  settings: AppSettings;
  employees: Employee[];
  payroll: PayrollRecord[];
}

export interface ImportedPayout {
  empCode: string;
  targetPayout: number;
}

export type SetDB = Dispatch<SetStateAction<AppDB>>;
