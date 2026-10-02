import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { buildReportHtml } from './pdf';
import type { Report } from './types';

function printHtmlDocument(html: string): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', 'Laporan');
    frame.style.position = 'fixed';
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.width = '210mm';
    frame.style.height = '297mm';
    frame.style.border = '0';
    frame.style.opacity = '0.01';
    frame.style.pointerEvents = 'none';
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      URL.revokeObjectURL(url);
      frame.remove();
      resolve();
    };
    frame.onload = () => {
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!win || !doc) {
        finish();
        return;
      }
      win.addEventListener('afterprint', finish);
      const images = Array.from(doc.images);
      void Promise.all(images.map((image) => image.decode().catch(() => undefined))).then(() => {
        win.focus();
        win.print();
      });
    };
    document.body.appendChild(frame);
    frame.src = url;
  });
}

export async function shareReportPdf(report: Report): Promise<'shared' | 'preview'> {
  const html = buildReportHtml(report);
  if (Platform.OS === 'web') {
    await printHtmlDocument(html);
    return 'preview';
  }
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
