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
    frame.style.left = '-10000px';
    frame.style.top = '0';
    frame.style.width = '800px';
    frame.style.height = '1100px';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) {
      frame.remove();
      resolve();
      return;
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      frame.remove();
      resolve();
    };
    doc.open();
    doc.write(html);
    doc.close();
    win.addEventListener('afterprint', finish);
    const images = Array.from(doc.images);
    const pending = images.filter((image) => !image.complete);
    const ready = pending.length === 0
      ? Promise.resolve()
      : Promise.all(
          pending.map(
            (image) =>
              new Promise<void>((done) => {
                image.onload = () => done();
                image.onerror = () => done();
              }),
          ),
        );
    void ready.then(() => {
      win.focus();
      win.print();
    });
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
