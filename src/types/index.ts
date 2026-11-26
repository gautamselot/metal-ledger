import type { Dispatch, SetStateAction } from 'react';

export type DayStatus = 'P' | 'A';
export type OTMultiplier = 1 | 1.5 | 2;
export const UNITS = ['Plant 1', 'Plant 2'] as const;
export type Unit = (typeof UNITS)[number];

export interface Employee {
  id: string;
  empCode: string;
  name: string;
  designation?: string;
    unit: Unit;
  dailyRate: number;
  accNo?: string;
  ifsc?: string;
  aadhaar?: string;
  active: boolean;
  custom?: Record<string, string>;
}

export interface DayEntry {
  day: number;
  status: DayStatus;
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
  customCols?: string[];
  colOrder?: string[];
  colHidden?: string[];
}

export interface AppDB {
  version: number;
  settings: AppSettings;
  employees: Employee[];
  payroll: PayrollRecord[];
}

export interface ImportedPayout {
    name: string;
  targetPayout: number;
}

export type SetDB = Dispatch<SetStateAction<AppDB>>;