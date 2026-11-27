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
import {
  formatReportSessionLabel,
  type ReportStudentAttendanceRow,
  type ReportSessionItem,
  type ReportCheckpointItem,
  type ReportCourseItem,
} from './auditPreviewRecords';

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

export interface ReportExportSummary {
  studentsCheckedIn: number;
  timeIns: number;
  timeOuts: number;
  totalScans: number;
}

export interface ReportExportFilterMeta {
  academicTerm?: string;
  event?: string;
  day?: string;
  session?: string;
  course?: string;
  type?: string;
  location?: string;
  dateRange?: string;
  generatedAt?: string;
}

export interface ReportExportExtra {
  summary?: ReportExportSummary;
  filters?: ReportExportFilterMeta;
  sessionBreakdown?: ReportSessionItem[];
  checkpointList?: ReportCheckpointItem[];
  courseList?: ReportCourseItem[];
}

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

export const safeCell = (value: string | number) => {
  if (typeof value === 'number') return value;
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

function resolveSummary(rows: ReportStudentAttendanceRow[], extra?: ReportExportExtra): ReportExportSummary {
  if (extra?.summary) return extra.summary;
  const uniqueStudents = new Set(rows.map((r) => r.name)).size;
  const timeIns = rows.filter((r) => r.timeIn && r.timeIn !== '-').length;
  const timeOuts = rows.filter((r) => r.timeOut && r.timeOut !== '-').length;
  return {
    studentsCheckedIn: uniqueStudents,
    timeIns,
    timeOuts,
    totalScans: timeIns + timeOuts,
  };
}

export async function exportAttendance(
  rows: ReportStudentAttendanceRow[],
  format: 'xlsx' | 'pdf' | 'docx',
  endDate: string,
  extra?: ReportExportExtra
) {
  const filename = `presnt-attendance-summary-${endDate || 'all'}`;
  const headers = [...REPORT_EXPORT_HEADERS];
  const summary = resolveSummary(rows, extra);
  const filters = extra?.filters;
  const sessionBreakdown = extra?.sessionBreakdown ?? [];
  const checkpointList = extra?.checkpointList ?? [];
  const courseList = extra?.courseList ?? [];

  // ==========================================
  // 1. EXCEL (.XLSX)
  // ==========================================
  if (format === 'xlsx') {
    const book = XLSX.utils.book_new();

    // --- Sheet 1: Attendance Summary ---
    const summaryAoa: (string | number)[][] = [
      ['PRESNT Attendance Summary'],
      ['Generated:', filters?.generatedAt || new Date().toLocaleString(), '', 'Academic Term:', filters?.academicTerm || 'All'],
      ['Event:', filters?.event || 'All Events', '', 'Day / Session:', `${filters?.day || 'All'} · ${filters?.session || 'All'}`],
      ['Course:', filters?.course || 'All Courses', '', 'Location / Type:', `${filters?.location || 'All'} · ${filters?.type || 'All'}`],
      [],
      ['KEY ATTENDANCE METRICS'],
      ['Metric', 'Value'],
      ['Unique Students Checked In', summary.studentsCheckedIn],
      ['Total Time-Ins (Entry Scans)', summary.timeIns],
      ['Total Time-Outs (Exit Scans)', summary.timeOuts],
      ['Total Attendance Scans', summary.totalScans],
      ['Total Records in Export', rows.length],
      [],
    ];

    if (sessionBreakdown.length > 0) {
      summaryAoa.push(['SESSION BREAKDOWN']);
      summaryAoa.push(['Session / Event Period', 'Time In', 'Time Out', 'Total Scans']);
      for (const item of sessionBreakdown) {
        summaryAoa.push([item.name, item.timeIns, item.timeOuts, item.timeIns + item.timeOuts]);
      }
      summaryAoa.push([]);
    }

    if (checkpointList.length > 0) {
      summaryAoa.push(['CHECKPOINT DISTRIBUTION']);
      summaryAoa.push(['Checkpoint Location', 'In Scans', 'Out Scans', 'Total Scans']);
      for (const item of checkpointList) {
        summaryAoa.push([item.name, item.inScans, item.outScans, item.total]);
      }
      summaryAoa.push([]);
    }

    if (courseList.length > 0) {
      summaryAoa.push(['COURSE BREAKDOWN']);
      summaryAoa.push(['Course', 'Active Roster', 'Time In', 'Time Out', 'Total Scans']);
      for (const item of courseList) {
        summaryAoa.push([item.course, item.expected, item.timeIn, item.timeOut, item.timeIn + item.timeOut]);
      }
      summaryAoa.push([]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(
      summaryAoa.map((row) => row.map(safeCell))
    );
    summarySheet['!cols'] = [
      { wch: 38 },
      { wch: 22 },
      { wch: 14 },
      { wch: 28 },
      { wch: 32 },
    ];
    XLSX.utils.book_append_sheet(book, summarySheet, 'Attendance Summary');

    // --- Sheet 2: Attendance Records ---
    const mappedRows = rows.map((row) => buildReportExportRowValues(row).map(safeCell));
    const recordsSheet = XLSX.utils.aoa_to_sheet([headers, ...mappedRows]);
    recordsSheet['!cols'] = headers.map((header, colIndex) => {
      const maxLen = Math.max(header.length, ...mappedRows.map((row) => String(row[colIndex] ?? '').length));
      return { wch: Math.min(60, Math.max(12, maxLen + 4)) };
    });
    XLSX.utils.book_append_sheet(book, recordsSheet, 'Attendance Records');

    XLSX.writeFile(book, `${filename}.xlsx`);
    return;
  }

  // ==========================================
  // 2. PDF (.PDF)
  // ==========================================
  if (format === 'pdf') {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    // Printable width: 277mm (10mm left & right margins on 297mm A4 landscape)
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

    const drawSummaryHeader = (isFirstPage: boolean) => {
      // Main Title
      pdf.setTextColor(36, 19, 63);
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PRESNT Attendance Summary', 10, 13);

      // Meta Subtitle
      pdf.setTextColor(117, 104, 131);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const termText = filters?.academicTerm ? `Term: ${filters.academicTerm}` : '';
      const eventText = filters?.event ? `Event: ${filters.event}` : '';
      const scopeLine = [termText, eventText].filter(Boolean).join('   |   ') || `Through ${endDate || 'All Dates'}`;
      pdf.text(scopeLine, 10, 18);

      const filterLine = `Generated: ${filters?.generatedAt || new Date().toLocaleString()}   |   Day: ${filters?.day || 'All'} · Session: ${filters?.session || 'All'} · Course: ${filters?.course || 'All'}   |   ${rows.length} record${rows.length === 1 ? '' : 's'}`;
      pdf.text(filterLine, 10, 22.5);

      if (isFirstPage) {
        // Draw 4 Executive KPI Metric Cards
        const cardW = 65.5;
        const cardH = 15;
        const cardGap = 5;
        const cardY = 25.5;

        const kpis = [
          { label: 'UNIQUE STUDENTS', value: String(summary.studentsCheckedIn), bg: [248, 244, 253], border: [233, 213, 255], text: [112, 38, 183] },
          { label: 'TIME-IN SCANS', value: String(summary.timeIns), bg: [236, 253, 245], border: [167, 243, 208], text: [5, 150, 105] },
          { label: 'TIME-OUT SCANS', value: String(summary.timeOuts), bg: [254, 242, 242], border: [254, 202, 202], text: [220, 38, 38] },
          { label: 'TOTAL SCANS', value: String(summary.totalScans), bg: [248, 250, 252], border: [226, 232, 240], text: [71, 85, 105] },
        ];

        kpis.forEach((kpi, idx) => {
          const cardX = 10 + idx * (cardW + cardGap);
          pdf.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
          pdf.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'FD');

          pdf.setFontSize(6.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
          pdf.text(kpi.label, cardX + 3.5, cardY + 5);

          pdf.setFontSize(13);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(36, 19, 63);
          pdf.text(kpi.value, cardX + 3.5, cardY + 12);
        });

        // Table Header Banner
        pdf.setFillColor(240, 232, 252);
        pdf.rect(10, 44, 277, 8.5, 'F');
        pdf.setTextColor(36, 19, 63);
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');
        headers.forEach((header, index) => {
          if (centeredCols.has(index)) {
            pdf.text(header, xPositions[index] + widths[index] / 2, 49.5, { align: 'center' });
          } else {
            pdf.text(header, xPositions[index] + cellPadX, 49.5);
          }
        });
      } else {
        // Subsequent Pages Table Header
        pdf.setFillColor(240, 232, 252);
        pdf.rect(10, 26, 277, 8.5, 'F');
        pdf.setTextColor(36, 19, 63);
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');
        headers.forEach((header, index) => {
          if (centeredCols.has(index)) {
            pdf.text(header, xPositions[index] + widths[index] / 2, 31.5, { align: 'center' });
          } else {
            pdf.text(header, xPositions[index] + cellPadX, 31.5);
          }
        });
      }
    };

    drawSummaryHeader(true);
    let rowTopY = 52.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);

    rows.forEach((row, rowIndex) => {
      const cellValues = buildReportExportRowValues(row);
      const cellLines = cellValues.map(
        (value, index) => pdf.splitTextToSize(value, widths[index] - cellPadX * 2) as string[]
      );
      const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
      const rowHeight = rowPadTop + (maxLines - 1) * lineHeight + rowPadBottom + 1.5;

      if (rowTopY + rowHeight > 196) {
        pdf.addPage();
        drawSummaryHeader(false);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        rowTopY = 34.5;
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

    // Add page numbers
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7.5);
      pdf.setTextColor(160, 148, 172);
      pdf.text(`PRESNT Attendance Summary   |   Page ${i} of ${totalPages}`, 148.5, 203, { align: 'center' });
    }

    pdf.save(`${filename}.pdf`);
    return;
  }

  // ==========================================
  // 3. WORD (.DOCX)
  // ==========================================
  const docChildren: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'PRESNT Attendance Summary',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `Academic Term: ${filters?.academicTerm || 'All'}   |   Event: ${filters?.event || 'All Events'}`,
          bold: true,
          color: '7026B7',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `Generated: ${filters?.generatedAt || new Date().toLocaleString()}   |   Filters: ${filters?.day || 'All Days'}, ${filters?.session || 'All Sessions'}, ${filters?.course || 'All Courses'}, ${filters?.location || 'All Locations'}   |   ${rows.length} total records`,
          color: '756883',
          size: 18,
        }),
      ],
    }),

    // Section 1: Executive KPI Summary Box Table
    new Paragraph({
      text: 'Executive Summary',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 80 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            'Unique Students Checked In',
            'Time-In Scans',
            'Time-Out Scans',
            'Total Recorded Scans',
          ].map(
            (label) =>
              new TableCell({
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F0E8FC' },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: label, bold: true, size: 18, color: '24133F' })],
                  }),
                ],
              })
          ),
        }),
        new TableRow({
          children: [
            String(summary.studentsCheckedIn),
            String(summary.timeIns),
            String(summary.timeOuts),
            String(summary.totalScans),
          ].map(
            (val, idx) =>
              new TableCell({
                margins: { top: 120, bottom: 120, left: 100, right: 100 },
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'FAF8FC' },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: val,
                        bold: true,
                        size: 26,
                        color: idx === 1 ? '059669' : idx === 2 ? 'DC2626' : '7026B7',
                      }),
                    ],
                  }),
                ],
              })
          ),
        }),
      ],
    }),
  ];

  // Optional Breakdown Tables in Word Document
  if (sessionBreakdown.length > 0) {
    docChildren.push(
      new Paragraph({
        text: 'Session Attendance Breakdown',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: ['Session / Period', 'Time In', 'Time Out', 'Total Scans'].map((h, i) =>
              new TableCell({
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                width: { size: i === 0 ? 55 : 15, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F0E8FC' },
                children: [
                  new Paragraph({
                    alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                    children: [new TextRun({ text: h, bold: true, size: 18 })],
                  }),
                ],
              })
            ),
          }),
          ...sessionBreakdown.map((s, idx) =>
            new TableRow({
              children: [s.name, String(s.timeIns), String(s.timeOuts), String(s.timeIns + s.timeOuts)].map((val, i) =>
                new TableCell({
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  width: { size: i === 0 ? 55 : 15, type: WidthType.PERCENTAGE },
                  shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: 'FAF8FC' } : undefined,
                  children: [
                    new Paragraph({
                      alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                      children: [new TextRun({ text: val, size: 18 })],
                    }),
                  ],
                })
              ),
            })
          ),
        ],
      })
    );
  }

  if (checkpointList.length > 0) {
    docChildren.push(
      new Paragraph({
        text: 'Checkpoint Activity Distribution',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: ['Checkpoint Location', 'In Scans', 'Out Scans', 'Total Scans'].map((h, i) =>
              new TableCell({
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                width: { size: i === 0 ? 55 : 15, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F0E8FC' },
                children: [
                  new Paragraph({
                    alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                    children: [new TextRun({ text: h, bold: true, size: 18 })],
                  }),
                ],
              })
            ),
          }),
          ...checkpointList.map((cp, idx) =>
            new TableRow({
              children: [cp.name, String(cp.inScans), String(cp.outScans), String(cp.total)].map((val, i) =>
                new TableCell({
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  width: { size: i === 0 ? 55 : 15, type: WidthType.PERCENTAGE },
                  shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: 'FAF8FC' } : undefined,
                  children: [
                    new Paragraph({
                      alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                      children: [new TextRun({ text: val, size: 18 })],
                    }),
                  ],
                })
              ),
            })
          ),
        ],
      })
    );
  }

  if (courseList.length > 0) {
    docChildren.push(
      new Paragraph({
        text: 'Course Attendance Breakdown',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: ['Course', 'Active Roster', 'Time In', 'Time Out', 'Total Scans'].map((h, i) =>
              new TableCell({
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                width: { size: i === 0 ? 40 : 15, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F0E8FC' },
                children: [
                  new Paragraph({
                    alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                    children: [new TextRun({ text: h, bold: true, size: 18 })],
                  }),
                ],
              })
            ),
          }),
          ...courseList.map((c, idx) =>
            new TableRow({
              children: [c.course, String(c.expected), String(c.timeIn), String(c.timeOut), String(c.timeIn + c.timeOut)].map((val, i) =>
                new TableCell({
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  width: { size: i === 0 ? 40 : 15, type: WidthType.PERCENTAGE },
                  shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: 'FAF8FC' } : undefined,
                  children: [
                    new Paragraph({
                      alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                      children: [new TextRun({ text: val, size: 18 })],
                    }),
                  ],
                })
              ),
            })
          ),
        ],
      })
    );
  }

  // Section 2: Full Detailed Attendance Records Table
  docChildren.push(
    new Paragraph({
      text: `Student Attendance Records (${rows.length} records)`,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  const tableRows = [headers, ...rows.map(buildReportExportRowValues)].map(
    (cells, rowIndex) =>
      new TableRow({
        tableHeader: rowIndex === 0,
        children: cells.map(
          (value, colIndex) =>
            new TableCell({
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
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
                  children: [new TextRun({ text: value, bold: rowIndex === 0, size: 18 })],
                }),
              ],
            })
        ),
      })
  );

  docChildren.push(
    new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } })
  );

  const document = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: 'landscape' } } },
        children: docChildren,
      },
    ],
  });

  downloadBlob(await Packer.toBlob(document), `${filename}.docx`);
}
