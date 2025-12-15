import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { UnitData } from '../types';
import { assetUrl } from '../lib/assets';

// Singleton cache for CSV data to prevent duplicate fetches
class CsvDataCache {
  private static instance: CsvDataCache;
  private cache = new Map<string, { data: Record<string, UnitData>; timestamp: number }>();
  private ongoing = new Map<string, Promise<Record<string, UnitData>>>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): CsvDataCache {
    if (!CsvDataCache.instance) {
      CsvDataCache.instance = new CsvDataCache();
    }
    return CsvDataCache.instance;
  }

  async fetchData(url: string): Promise<Record<string, UnitData>> {
    // Check if we already have a fresh cache entry
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Check if we're already fetching this URL
    if (this.ongoing.has(url)) {
      return this.ongoing.get(url)!;
    }

    // Start new fetch
    const fetchPromise = this.performFetch(url);
    this.ongoing.set(url, fetchPromise);

    try {
      const data = await fetchPromise;
      this.cache.set(url, { data, timestamp: Date.now() });
      return data;
    } finally {
      this.ongoing.delete(url);
    }
  }

  private async performFetch(url: string): Promise<Record<string, UnitData>> {
    const isGoogleSheets = url.includes('docs.google.com');
    let finalUrl = url;

    if (!isGoogleSheets) {
      const separator = url.includes('?') ? '&' : '?';
      const cacheBuster = `${separator}v=${Math.random()}&t=${Date.now()}`;
      finalUrl = url + cacheBuster;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(finalUrl, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const unitData: Record<string, UnitData> = {};

            if (Array.isArray(results.data)) {
              results.data.forEach((row: any) => {
                // Updated for new CSV format: "Unit Name" instead of "Product"
                // CSV Header: Product,Available,Size,Amenities,Suite_Floorplan_Url,Building,Floor,Unit_Type,Kitchen_Size,Height,Is_Production_Office,Has_Kitchen,Full_Floor_Floorplan_Url,Tour_3D_Url

                const unitName = (row.Product || row['Unit Name'] || row.Unit)?.trim();
                const unitNameLower = unitName?.toLowerCase();

                if (unitName) {
                  // Legacy fallback for old column name
                  const floorplanUrl = row.Suite_Floorplan_Url || row.Floorplan || row['Column 1'];

                  // Availability
                  const isAvailable = row.Available === '1' || row.Available === 1 ||
                    String(row.Available).toLowerCase() === 'true';

                  const unitDataEntry: UnitData = {
                    name: unitName,
                    availability: isAvailable,
                    size: row.Size || row['Square Feet'] || '',
                    floorPlanUrl: floorplanUrl, // keep for compat

                    // Standard Fields
                    unit_name: unitName,
                    unit_key: unitNameLower,
                    building: row.Building,
                    floor: row.Floor || '',
                    status: isAvailable,
                    unit_type: row.Unit_Type || row.Type || 'Commercial',
                    amenities: row.Amenities || 'Central Air',

                    // Parsed Number Fields
                    area_sqft: (() => {
                      const rawSize = row.Size || row['Square Feet'] || '';
                      const cleanSize = String(rawSize).replace(/[,\s]/g, '').replace(/RSF/gi, '').replace(/sf/gi, '').replace(/[A-Za-z]/g, '');
                      const parsed = parseInt(cleanSize);
                      return parsed > 0 ? parsed : undefined;
                    })(),

                    private_offices: (() => {
                      // Parse private offices count from new CSV format
                      const rawOffices = row.Private_Offices || row['Private Offices'];
                      if (rawOffices !== undefined && rawOffices !== '') {
                        const parsed = parseInt(String(rawOffices));
                        return parsed >= 0 ? parsed : undefined;
                      }
                      return undefined;
                    })(),

                    // NEW FIELDS
                    is_production_office: (String(row.Is_Production_Office).toUpperCase() === 'TRUE') || ['T-700', 'T-200'].includes(unitName),
                    has_kitchen: String(row.Has_Kitchen).toUpperCase() === 'TRUE',

                    // URLS
                    floorplan_url: floorplanUrl,
                    full_floor_floorplan_url: row.Full_Floor_Floorplan_Url || undefined,
                    tour_3d_url: row.Tour_3D_Url || undefined,

                    // CONTACT EMAILS
                    contact_email_id: row.Contact_Email_ID || row['Contact Email ID'] || 'lacenterstudios3d@gmail.com',
                    secondary_email: row.Secondary_Email || 'dwyatt@lacenterstudios.com',

                    // Legacy Support
                    plug_and_play: (String(row.Is_Production_Office).toUpperCase() === 'TRUE') || ['T-700', 'T-200'].includes(unitName),
                    build_to_suit: false
                  };

                  // Store with multiple key formats for flexible matching
                  unitData[unitNameLower] = unitDataEntry;
                  unitData[unitName] = unitDataEntry;
                  unitData[`${unitNameLower}.glb`] = unitDataEntry;
                  unitData[`${unitName}.glb`] = unitDataEntry;

                  const unitNameNoSpace = unitName.replace(/\s+/g, '');
                  unitData[unitNameNoSpace.toLowerCase()] = unitDataEntry;
                  unitData[`${unitNameNoSpace.toLowerCase()}.glb`] = unitDataEntry;
                }
              });
            }

            console.log(`✅ CSV: Loaded ${Object.keys(unitData).length} unit records`);
            resolve(unitData);
          },
          error: (err: any) => {
            console.error('CSV Parse Error:', err);
            reject(new Error(err.message));
          },
        });
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('CSV fetch timeout after 8 seconds');
      }
      throw error;
    }
  }
}

// Debounce function to prevent rapid refetching
function debounce(func: (...args: any[]) => void, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Use Google Sheets as master data source
export function useCsvUnitData(url: string = 'https://docs.google.com/spreadsheets/d/1VLa1fV0mL76Eoh4ZrKJepVcxyqpm6EB6ENhh6SJgxoU/export?format=csv') {
  const [data, setData] = useState<Record<string, UnitData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const cache = CsvDataCache.getInstance();
      const unitData = await cache.fetchData(url);
      setData(unitData);
    } catch (e: any) {
      console.error('🔍 [CSV Debug] Fetch error:', e);
      setError(e.message);
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debouncedFetch = debounce(fetchData, 300);
    debouncedFetch();
  }, [url]);

  return { data, loading, error };
}

// ... helper logic inside class Method ...
// To avoid strict line replacement issues, I will target the `performFetch` method partially or the whole file if easier.
// Actually, standard `replace_file_content` is safer for the fetch function block.

