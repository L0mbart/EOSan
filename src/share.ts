import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildReportHtml } from './pdf';
import type { Report } from './types';

export async function shareReportPdf(report: Report): Promise<'shared' | 'preview'> {
  const html = buildReportHtml(report);
  const file = await Print.printToFileAsync({ html, width: 595, height: 842 });
  if (!file?.uri) return 'preview';
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    await Print.printAsync({ html });
    return 'preview';
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: report.shareToWa ? 'Kirim PDF ke WhatsApp' : 'Bagikan laporan',
  });
  return 'shared';
}
