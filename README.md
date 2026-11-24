# MetalLedger

Local-first reverse payroll and attendance register. Enter each worker's daily rate and agreed monthly payout; MetalLedger generates the attendance, overtime and adjustment, then exports a print-ready Excel muster roll with a signature column.

## Run on your computer
1. Install Node.js 18 or newer from https://nodejs.org
2. Open a terminal in this folder and run:
   ```
   npm install
   npm run dev
   ```
3. Open the address it prints (usually http://localhost:5173)

## Host it
```
npm run build
```
Upload the `dist` folder to any static host (Netlify Drop, Vercel, GitHub Pages, Cloudflare Pages, or any web server). No backend is needed.
Open it through a web address; double-clicking `dist/index.html` will not work in browsers.

## Using it
1. Company settings: name, address, logo, shift hours, overtime rules.
2. Employees: add workers or import from Excel (Emp Code, Name, Designation, Department, Daily Rate).
3. Payroll: pick the month, type each target payout (or upload an Emp ID + Target Payout sheet), press Generate all.
4. Reshuffle attendance or edit single days per worker, then Export Excel.

## Your data
Everything is stored in this browser only. Use Backup regularly and Restore to move data to another computer or browser. Clearing browser data erases it.
