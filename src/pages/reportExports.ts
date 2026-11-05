import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import {
  type ReportStudentAttendanceRow,
  formatReportSession,
  formatReportStatus,
} from './auditPreviewRecords';
import hawiPeekingUrl from '../assets/illustrations/Hawi Peeking.png';

export interface ExportReportOptions {
  startDate?: string;
  endDate?: string;
  eventName?: string;
  systemName?: string;
  course?: string;
  session?: string;
  location?: string;
  type?: string;
}

const headers = ['Student Name', 'Course', 'Session', 'Time In', 'Time Out', 'Status'];

const values = (row: ReportStudentAttendanceRow) => [
  row.name,
  row.course,
  formatReportSession(row.session, row.day, row.period),
  row.timeIn || '—',
  row.timeOut || '—',
  formatReportStatus(row.status),
];


function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadHawiDataUrl(url: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not load Hawi mascot asset:', err);
    return null;
  }
}
let cachedSemiBoldBase64: string | null = null;
let cachedBoldBase64: string | null = null;

async function loadFontAsBase64(url: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1] || null;
          resolve(base64);
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not load font asset from', url, err);
    return null;
  }
}

async function loadNunitoFonts(): Promise<{ regular: string | null; bold: string | null }> {
  try {
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/').replace(/\/$/, '');
    if (!cachedSemiBoldBase64) {
      cachedSemiBoldBase64 = await loadFontAsBase64(`${base}/fonts/NunitoSans_600SemiBold.ttf`);
    }
    if (!cachedBoldBase64) {
      cachedBoldBase64 = await loadFontAsBase64(`${base}/fonts/NunitoSans_700Bold.ttf`);
    }
    return { regular: cachedSemiBoldBase64, bold: cachedBoldBase64 };
  } catch {
    return { regular: null, bold: null };
  }
}

function formatPeriod(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return 'All dates';

  const parse = (d?: string) => {
    if (!d) return null;
    const parts = d.slice(0, 10).split('-');
    if (parts.length === 3) {
      const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const start = parse(startDate);
  const end = parse(endDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (start && end) {
    if (start.getTime() === end.getTime()) {
      return `${months[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth()) {
        return `${months[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${months[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} – ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }

  if (end) {
    return `Through ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (start) {
    return `From ${months[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;
  }
  return 'All dates';
}

export async function exportAttendance(
  rows: ReportStudentAttendanceRow[],
  format: 'xlsx' | 'pdf' | 'docx',
  optionsOrEndDate: string | ExportReportOptions,
) {
  const options: ExportReportOptions =
    typeof optionsOrEndDate === 'string'
      ? { endDate: optionsOrEndDate }
      : optionsOrEndDate || {};

  const systemName = options.systemName || 'Presnt';
  const eventName = options.eventName || 'All events';
  const endDate = options.endDate || '';
  const startDate = options.startDate || '';
  const periodLabel = formatPeriod(startDate, endDate);
  const filename = `attendance-report-${endDate || 'all'}`;

  const activeFilterParts: string[] = [];
  if (options.course && options.course !== 'all') activeFilterParts.push(`Course: ${options.course}`);
  if (options.session && options.session !== 'all') activeFilterParts.push(`Session: ${options.session}`);
  if (options.location && options.location !== 'all') activeFilterParts.push(`Location: ${options.location}`);
  if (options.type && options.type !== 'all') activeFilterParts.push(`Type: ${options.type}`);
  const activeFiltersText = activeFilterParts.join('  ·  ');

  // 1. EXCEL EXPORT (Apple-Grade Presnt Layout with Nunito Sans)
  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = systemName;
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Student Attendance', {
      views: [{ showGridLines: true }],
    });

    // Column definitions matching PDF proportions
    sheet.columns = [
      { key: 'name', width: 32 },
      { key: 'course', width: 36 },
      { key: 'session', width: 28 },
      { key: 'timeIn', width: 16 },
      { key: 'timeOut', width: 16 },
      { key: 'status', width: 22 },
    ];

    // Row 1: Top Brand Title (Presnt)
    const row1 = sheet.addRow([systemName]);
    row1.height = 26;
    row1.getCell(1).font = { name: 'Nunito Sans', size: 16, bold: true, color: { argb: 'FF7026B7' } };
    row1.getCell(1).alignment = { vertical: 'middle' };

    // Row 2: Document Title
    const row2 = sheet.addRow(['Student Attendance Records']);
    row2.height = 22;
    row2.getCell(1).font = { name: 'Nunito Sans', size: 13, bold: true, color: { argb: 'FF24133F' } };
    row2.getCell(1).alignment = { vertical: 'middle' };

    // Row 3: Blank spacing
    const row3 = sheet.addRow([]);
    row3.height = 8;

    // Row 4: Info Card - Event, Period, and Record Count
    let curRowIdx = 4;
    const row4 = sheet.addRow([
      `EVENT: ${eventName}`,
      '',
      `PERIOD: ${periodLabel}`,
      '',
      `RECORDS: ${rows.length} records`,
      '',
    ]);
    row4.height = 24;
    sheet.mergeCells(`A${curRowIdx}:B${curRowIdx}`);
    sheet.mergeCells(`C${curRowIdx}:D${curRowIdx}`);
    sheet.mergeCells(`E${curRowIdx}:F${curRowIdx}`);

    for (let c = 1; c <= 6; c++) {
      const cell = row4.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFAF8FC' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E0EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E0EB' } },
        left: c === 1 ? { style: 'thin', color: { argb: 'FFE5E0EB' } } : undefined,
        right: c === 6 ? { style: 'thin', color: { argb: 'FFE5E0EB' } } : undefined,
      };
      cell.font = { name: 'Nunito Sans', size: 9, bold: true, color: { argb: 'FF24133F' } };
      cell.alignment = { vertical: 'middle', indent: 1 };
    }
    curRowIdx++;

    // Optional Row: Active filters
    if (activeFiltersText) {
      const filterRow = sheet.addRow([`FILTERED BY: ${activeFiltersText}`]);
      filterRow.height = 20;
      sheet.mergeCells(`A${curRowIdx}:F${curRowIdx}`);
      for (let c = 1; c <= 6; c++) {
        const cell = filterRow.getCell(c);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFAF8FC' },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E0EB' } },
          left: c === 1 ? { style: 'thin', color: { argb: 'FFE5E0EB' } } : undefined,
          right: c === 6 ? { style: 'thin', color: { argb: 'FFE5E0EB' } } : undefined,
        };
        cell.font = { name: 'Nunito Sans', size: 8.5, color: { argb: 'FF756883' } };
        cell.alignment = { vertical: 'middle', indent: 1 };
      }
      curRowIdx++;
    }

    // Blank row before table
    const blankRow = sheet.addRow([]);
    blankRow.height = 10;
    curRowIdx++;

    // Table Header Row
    const headerRow = sheet.addRow(headers.map((h) => h.toUpperCase()));
    headerRow.height = 25;
    for (let c = 1; c <= 6; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF4EFFB' },
      };
      cell.font = { name: 'Nunito Sans', size: 9, bold: true, color: { argb: 'FF4A3E56' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: c >= 4 && c <= 6 ? 'center' : 'left',
        indent: c < 4 ? 1 : 0,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E0EB' } },
        bottom: { style: 'medium', color: { argb: 'FFD8B4ED' } },
      };
    }

    // Data Rows
    for (const row of rows) {
      const [name, course, session, timeIn, timeOut, status] = values(row);
      const dataRow = sheet.addRow([name, course, session, timeIn, timeOut, status]);
      dataRow.height = 22;

      // Student Name (Col 1)
      const nameCell = dataRow.getCell(1);
      nameCell.font = { name: 'Nunito Sans', size: 9.5, bold: true, color: { argb: 'FF24133F' } };
      nameCell.alignment = { vertical: 'middle', indent: 1 };

      // Course (Col 2)
      const courseCell = dataRow.getCell(2);
      courseCell.font = { name: 'Nunito Sans', size: 9, color: { argb: 'FF5A4D6B' } };
      courseCell.alignment = { vertical: 'middle', indent: 1 };

      // Session (Col 3)
      const sessionCell = dataRow.getCell(3);
      sessionCell.font = { name: 'Nunito Sans', size: 9, color: { argb: 'FF24133F' } };
      sessionCell.alignment = { vertical: 'middle', indent: 1 };

      // Time In (Col 4)
      const inCell = dataRow.getCell(4);
      inCell.font = {
        name: 'Nunito Sans',
        size: 9,
        bold: timeIn !== '—',
        color: { argb: timeIn === '—' ? 'FFA59AAB' : 'FF24133F' },
      };
      inCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Time Out (Col 5)
      const outCell = dataRow.getCell(5);
      outCell.font = {
        name: 'Nunito Sans',
        size: 9,
        bold: timeOut !== '—',
        color: { argb: timeOut === '—' ? 'FFA59AAB' : 'FF24133F' },
      };
      outCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Status Badge (Col 6)
      const statusCell = dataRow.getCell(6);
      statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (status === 'Completed') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F8EE' } };
        statusCell.font = { name: 'Nunito Sans', size: 8.5, bold: true, color: { argb: 'FF0E8345' } };
      } else if (status === 'No Time-Out') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3D6' } };
        statusCell.font = { name: 'Nunito Sans', size: 8.5, bold: true, color: { argb: 'FFB45309' } };
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8EA' } };
        statusCell.font = { name: 'Nunito Sans', size: 8.5, bold: true, color: { argb: 'FFBE123C' } };
      }

      // Thin bottom row border
      for (let c = 1; c <= 6; c++) {
        dataRow.getCell(c).border = {
          bottom: { style: 'thin', color: { argb: 'FFF1EEF4' } },
        };
      }
    }

    // Footer timestamp row
    const exportTimeStr = new Date().toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    sheet.addRow([]);
    const footerRow = sheet.addRow([`Presnt · Exported on ${exportTimeStr}`]);
    footerRow.height = 18;
    footerRow.getCell(1).font = { name: 'Nunito Sans', size: 8, color: { argb: 'FFA59AAB' } };
    footerRow.getCell(1).alignment = { vertical: 'middle', indent: 1 };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    downloadBlob(blob, `${filename}.xlsx`);
    return;
  }

  // 2. PDF EXPORT (Apple-Grade Presnt Layout with Nunito Sans)
  if (format === 'pdf') {
    const [hawiDataUrl, fonts] = await Promise.all([
      loadHawiDataUrl(hawiPeekingUrl),
      loadNunitoFonts(),
    ]);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const fontName = fonts.regular && fonts.bold ? 'NunitoSans' : 'helvetica';
    if (fonts.regular && fonts.bold) {
      try {
        pdf.addFileToVFS('NunitoSans-SemiBold.ttf', fonts.regular);
        pdf.addFont('NunitoSans-SemiBold.ttf', 'NunitoSans', 'normal');
        pdf.addFileToVFS('NunitoSans-Bold.ttf', fonts.bold);
        pdf.addFont('NunitoSans-Bold.ttf', 'NunitoSans', 'bold');
      } catch (fontErr) {
        console.warn('Could not register NunitoSans font in jsPDF:', fontErr);
      }
    }
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 14;
    const usableWidth = pageWidth - margin * 2; // 269mm
    const widths = [60, 62, 55, 28, 28, 36];
    const xPositions = widths.reduce<number[]>(
      (positions, width) => [...positions, positions.at(-1)! + width],
      [margin],
    );

    const drawPageHeader = (pageNumber: number) => {
      if (pageNumber === 1) {
        // Top accent line (Brand Purple)
        pdf.setFillColor(112, 38, 183);
        pdf.rect(margin, 10, usableWidth, 1.2, 'F');

        // Brand Title: Presnt
        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(15);
        pdf.setTextColor(112, 38, 183);
        pdf.text(systemName, margin, 18.5);

        // Document Title
        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(36, 19, 63);
        pdf.text('Student Attendance Records', margin, 26);

        if (activeFiltersText) {
          pdf.setFont(fontName, 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(117, 104, 131);
          const filterTruncated = pdf.splitTextToSize(`Filtered by: ${activeFiltersText}`, usableWidth - 75)[0] || '';
          pdf.text(filterTruncated, margin + 70, 26);
        }

        // Info Card
        pdf.setFillColor(250, 248, 252);
        pdf.setDrawColor(229, 224, 235);
        pdf.roundedRect(margin, 29.5, usableWidth, 8.5, 1.5, 1.5, 'FD');

        pdf.setFontSize(7.5);
        // Event
        pdf.setFont(fontName, 'bold');
        pdf.setTextColor(112, 38, 183);
        pdf.text('EVENT:', margin + 4, 35);
        pdf.setFont(fontName, 'bold');
        pdf.setTextColor(36, 19, 63);
        pdf.text(eventName, margin + 17, 35);

        // Period (Formatted with month names)
        pdf.setFont(fontName, 'bold');
        pdf.setTextColor(117, 104, 131);
        pdf.text('PERIOD:', margin + 90, 35);
        pdf.setFont(fontName, 'normal');
        pdf.setTextColor(36, 19, 63);
        pdf.text(periodLabel, margin + 104, 35);

        // Records Count
        pdf.setFont(fontName, 'bold');
        pdf.setTextColor(117, 104, 131);
        pdf.text('RECORDS:', margin + 190, 35);
        pdf.setFont(fontName, 'bold');
        pdf.setTextColor(36, 19, 63);
        pdf.text(`${rows.length} records`, margin + 207, 35);

        // Table Header
        pdf.setFillColor(244, 239, 251);
        pdf.roundedRect(margin, 42, usableWidth, 7.5, 1.2, 1.2, 'F');
        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(74, 62, 86);
        headers.forEach((header, index) => {
          pdf.text(header.toUpperCase(), xPositions[index] + 2, 47);
        });
      } else {
        // Subsequent pages compact header
        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(112, 38, 183);
        pdf.text(systemName, margin, 12);

        pdf.setFont(fontName, 'bold');
        pdf.setTextColor(36, 19, 63);
        pdf.text('Student Attendance Records', margin + 15, 12);

        pdf.setFont(fontName, 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(117, 104, 131);
        const subHeaderMeta = [eventName, periodLabel, activeFiltersText].filter(Boolean).join('  ·  ');
        const subHeaderTruncated = pdf.splitTextToSize(`·  ${subHeaderMeta}`, usableWidth - 75)[0] || '';
        pdf.text(subHeaderTruncated, margin + 63, 12);

        // Table Header
        pdf.setFillColor(244, 239, 251);
        pdf.roundedRect(margin, 16, usableWidth, 7.5, 1.2, 1.2, 'F');
        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(74, 62, 86);
        headers.forEach((header, index) => {
          pdf.text(header.toUpperCase(), xPositions[index] + 2, 21);
        });
      }
    };

    let currentPage = 1;
    drawPageHeader(currentPage);

    let y = 56;
    for (const row of rows) {
      if (y > 175) {
        pdf.addPage();
        currentPage += 1;
        drawPageHeader(currentPage);
        y = 30;
      }

      const rowValues = values(row);
      const studentName = rowValues[0];
      const course = rowValues[1];
      const session = rowValues[2];
      const timeIn = rowValues[3];
      const timeOut = rowValues[4];
      const status = rowValues[5];

      // Student Name (bold)
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(36, 19, 63);
      const nameText = pdf.splitTextToSize(studentName, widths[0] - 4)[0] || '';
      pdf.text(nameText, xPositions[0] + 2, y);

      // Course (normal)
      pdf.setFont(fontName, 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(90, 77, 107);
      const courseText = pdf.splitTextToSize(course, widths[1] - 4)[0] || '';
      pdf.text(courseText, xPositions[1] + 2, y);

      // Session (normal, clean)
      const sessionText = pdf.splitTextToSize(session, widths[2] - 4)[0] || '';
      pdf.text(sessionText, xPositions[2] + 2, y);

      // Time In
      pdf.setFont(fontName, timeIn === '—' ? 'normal' : 'bold');
      pdf.setTextColor(timeIn === '—' ? 165 : 36, timeIn === '—' ? 154 : 19, timeIn === '—' ? 171 : 63);
      pdf.text(timeIn, xPositions[3] + 2, y);

      // Time Out
      pdf.setFont(fontName, timeOut === '—' ? 'normal' : 'bold');
      pdf.setTextColor(timeOut === '—' ? 165 : 36, timeOut === '—' ? 154 : 19, timeOut === '—' ? 171 : 63);
      pdf.text(timeOut, xPositions[4] + 2, y);

      // Status Badge
      const badgeX = xPositions[5] + 2;
      const badgeY = y - 3.6;
      const badgeW = 24;
      const badgeH = 5;

      if (status === 'Completed') {
        pdf.setFillColor(232, 248, 238);
        pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'F');
        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(14, 131, 69);
        pdf.text('Completed', badgeX + 4.5, y - 0.2);
      } else if (status === 'No Time-Out') {
        pdf.setFillColor(254, 243, 214);
        pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'F');
        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(180, 83, 9);
        pdf.text('No Time-Out', badgeX + 3.5, y - 0.2);
      } else {
        pdf.setFillColor(253, 232, 234);
        pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'F');
        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(190, 18, 60);
        pdf.text('No Time-In', badgeX + 4, y - 0.2);
      }

      // Thin divider
      pdf.setDrawColor(241, 238, 244);
      pdf.line(margin, y + 2.5, pageWidth - margin, y + 2.5);

      y += 6.5;
    }

    // Footers and Hawi Peeking across all pages
    const totalPages = pdf.getNumberOfPages();
    const exportTimeStr = new Date().toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);

      // Footer divider line
      pdf.setDrawColor(229, 224, 235);
      pdf.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

      // Footer metadata
      pdf.setFont(fontName, 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(165, 154, 171);
      pdf.text(
        `Presnt · Exported on ${exportTimeStr}`,
        margin,
        pageHeight - 6.5,
      );
      pdf.text(
        `Page ${p} of ${totalPages}`,
        pageWidth - margin - 40,
        pageHeight - 6.5,
      );

      // Hawi Peeking from bottom right corner
      if (hawiDataUrl) {
        try {
          // Hawi aspect ratio: 1206 / 1305 = 0.924
          // Width: 20mm, Height: 21.6mm
          pdf.addImage(hawiDataUrl, 'PNG', pageWidth - margin - 20, pageHeight - 23.5, 20, 21.6);
        } catch (imgErr) {
          console.warn('Could not draw mascot on page', imgErr);
        }
      }
    }

    try {
      pdf.save(`${filename}.pdf`);
    } catch (saveErr) {
      console.warn('pdf.save failed, falling back to downloadBlob:', saveErr);
      const pdfBlob = pdf.output('blob');
      downloadBlob(pdfBlob, `${filename}.pdf`);
    }
    return;
  }

  // 3. WORD (DOCX) EXPORT
  const tableRows = [headers, ...rows.map(values)].map((cells, rowIndex) =>
    new TableRow({
      children: cells.map(
        (value) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: value, bold: rowIndex === 0, font: 'Nunito Sans' })],
              }),
            ],
          }),
      ),
    }),
  );

  const document = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: 'landscape' } } },
        children: [
          new Paragraph({
            text: `${systemName} · Student Attendance Records`,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Event: ${eventName}  |  Period: ${periodLabel}${activeFiltersText ? `  |  Filtered: ${activeFiltersText}` : ''}  |  ${rows.length} records`,
                font: 'Nunito Sans',
              }),
            ],
          }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  downloadBlob(await Packer.toBlob(document), `${filename}.docx`);
}
