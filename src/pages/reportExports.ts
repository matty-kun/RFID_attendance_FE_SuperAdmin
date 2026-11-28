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
import { formatYearLevel } from '../utils/formatters';

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

export const STUDENT_COMPLIANCE_HEADERS = [
  'Course',
  'Year Level',
  'Student Name',
  'Present',
  'Absent',
  'Total Required',
  'Attendance Ratio (X/Y)',
  'Compliance Rate',
] as const;

export interface StudentComplianceSummaryRow {
  name: string;
  course: string;
  yearLevel: number | null;
  yearLabel: string;
  present: number;
  absent: number;
  totalRequired: number;
  ratio: string;
  complianceRate: string;
}

export function buildStudentComplianceRows(
  rows: ReportStudentAttendanceRow[],
  extra?: ReportExportExtra
): StudentComplianceSummaryRow[] {
  const sessionCount = extra?.sessionBreakdown?.length || 0;
  const rowSessions = new Set(rows.map((r) => `${r.event}::${r.session}`)).size;
  const totalRequired = Math.max(sessionCount, rowSessions, 1);

  const studentMap = new Map<
    string,
    {
      name: string;
      course: string;
      yearLevel: number | null;
      attendedSessions: Set<string>;
    }
  >();

  for (const r of rows) {
    const studentKey = r.id.includes('::') ? r.id.split('::')[0] : r.name;
    const existing = studentMap.get(studentKey) || {
      name: r.name,
      course: r.course || 'Unspecified',
      yearLevel: r.yearLevel ?? null,
      attendedSessions: new Set<string>(),
    };
    if (existing.yearLevel === null && r.yearLevel !== undefined && r.yearLevel !== null) {
      existing.yearLevel = r.yearLevel;
    }
    if (r.course && existing.course === 'Unspecified') {
      existing.course = r.course;
    }
    const sessionKey = `${r.event}::${r.session}`;
    existing.attendedSessions.add(sessionKey);
    studentMap.set(studentKey, existing);
  }

  const list: StudentComplianceSummaryRow[] = [];
  for (const entry of studentMap.values()) {
    const present = entry.attendedSessions.size;
    const absent = Math.max(0, totalRequired - present);
    const ratePct = totalRequired > 0 ? Math.round((present / totalRequired) * 100) : 0;
    list.push({
      name: entry.name,
      course: entry.course,
      yearLevel: entry.yearLevel,
      yearLabel: formatYearLevel(entry.yearLevel),
      present,
      absent,
      totalRequired,
      ratio: `${present} / ${totalRequired}`,
      complianceRate: `${ratePct}%`,
    });
  }

  // Sort: 1. Course (A-Z) -> 2. Year Level (1-4) -> 3. Student Name (A-Z)
  list.sort((a, b) => {
    const courseComp = a.course.localeCompare(b.course);
    if (courseComp !== 0) return courseComp;

    const yA = a.yearLevel ?? 99;
    const yB = b.yearLevel ?? 99;
    if (yA !== yB) return yA - yB;

    return a.name.localeCompare(b.name);
  });

  return list;
}

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

export function buildExcelWorkbook(
  rows: ReportStudentAttendanceRow[],
  extra?: ReportExportExtra
): XLSX.WorkBook {
  const book = XLSX.utils.book_new();
  const headers = [...REPORT_EXPORT_HEADERS];
  const summary = resolveSummary(rows, extra);
  const filters = extra?.filters;
  const sessionBreakdown = extra?.sessionBreakdown ?? [];
  const checkpointList = extra?.checkpointList ?? [];
  const courseList = extra?.courseList ?? [];
  const complianceRows = buildStudentComplianceRows(rows, extra);

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

  // --- Sheet 2: Student Compliance ---
  const complianceHeaders = [...STUDENT_COMPLIANCE_HEADERS];
  const complianceMappedRows = complianceRows.map((r) =>
    [
      r.course,
      r.yearLabel,
      r.name,
      r.present,
      r.absent,
      r.totalRequired,
      r.ratio,
      r.complianceRate,
    ].map(safeCell)
  );
  const complianceSheet = XLSX.utils.aoa_to_sheet([complianceHeaders, ...complianceMappedRows]);
  complianceSheet['!cols'] = [
    { wch: 32 }, // Course
    { wch: 14 }, // Year Level
    { wch: 36 }, // Student Name
    { wch: 12 }, // Present
    { wch: 12 }, // Absent
    { wch: 16 }, // Total Required
    { wch: 24 }, // Attendance Ratio (X/Y)
    { wch: 18 }, // Compliance Rate
  ];
  XLSX.utils.book_append_sheet(book, complianceSheet, 'Student Compliance');

  // --- Sheet 3: Attendance Records ---
  const mappedRows = rows.map((row) => buildReportExportRowValues(row).map(safeCell));
  const recordsSheet = XLSX.utils.aoa_to_sheet([headers, ...mappedRows]);
  recordsSheet['!cols'] = headers.map((header, colIndex) => {
    let maxLen = header.length;
    for (const row of mappedRows) {
      const valLen = String(row[colIndex] ?? '').length;
      if (valLen > maxLen) maxLen = valLen;
    }
    return { wch: Math.min(60, Math.max(12, maxLen + 4)) };
  });
  XLSX.utils.book_append_sheet(book, recordsSheet, 'Attendance Records');

  return book;
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
  const complianceRows = buildStudentComplianceRows(rows, extra);

  // ==========================================
  // 1. EXCEL (.XLSX)
  // ==========================================
  if (format === 'xlsx') {
    const book = buildExcelWorkbook(rows, extra);
    XLSX.writeFile(book, `${filename}.xlsx`);
    return;
  }

  // ==========================================
  // 2. PDF (.PDF)
  // ==========================================
  if (format === 'pdf') {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const lineHeight = 4.6;
    const cellPadX = 3.5;
    const rowPadTop = 4.8;
    const rowPadBottom = 3.2;

    const termText = filters?.academicTerm ? `Term: ${filters.academicTerm}` : '';
    const eventText = filters?.event ? `Event: ${filters.event}` : '';
    const scopeLine = [termText, eventText].filter(Boolean).join('   |   ') || `Through ${endDate || 'All Dates'}`;

    const renderPdfTable = (
      tableTitle: string,
      tableHeaders: readonly string[],
      colWidths: number[],
      tableRows: string[][],
      centeredIndices: Set<number>,
      isFirstTable: boolean
    ) => {
      const colXPositions = colWidths.reduce<number[]>(
        (positions, width) => [...positions, positions.at(-1)! + width],
        [10]
      );

      const drawHeader = (onFirstPage: boolean) => {
        pdf.setTextColor(36, 19, 63);
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PRESNT Attendance Summary', 10, 13);

        pdf.setTextColor(117, 104, 131);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(scopeLine, 10, 18);

        const filterLine = `Generated: ${filters?.generatedAt || new Date().toLocaleString()}   |   Day: ${filters?.day || 'All'} · Session: ${filters?.session || 'All'} · Course: ${filters?.course || 'All'}   |   ${tableTitle}`;
        pdf.text(filterLine, 10, 22.5);

        if (onFirstPage) {
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

          // Section Title
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(112, 38, 183);
          pdf.text(tableTitle, 10, 47);

          // Table Header Banner
          pdf.setFillColor(240, 232, 252);
          pdf.rect(10, 50, 277, 8.5, 'F');
          pdf.setTextColor(36, 19, 63);
          pdf.setFontSize(8.5);
          pdf.setFont('helvetica', 'bold');
          tableHeaders.forEach((h, index) => {
            if (centeredIndices.has(index)) {
              pdf.text(h, colXPositions[index] + colWidths[index] / 2, 55.5, { align: 'center' });
            } else {
              pdf.text(h, colXPositions[index] + cellPadX, 55.5);
            }
          });
        } else {
          // Subsequent Page Header
          pdf.setFontSize(9.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(112, 38, 183);
          pdf.text(`${tableTitle} (Continued)`, 10, 27);

          pdf.setFillColor(240, 232, 252);
          pdf.rect(10, 30, 277, 8.5, 'F');
          pdf.setTextColor(36, 19, 63);
          pdf.setFontSize(8.5);
          pdf.setFont('helvetica', 'bold');
          tableHeaders.forEach((h, index) => {
            if (centeredIndices.has(index)) {
              pdf.text(h, colXPositions[index] + colWidths[index] / 2, 35.5, { align: 'center' });
            } else {
              pdf.text(h, colXPositions[index] + cellPadX, 35.5);
            }
          });
        }
      };

      if (!isFirstTable) {
        pdf.addPage();
      }

      drawHeader(isFirstTable);
      let rowTopY = isFirstTable ? 58.5 : 38.5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);

      tableRows.forEach((rowValues, rowIndex) => {
        const cellLines = rowValues.map((value, index) =>
          pdf.splitTextToSize(value, colWidths[index] - cellPadX * 2) as string[]
        );
        const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
        const rowHeight = rowPadTop + (maxLines - 1) * lineHeight + rowPadBottom + 1.5;

        if (rowTopY + rowHeight > 196) {
          pdf.addPage();
          drawHeader(false);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          rowTopY = 38.5;
        }

        if (rowIndex % 2 === 1) {
          pdf.setFillColor(250, 248, 252);
          pdf.rect(10, rowTopY, 277, rowHeight, 'F');
        }

        pdf.setTextColor(36, 19, 63);
        const textStartY = rowTopY + rowPadTop;
        cellLines.forEach((lines, index) => {
          const text = lines.length ? lines : ['-'];
          if (centeredIndices.has(index)) {
            pdf.text(text, colXPositions[index] + colWidths[index] / 2, textStartY, { align: 'center' });
          } else if (text.length === 1 && text[0] === '-') {
            pdf.text('-', colXPositions[index] + cellPadX + 4, textStartY, { align: 'center' });
          } else {
            pdf.text(text, colXPositions[index] + cellPadX, textStartY);
          }
        });

        const borderY = rowTopY + rowHeight;
        pdf.setDrawColor(232, 228, 237);
        pdf.line(10, borderY, 287, borderY);
        rowTopY = borderY;
      });
    };

    // Table 1: Student Attendance Compliance (X/Y)
    if (complianceRows.length > 0) {
      const compHeaders = [
        'Course',
        'Year Level',
        'Student Name',
        'Present',
        'Absent',
        'Total Req',
        'Ratio (X/Y)',
        'Compliance Rate',
      ];
      const compWidths = [54, 25, 68, 22, 22, 24, 32, 30];
      const compRows = complianceRows.map((r) => [
        r.course,
        r.yearLabel,
        r.name,
        String(r.present),
        String(r.absent),
        String(r.totalRequired),
        r.ratio,
        r.complianceRate,
      ]);
      renderPdfTable(
        `Student Attendance Compliance (X/Y) — ${complianceRows.length} Students`,
        compHeaders,
        compWidths,
        compRows,
        new Set([1, 3, 4, 5, 6, 7]),
        true
      );
    }

    // Table 2: Detailed Attendance Records
    const recordWidths = [46, 40, 32, 38, 24, 24, 40, 33];
    const recordRows = rows.map(buildReportExportRowValues);
    renderPdfTable(
      `Detailed Attendance Records — ${rows.length} Scans`,
      headers,
      recordWidths,
      recordRows,
      new Set([4, 5]),
      complianceRows.length === 0
    );

    // Page numbering
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

  // Section 2: Student Attendance Compliance (X/Y)
  if (complianceRows.length > 0) {
    docChildren.push(
      new Paragraph({
        text: `Student Attendance Compliance (X/Y) — ${complianceRows.length} Students`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: STUDENT_COMPLIANCE_HEADERS.map((h, i) =>
              new TableCell({
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                width: {
                  size: [24, 12, 28, 8, 8, 10, 10, 10][i],
                  type: WidthType.PERCENTAGE,
                },
                shading: { type: ShadingType.CLEAR, fill: 'F0E8FC' },
                children: [
                  new Paragraph({
                    alignment: i === 0 || i === 2 ? AlignmentType.LEFT : AlignmentType.CENTER,
                    children: [new TextRun({ text: h, bold: true, size: 18 })],
                  }),
                ],
              })
            ),
          }),
          ...complianceRows.map((r, idx) =>
            new TableRow({
              children: [
                r.course,
                r.yearLabel,
                r.name,
                String(r.present),
                String(r.absent),
                String(r.totalRequired),
                r.ratio,
                r.complianceRate,
              ].map((val, i) =>
                new TableCell({
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  width: {
                    size: [24, 12, 28, 8, 8, 10, 10, 10][i],
                    type: WidthType.PERCENTAGE,
                  },
                  shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: 'FAF8FC' } : undefined,
                  children: [
                    new Paragraph({
                      alignment: i === 0 || i === 2 ? AlignmentType.LEFT : AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: val,
                          size: 18,
                          bold: i === 2 || i === 6,
                        }),
                      ],
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

  // Section 3: Full Detailed Attendance Records Table
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
