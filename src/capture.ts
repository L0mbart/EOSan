export async function compactCapture(base64: string, mime: string): Promise<{ base64: string; mime: string }> {
  const type = mime.startsWith('image/') ? mime : 'image/jpeg';
  if (typeof document === 'undefined') return { base64, mime: type };
  const image = await loadImage(`data:${type};base64,${base64}`);
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = longest > 1400 ? 1400 / longest : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return { base64, mime: type };
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.82);
  const comma = url.indexOf(',');
  return { base64: url.slice(comma + 1), mime: 'image/jpeg' };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar tidak bisa disiapkan untuk laporan.'));
    image.src = src;
  });
}
