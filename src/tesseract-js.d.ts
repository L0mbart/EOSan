declare module 'tesseract.js/dist/tesseract.esm.min.js' {
  const tesseract: {
    createWorker: (
      langs: string,
      oem: number,
      options?: {
        logger?: (message: { status: string; progress: number }) => void;
      },
    ) => Promise<{
      recognize: (image: string) => Promise<{ data: { text: string } }>;
    }>;
  };
  export default tesseract;
}
