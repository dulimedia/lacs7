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
                // Parse data from Google Sheets CSV
                // Expected columns: Unit, Size, Offices, Kitchen, Status, Production Office
                
                const unitName = (row.Unit || row.Unit_Name || row.Product || row['Unit Name'])?.trim();
                const unitNameLower = unitName?.toLowerCase();

                if (unitName) {
                  // Legacy fallback for old column name
                  const floorplanUrl = row.Suite_Floorplan_Url || row.Floorplan || row['Column 1'];

                  // Parse size as number (remove commas and text)
                  const rawSize = row.Size || row['Square Feet'] || '';
                  const cleanSize = String(rawSize).replace(/,/g, '').replace(/\s/g, '').replace(/RSF/gi, '').replace(/sf/gi, '').replace(/[A-Za-z]/g, '');
                  const parsedSize = parseInt(cleanSize) || 0;

                  // Parse offices count (from Private_Offices column)
                  const rawOffices = row.Private_Offices || row.Offices || row['# of Offices'] || '0';
                  const parsedOffices = parseInt(String(rawOffices)) || 0;

                  // Parse kitchen flag (from Has_Kitchen column)
                  const hasKitchen = String(row.Has_Kitchen).toLowerCase() === 'true' || 
                                     row.Kitchen === '1' || 
                                     String(row.Kitchen).toLowerCase() === 'yes';

                  // Parse production office flag (from Is_Production_Office column)
                  const isProductionOffice = String(row.Is_Production_Office).toLowerCase() === 'true' || 
                                             row['Production Office'] === '1';

                  // Parse status - prioritize Available column (1/0) over Status column
                  const availableValue = row.Available;
                  const status = row.Status || 'Available';

                  let isAvailable = false;
                  if (availableValue !== undefined && availableValue !== null) {
                    const availableStr = String(availableValue).trim();
                    isAvailable = availableStr === '1' || 
                                  availableStr.toLowerCase() === 'true' || 
                                  availableStr.toLowerCase() === 'available';
                  } else {
                    isAvailable = status.toLowerCase() === 'available';
                  }

                  const unitDataEntry: UnitData = {
                    name: unitName,
                    availability: isAvailable,
                    size: String(parsedSize), // Keep as string for display
                    floorPlanUrl: floorplanUrl,

                    // Standard Fields
                    unit_name: unitName,
                    unit_key: unitNameLower,
                    building: row.Building || unitName.charAt(0), // Extract building from unit name if not provided
                    floor: row.Floor || '',
                    status: isAvailable,
                    unit_type: row.Unit_Type || row.Type || 'Commercial',
                    amenities: row.Amenities || 'Central Air',

                    // Parsed Number Fields (critical for filtering)
                    area_sqft: parsedSize,
                    private_offices: parsedOffices,

                    // NEW FIELDS
                    is_production_office: isProductionOffice,
                    has_kitchen: hasKitchen,

                    // URLS
                    floorplan_url: floorplanUrl,
                    full_floor_floorplan_url: row.Full_Floor_Floorplan_Url || undefined,
                    tour_3d_url: row.Tour_3D_Url || undefined,

                    // CONTACT EMAILS
                    contact_email_id: row.Contact_Email_ID || row['Contact Email ID'] || 'lacenterstudios3d@gmail.com',
                    secondary_email: row.Secondary_Email || 'dwyatt@lacenterstudios.com',

                    // Legacy Support
                    plug_and_play: isProductionOffice,
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
            
            // Debug logging for T-1200 specifically
            const t1200Unit = unitData['t-1200'] || unitData['T-1200'];
            if (t1200Unit) {
              console.log('🎯 DEBUG: T-1200 unit found:', {
                name: t1200Unit.unit_name,
                area_sqft: t1200Unit.area_sqft,
                size_raw: t1200Unit.size,
                private_offices: t1200Unit.private_offices,
                is_production_office: t1200Unit.is_production_office,
                status: t1200Unit.status
              });
            } else {
              console.log('❌ DEBUG: T-1200 unit NOT found in parsed data');
              console.log('Available units:', Object.keys(unitData).filter(k => k.includes('1200')));
            }
            
            // Debug logging for units with high square footage
            const largeUnits = Object.values(unitData)
              .filter(unit => unit.area_sqft && unit.area_sqft > 15000)
              .map(unit => ({ name: unit.unit_name, sqft: unit.area_sqft }));
            console.log('🏢 DEBUG: Large units (>15k sq ft):', largeUnits);
            
            // Debug logging for Tower units that should now be visible
            const towerUnits = Object.values(unitData)
              .filter(unit => unit.unit_name?.match(/^T-?(100|110|600|800|900|950|1100)$/i))
              .map(unit => ({ name: unit.unit_name, available: unit.status, sqft: unit.area_sqft }));
            console.log('🗼 DEBUG: Previously excluded Tower units (should now appear):', towerUnits);
            
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
export function useCsvUnitData(url: string = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSeevbF2MkJT1nwQWjtv69cGMSELhP8kO61aTI1BHT29rKNImpQXIqJ3NjdIfewPwYW1JKmZ1TKdVkU/pub?output=csv') {
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

