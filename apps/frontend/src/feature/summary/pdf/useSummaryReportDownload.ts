import type { RoomSummary } from '@plum/shared-interfaces';
import { pdf } from '@react-pdf/renderer';

import { SummaryReportPDF } from './SummaryReportPDF';

interface DownloadOptions {
  data: RoomSummary;
  date: string;
}

async function generatePDFBlob({ data, date }: DownloadOptions): Promise<Blob> {
  return pdf(SummaryReportPDF({ data, date })).toBlob();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadSummaryReport({ data, date }: DownloadOptions): Promise<void> {
  const blob = await generatePDFBlob({ data, date });
  downloadBlob(blob, `${data.name}_리포트.pdf`);
}
