# Payroll

Local-first reverse payroll and attendance register. Enter each worker's daily rate and agreed monthly payout; Payroll generates attendance and OT pay, then exports a print-ready Excel muster roll with a signature column and a bank-details sheet.

## Run
1. Install Node.js 18+ from https://nodejs.org
2. `npm install` then `npm run dev`
3. Open the printed address (usually http://localhost:5173)

## Host
`npm run build`, then upload `dist` to any static host. Open it via a web address, not by double-clicking `index.html`.

## Rules
- Present days = payout ÷ daily rate (max days in month). No OT unless payout exceeds that; the excess rupees are OT pay.
- Saturdays are filled first: all present when present days ≥ 20, otherwise at least 2.
- No weekly offs; every day is P or A.

## Using it
1. Company settings: name, address, logo, shift hours, OT rate.
2. Employees: add or import (Emp Code, Name, Designation, Plant, Daily Rate, Acc No, IFSC, Aadhaar).
3. Payroll: pick month, enter payouts (or upload Emp ID + Target Payout), Generate all.
4. Reshuffle or edit days per worker, then Export Excel.

## Your data
Stored in this browser only. Use Backup regularly.