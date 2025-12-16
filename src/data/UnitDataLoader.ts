// src/data/UnitDataLoader.ts
import Papa from 'papaparse';

export interface UnitDataItem {
  sqFt: number | null;
  email?: string;
  status?: string;
}

export async function loadUnitData(): Promise<Record<string, UnitDataItem>> {
  const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/1sDmF1HJk0qYTjLxTCg0dunv9rXmat_KWLitG8tUlMwI/export?format=csv';

  return new Promise((resolve, reject) => {
    Papa.parse(sheetCsvUrl, {
      download: true,
      header: true,
      complete: (results) => {
        const dataMap: Record<string, UnitDataItem> = {};
        results.data.forEach((row: any) => {
          if (row.Unit) { // Assume column A is "Unit"
            const sizeStr = row.Size || row.size || ''; // Column C "Size", handle case variations
            let sqFt = null;
            
            // Parse square footage, removing commas and 'sf'
            if (sizeStr) {
              const cleanSize = sizeStr.toString().replace(/[,sf]/g, '');
              const parsed = parseInt(cleanSize);
              if (!isNaN(parsed)) {
                sqFt = parsed;
              }
            }
            
            dataMap[row.Unit] = {
              sqFt,
              email: row.Email || row.email || '',
              status: row.Status || row.status || ''
            };
          }
        });
        
        console.log('📊 Loaded unit data from Google Sheets:', Object.keys(dataMap).length, 'units');
        console.log('📋 Sample data:', dataMap['T-1200']); // Debug T-1200 specifically
        resolve(dataMap);
      },
      error: (error) => {
        console.error('❌ Failed to load unit data from Google Sheets:', error);
        reject(error);
      }
    });
  });
}