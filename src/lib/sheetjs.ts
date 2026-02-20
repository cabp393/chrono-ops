type SheetJs = {
  read: (data: ArrayBuffer, opts: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
  writeFile: (workbook: unknown, fileName: string) => void;
  utils: {
    json_to_sheet: (rows: Record<string, string>[], opts: { header: string[] }) => unknown;
    book_new: () => unknown;
    book_append_sheet: (workbook: unknown, worksheet: unknown, name: string) => void;
    sheet_to_json: <T>(sheet: unknown, opts: { defval: string }) => T[];
  };
};

declare global {
  interface Window {
    XLSX?: SheetJs;
  }
}

let loadingPromise: Promise<SheetJs> | null = null;

export const loadSheetJs = async (): Promise<SheetJs> => {
  if (window.XLSX) return window.XLSX;
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<SheetJs>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async = true;
    script.onload = () => {
      if (window.XLSX) {
        resolve(window.XLSX);
      } else {
        reject(new Error('No se pudo inicializar SheetJS.'));
      }
    };
    script.onerror = () => reject(new Error('No se pudo cargar SheetJS.'));
    document.head.appendChild(script);
  });

  return loadingPromise;
};
