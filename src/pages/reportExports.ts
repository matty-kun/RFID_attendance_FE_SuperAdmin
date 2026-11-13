import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { ReportStudentAttendanceRow } from './auditPreviewRecords';

const headers = ['Name', 'Course', 'Session', 'Day', 'Period', 'Time In', 'Time Out', 'Status'];
const values = (row: ReportStudentAttendanceRow) => [row.name, row.course, row.session, row.day, row.period, row.timeIn, row.timeOut, row.status];
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
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows.map((row) => values(row).map(safeCell))]);
    sheet['!cols'] = [24, 30, 34, 12, 16, 14, 14, 18].map((wch) => ({ wch }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Attendance');
    XLSX.writeFile(book, `${filename}.xlsx`);
    return;
  }

  if (format === 'pdf') {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const widths = [40, 44, 55, 18, 23, 25, 25, 43];
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
      headers.forEach((header, index) => pdf.text(header, xPositions[index] + 2, 31));
    };
    drawHeader();
    let y = 40;
    pdf.setFont('helvetica', 'normal');
    for (const row of rows) {
      if (y > 195) {
        pdf.addPage();
        drawHeader();
        pdf.setFont('helvetica', 'normal');
        y = 40;
      }
      values(row).forEach((value, index) => {
        const text = pdf.splitTextToSize(value, widths[index] - 4)[0] || '';
        pdf.text(text, xPositions[index] + 2, y);
      });
      pdf.setDrawColor(232, 228, 237);
      pdf.line(10, y + 2, 287, y + 2);
      y += 8;
    }
    pdf.save(`${filename}.pdf`);
    return;
  }

  const tableRows = [headers, ...rows.map(values)].map((cells, rowIndex) => new TableRow({
    children: cells.map((value) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: value, bold: rowIndex === 0 })] })],
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
