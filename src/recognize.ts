type OcrWorker = {
  recognize: (image: string) => Promise<{ data: { text: string } }>;
};

type OcrLogger = (message: { status: string; progress: number }) => void;

type OcrModule = {
  createWorker: (langs: string, oem: number, options?: { logger?: OcrLogger }) => Promise<OcrWorker>;
};

let workerPromise: Promise<OcrWorker> | null = null;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar tidak bisa dibuka'));
    image.src = dataUrl;
  });
}

async function enlargeForReading(dataUrl: string): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;
  const image = await loadImage(dataUrl);
  const longest = Math.max(image.width, image.height);
  const scale = longest >= 1600 ? 1 : Math.min(3, 1800 / longest);
  if (scale <= 1.05) return dataUrl;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.imageSmoothingEnabled = true;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function ocrApi(loaded: { default?: OcrModule; createWorker?: OcrModule['createWorker'] }): OcrModule {
  if (loaded.default && typeof loaded.default.createWorker === 'function') return loaded.default;
  if (typeof loaded.createWorker === 'function') return loaded as OcrModule;
  const nested = loaded.default as { default?: OcrModule } | undefined;
  if (nested?.default && typeof nested.default.createWorker === 'function') return nested.default;
  throw new Error('Mesin baca tidak siap');
}

export async function readGraphText(dataUrl: string, onStatus?: (message: string) => void): Promise<string> {
  if (typeof document === 'undefined') return '';
  onStatus?.('Menyiapkan pembaca grafik...');
  const prepared = await enlargeForReading(dataUrl);
  if (!workerPromise) {
    workerPromise = (async () => {
      const loaded = (await import('tesseract.js/dist/tesseract.esm.min.js')) as {
        default?: OcrModule;
        createWorker?: OcrModule['createWorker'];
      };
      return ocrApi(loaded).createWorker('eng', 1, {
        logger: (message) => {
          if (message.status === 'loading language traineddata') onStatus?.('Mengunduh data pembaca...');
          if (message.status === 'recognizing text') {
            onStatus?.(`Membaca grafik ${Math.round((message.progress || 0) * 100)}%`);
          }
        },
      });
    })().catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }
  const worker = await workerPromise;
  onStatus?.('Membaca angka pada gambar...');
  const result = await worker.recognize(prepared);
  return result.data.text ?? '';
}
