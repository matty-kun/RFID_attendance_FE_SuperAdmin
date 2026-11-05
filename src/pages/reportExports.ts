import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import {
  type ReportStudentAttendanceRow,
  formatReportSession,
  formatReportStatus,
} from './auditPreviewRecords';

export interface ExportReportOptions {
  startDate?: string;
  endDate?: string;
  eventName?: string;
  systemName?: string;
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

const safeCell = (value: string) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

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

export async function exportAttendance(
  rows: ReportStudentAttendanceRow[],
  format: 'xlsx' | 'pdf' | 'docx',
  optionsOrEndDate: string | ExportReportOptions,
) {
  const options: ExportReportOptions =
    typeof optionsOrEndDate === 'string'
      ? { endDate: optionsOrEndDate }
      : optionsOrEndDate || {};

  const systemName = options.systemName || 'PresNTC';
  const eventName = options.eventName || 'All Events';
  const endDate = options.endDate || '';
  const startDate = options.startDate || '';
  const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : endDate ? `Through ${endDate}` : 'All Dates';
  const filename = `attendance-report-${endDate || 'all'}`;

  // 1. EXCEL EXPORT
  if (format === 'xlsx') {
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows.map((row) => values(row).map(safeCell))]);
    sheet['!cols'] = [26, 32, 28, 14, 14, 16].map((wch) => ({ wch }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Attendance');
    XLSX.writeFile(book, `${filename}.xlsx`);
    return;
  }

  // 2. PDF EXPORT (Apple-Grade PresNTC Layout)
  if (format === 'pdf') {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
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

        // Brand & System Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.setTextColor(112, 38, 183);
        pdf.text(systemName.toUpperCase(), margin, 17.5);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(117, 104, 131);
        pdf.text('RFID Attendance Management System', margin + 22, 17.5);

        // Document Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
        pdf.setTextColor(36, 19, 63);
        pdf.text('Student Attendance Records', margin, 25.5);

        // Info Card
        pdf.setFillColor(250, 248, 252);
        pdf.setDrawColor(229, 224, 235);
        pdf.roundedRect(margin, 29, usableWidth, 9, 1.5, 1.5, 'FD');

        pdf.setFontSize(7.5);
        // Event
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(112, 38, 183);
        pdf.text('EVENT:', margin + 3, 34.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(36, 19, 63);
        pdf.text(eventName, margin + 17, 34.5);

        // Date Range
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(117, 104, 131);
        pdf.text('PERIOD:', margin + 85, 34.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(36, 19, 63);
        pdf.text(dateRange, margin + 100, 34.5);

        // Records Count
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(117, 104, 131);
        pdf.text('RECORDS:', margin + 160, 34.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(36, 19, 63);
        pdf.text(`${rows.length} records`, margin + 178, 34.5);

        // Generated
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(117, 104, 131);
        pdf.text('DATE:', margin + 215, 34.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(36, 19, 63);
        pdf.text(
          new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' }),
          margin + 226,
          34.5,
        );

        // Table Header
        pdf.setFillColor(244, 239, 251);
        pdf.roundedRect(margin, 42, usableWidth, 7.5, 1.2, 1.2, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(74, 62, 86);
        headers.forEach((header, index) => {
          pdf.text(header.toUpperCase(), xPositions[index] + 2, 47);
        });
      } else {
        // Subsequent pages compact header
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(112, 38, 183);
        pdf.text(`${systemName} · Student Attendance Records`, margin, 12);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(117, 104, 131);
        pdf.text(`Event: ${eventName}  |  ${dateRange}`, margin + 65, 12);

        // Table Header
        pdf.setFillColor(244, 239, 251);
        pdf.roundedRect(margin, 16, usableWidth, 7.5, 1.2, 1.2, 'F');
        pdf.setFont('helvetica', 'bold');
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
      if (y > 192) {
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
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(36, 19, 63);
      const nameText = pdf.splitTextToSize(studentName, widths[0] - 4)[0] || '';
      pdf.text(nameText, xPositions[0] + 2, y);

      // Course (normal)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(90, 77, 107);
      const courseText = pdf.splitTextToSize(course, widths[1] - 4)[0] || '';
      pdf.text(courseText, xPositions[1] + 2, y);

      // Session (normal, clean)
      const sessionText = pdf.splitTextToSize(session, widths[2] - 4)[0] || '';
      pdf.text(sessionText, xPositions[2] + 2, y);

      // Time In
      pdf.setFont('helvetica', timeIn === '—' ? 'normal' : 'bold');
      pdf.setTextColor(timeIn === '—' ? 165 : 36, timeIn === '—' ? 154 : 19, timeIn === '—' ? 171 : 63);
      pdf.text(timeIn, xPositions[3] + 2, y);

      // Time Out
      pdf.setFont('helvetica', timeOut === '—' ? 'normal' : 'bold');
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
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(14, 131, 69);
        pdf.text('Completed', badgeX + 4.5, y - 0.2);
      } else if (status === 'No Time-Out') {
        pdf.setFillColor(254, 243, 214);
        pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(180, 83, 9);
        pdf.text('No Time-Out', badgeX + 3.5, y - 0.2);
      } else {
        pdf.setFillColor(253, 232, 234);
        pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(190, 18, 60);
        pdf.text('No Time-In', badgeX + 4, y - 0.2);
      }

      // Thin divider
      pdf.setDrawColor(241, 238, 244);
      pdf.line(margin, y + 2.5, pageWidth - margin, y + 2.5);

      y += 6.5;
    }

    // Footers across all pages
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setDrawColor(229, 224, 235);
      pdf.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(165, 154, 171);
      pdf.text(
        `${systemName} Official Attendance Audit · Confidential`,
        margin,
        pageHeight - 7,
      );
      pdf.text(
        `Page ${p} of ${totalPages}`,
        pageWidth - margin - 15,
        pageHeight - 7,
      );
    }

    pdf.save(`${filename}.pdf`);
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
                children: [new TextRun({ text: value, bold: rowIndex === 0 })],
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
            text: `Event: ${eventName}  |  Period: ${dateRange}  |  ${rows.length} records`,
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
