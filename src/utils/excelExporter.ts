import ExcelJS from 'exceljs';
import type { AppDB } from '@/types';
import { daysIn, MONTHS } from './reverseCalculator';
import { downloadBlob } from './storage';

const thin = { style: 'thin' as const, color: { argb: 'FF444444' } };
const box = { top: thin, left: thin, bottom: thin, right: thin };

export async function exportMuster(db: AppDB, month: number, year: number) {
  const N = daysIn(month, year);
  const rows = db.payroll
    .filter((r) => r.month === month && r.year === year)
    .map((r) => ({ r, e: db.employees.find((e) => e.id === r.employeeId) }))
    .filter((x): x is { r: (typeof x)['r']; e: NonNullable<(typeof x)['e']> } => !!x.e)
    .sort((a, b) => a.e.empCode.localeCompare(b.e.empCode, undefined, { numeric: true }));
  if (!rows.length) throw new Error('Nothing to export. Generate payroll for this month first.');

  const s = db.settings;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Muster Roll', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
    views: [{ state: 'frozen', xSplit: 3, ySplit: 4 }],
  });
  ws.pageSetup.printTitlesRow = '4:4';

  const fixed = ['Sr', 'Emp Code', 'Name', 'Daily Rate'];
  const tail = ['Present', 'Absent', 'OT Hrs', 'OT Pay', 'Adjustment', 'Net Payable', 'Employee Signature'];
  const total = fixed.length + N + tail.length;
  ws.columns = [
    { width: 5 }, { width: 11 }, { width: 24 }, { width: 10 },
    ...Array.from({ length: N }, () => ({ width: 3.6 })),
    { width: 8 }, { width: 8 }, { width: 8 }, { width: 10 }, { width: 11 }, { width: 13 }, { width: 34 },
  ];

  const title = (r: number, text: string, size: number, bold: boolean) => {
    ws.mergeCells(r, 3, r, total);
    const c = ws.getCell(r, 3);
    c.value = text;
    c.font = { size, bold };
    c.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(r).height = 24;
  };
  title(1, s.companyName, 16, true);
  title(2, s.address || ' ', 10, false);
  title(3, `Attendance & Wage Register - ${MONTHS[month - 1]} ${year}`, 12, true);

  if (s.logoBase64) {
    try {
      const m = /^data:image\/(png|jpe?g|gif)/i.exec(s.logoBase64);
      if (m) {
        const id = wb.addImage({ base64: s.logoBase64, extension: (m[1].toLowerCase().replace('jpg', 'jpeg')) as 'png' | 'jpeg' | 'gif' });
        ws.addImage(id, { tl: { col: 0.1, row: 0.1 }, ext: { width: 70, height: 66 } });
      }
    } catch {
      /* logo is optional */
    }
  }

  const head = ws.getRow(4);
  head.values = [...fixed, ...Array.from({ length: N }, (_, k) => k + 1), ...tail];
  head.height = 30;
  head.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2833' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = box;
  });

  rows.forEach(({ r, e }, i) => {
    const row = ws.addRow([
      i + 1, e.empCode, e.name, r.dailyRate,
      ...r.days.map((d) => d.status),
      r.presentDays, r.absentDays, r.otHours, r.otPay, r.adjustment, r.targetPayout, '',
    ]);
    row.height = 34;
    row.eachCell({ includeEmpty: true }, (c, col) => {
      c.border = box;
      c.font = { size: 10 };
      c.alignment = { vertical: 'middle', horizontal: col === 3 ? 'left' : 'center' };
      const isDay = col > fixed.length && col <= fixed.length + N;
      if (isDay && c.value === 'A') c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE2E0' } };
      if (col >= total - 4 && col < total) c.numFmt = '#,##0.##';
    });
    row.getCell(total - 1).font = { bold: true, size: 10 };
  });

  const t = ws.addRow(Array(total).fill(''));
  t.getCell(3).value = 'Total';
  t.getCell(total - 3).value = rows.reduce((a, x) => a + x.r.otPay, 0);
  t.getCell(total - 2).value = rows.reduce((a, x) => a + x.r.adjustment, 0);
  t.getCell(total - 1).value = rows.reduce((a, x) => a + x.r.targetPayout, 0);
  t.height = 24;
  t.eachCell({ includeEmpty: true }, (c, col) => {
    c.font = { bold: true, size: 10 };
    c.border = box;
    c.alignment = { vertical: 'middle', horizontal: col === 3 ? 'left' : 'center' };
    if (col >= total - 3 && col < total) c.numFmt = '#,##0';
    if (col === total - 1) c.numFmt = '#,##0';
  });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(`MetalLedger_${MONTHS[month - 1]}_${year}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
