import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { formatReportSessionLabel, type ReportStudentAttendanceRow } from './auditPreviewRecords';

export { formatReportSessionLabel };

export const REPORT_EXPORT_HEADERS = [
  'Name',
  'Course',
  'Event',
  'Session',
  'Time In',
  'Time Out',
  'Admin Officer',
  'Status',
] as const;

export function buildReportExportRowValues(row: ReportStudentAttendanceRow): string[] {
  return [
    row.name,
    row.course,
    row.event,
    formatReportSessionLabel(row),
    row.timeIn,
    row.timeOut,
    row.adminOfficer || row.scannedBy || '-',
    row.status,
  ].map((v) => (v && v.trim() ? v.trim() : '-'));
}

export const safeCell = (value: string) => {
  if (!value || /^[-–—\s]+$/.test(value)) return value || '-';
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};

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
  endDate: string
) {
  const filename = `attendance-report-${endDate || 'all'}`;
  const headers = [...REPORT_EXPORT_HEADERS];

  if (format === 'xlsx') {
    const mappedRows = rows.map((row) => buildReportExportRowValues(row).map(safeCell));
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...mappedRows]);
    sheet['!cols'] = headers.map((header, colIndex) => {
      const maxLen = Math.max(header.length, ...mappedRows.map((row) => row[colIndex]?.length ?? 0));
      return { wch: Math.min(60, Math.max(12, maxLen + 4)) };
    });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Attendance');
    XLSX.writeFile(book, `${filename}.xlsx`);
    return;
  }

  if (format === 'pdf') {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    // Total printable width = 277mm (10mm left + 10mm right margin on 297mm A4 landscape)
    const widths = [46, 40, 32, 38, 24, 24, 40, 33];
    const xPositions = widths.reduce<number[]>(
      (positions, width) => [...positions, positions.at(-1)! + width],
      [10]
    );
    const centeredCols = new Set([4, 5]); // Time In, Time Out
    const lineHeight = 4.6;
    const cellPadX = 3.5;
    const rowPadTop = 4.8;
    const rowPadBottom = 3.2;

    const drawHeader = () => {
      pdf.setTextColor(36, 19, 63);
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Student Attendance Records', 10, 15);
      pdf.setTextColor(117, 104, 131);
      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Through ${endDate || 'All Dates'}   |   ${rows.length} record${rows.length === 1 ? '' : 's'}`, 10, 21.5);

      pdf.setFillColor(240, 232, 252);
      pdf.rect(10, 26, 277, 9.5, 'F');
      pdf.setTextColor(36, 19, 63);
      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'bold');
      headers.forEach((header, index) => {
        if (centeredCols.has(index)) {
          pdf.text(header, xPositions[index] + widths[index] / 2, 32, { align: 'center' });
        } else {
          pdf.text(header, xPositions[index] + cellPadX, 32);
        }
      });
    };

    drawHeader();
    let rowTopY = 36;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);

    rows.forEach((row, rowIndex) => {
      const cellValues = buildReportExportRowValues(row);
      const cellLines = cellValues.map(
        (value, index) => pdf.splitTextToSize(value, widths[index] - cellPadX * 2) as string[]
      );
      const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
      const rowHeight = rowPadTop + (maxLines - 1) * lineHeight + rowPadBottom + 1.5;

      if (rowTopY + rowHeight > 198) {
        pdf.addPage();
        drawHeader();
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        rowTopY = 36;
      }

      if (rowIndex % 2 === 1) {
        pdf.setFillColor(250, 248, 252);
        pdf.rect(10, rowTopY, 277, rowHeight, 'F');
      }

      pdf.setTextColor(36, 19, 63);
      const textStartY = rowTopY + rowPadTop;
      cellLines.forEach((lines, index) => {
        const text = lines.length ? lines : ['-'];
        if (centeredCols.has(index)) {
          pdf.text(text, xPositions[index] + widths[index] / 2, textStartY, { align: 'center' });
        } else if (text.length === 1 && text[0] === '-') {
          pdf.text('-', xPositions[index] + cellPadX + 4, textStartY, { align: 'center' });
        } else {
          pdf.text(text, xPositions[index] + cellPadX, textStartY);
        }
      });

      const borderY = rowTopY + rowHeight;
      pdf.setDrawColor(232, 228, 237);
      pdf.line(10, borderY, 287, borderY);
      rowTopY = borderY;
    });

    pdf.save(`${filename}.pdf`);
    return;
  }

  const tableRows = [headers, ...rows.map(buildReportExportRowValues)].map(
    (cells, rowIndex) =>
      new TableRow({
        tableHeader: rowIndex === 0,
        children: cells.map(
          (value, colIndex) =>
            new TableCell({
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              width: {
                size: [17, 15, 12, 15, 8, 8, 13, 12][colIndex],
                type: WidthType.PERCENTAGE,
              },
              shading:
                rowIndex === 0
                  ? { type: ShadingType.CLEAR, fill: 'F0E8FC' }
                  : rowIndex % 2 === 0
                    ? { type: ShadingType.CLEAR, fill: 'FAF8FC' }
                    : undefined,
              children: [
                new Paragraph({
                  alignment:
                    colIndex === 4 || colIndex === 5 || (rowIndex > 0 && value === '-')
                      ? AlignmentType.CENTER
                      : AlignmentType.LEFT,
                  children: [new TextRun({ text: value, bold: rowIndex === 0 })],
                }),
              ],
            })
        ),
      })
  );

  const document = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: 'landscape' } } },
        children: [
          new Paragraph({ text: 'Student Attendance Records', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            spacing: { after: 200 },
            text: `Through ${endDate || 'All Dates'} · ${rows.length} record${rows.length === 1 ? '' : 's'}`,
          }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      },
    ],
  });
  downloadBlob(await Packer.toBlob(document), `${filename}.docx`);
}
