import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { ReportStudentAttendanceRow } from './auditPreviewRecords';

const headers = ['Name', 'Course', 'Event', 'Session', 'Day', 'Period', 'Time In', 'Time Out', 'Status'];
const values = (row: ReportStudentAttendanceRow) =>
  [row.name, row.course, row.event, row.session, row.day, row.period, row.timeIn, row.timeOut, row.status].map((v) => v || '-');
const safeCell = (value: string) => /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

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

export async function exportAttendance(rows: ReportStudentAttendanceRow[], format: 'xlsx' | 'pdf' | 'docx', endDate: string) {
  const filename = `attendance-report-${endDate || 'all'}`;
  if (format === 'xlsx') {
    const mappedRows = rows.map((row) => values(row).map(safeCell));
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...mappedRows]);
    sheet['!cols'] = headers.map((header, colIndex) => {
      const maxLen = Math.max(header.length, ...mappedRows.map((row) => row[colIndex]?.length ?? 0));
      return { wch: Math.min(60, Math.max(10, maxLen + 3)) };
    });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Attendance');
    XLSX.writeFile(book, `${filename}.xlsx`);
    return;
  }

  if (format === 'pdf') {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const widths = [36, 38, 40, 44, 16, 20, 22, 22, 35];
    const xPositions = widths.reduce<number[]>((positions, width) => [...positions, positions.at(-1)! + width], [10]);
    const drawHeader = () => {
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Student Attendance Records', 10, 15);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Through ${endDate}  |  ${rows.length} records`, 10, 21);
      pdf.setFillColor(240, 232, 252);
      pdf.rect(10, 26, 277, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      headers.forEach((header, index) => {
        if (index === 6 || index === 7) {
          pdf.text(header, xPositions[index] + widths[index] / 2, 31, { align: 'center' });
        } else {
          pdf.text(header, xPositions[index] + 2, 31);
        }
      });
    };
    drawHeader();
    let y = 40;
    pdf.setFont('helvetica', 'normal');
    for (const row of rows) {
      const cellLines = values(row).map((value, index) => pdf.splitTextToSize(value, widths[index] - 4) as string[]);
      const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
      const rowHeight = maxLines * 4 + 4;
      if (y + rowHeight > 200) {
        pdf.addPage();
        drawHeader();
        pdf.setFont('helvetica', 'normal');
        y = 40;
      }
      cellLines.forEach((lines, index) => {
        const text = lines.length ? lines : [''];
        if (index === 6 || index === 7) {
          pdf.text(text, xPositions[index] + widths[index] / 2, y, { align: 'center' });
        } else if (text.length === 1 && text[0] === '-') {
          pdf.text('-', xPositions[index] + 8, y, { align: 'center' });
        } else {
          pdf.text(text, xPositions[index] + 2, y);
        }
      });
      const lineY = y + (maxLines - 1) * 4 + 2;
      pdf.setDrawColor(232, 228, 237);
      pdf.line(10, lineY, 287, lineY);
      y += rowHeight;
    }
    pdf.save(`${filename}.pdf`);
    return;
  }

  const tableRows = [headers, ...rows.map(values)].map((cells, rowIndex) => new TableRow({
    children: cells.map((value, colIndex) => new TableCell({
      children: [
        new Paragraph({
          alignment: colIndex === 6 || colIndex === 7 || (rowIndex > 0 && value === '-') ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: value, bold: rowIndex === 0 })],
        }),
      ],
    })),
  }));
  const document = new Document({ sections: [{
    properties: { page: { size: { orientation: 'landscape' } } },
    children: [
      new Paragraph({ text: 'Student Attendance Records', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `Through ${endDate} · ${rows.length} records` }),
      new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
    ],
  }] });
  downloadBlob(await Packer.toBlob(document), `${filename}.docx`);
}
