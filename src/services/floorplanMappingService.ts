// Intelligent floorplan mapping service
// Maps unit names to available floorplan files (PDF Originals)

import { logger } from '../utils/logger';

// Base path for PDF originals
const PDF_BASE = 'floorplans/pdf-originals';

// Helper to construct paths
const fifthStreetPath = (floor: string, file: string) => `${PDF_BASE}/fifth-street/${floor}/${file}`;
const marylandPath = (floor: string, file: string) => `${PDF_BASE}/maryland/${floor}/${file}`;
const towerPath = (floor: string, file: string) => `${PDF_BASE}/tower/${floor}/${file}`;
const towerUnitPath = (floor: string, file: string) => `${PDF_BASE}/tower/${floor}/units/${file}`;

// Tower unit to floor mapping
// Tower structure: tower/[floor]/LACS_Floor [n]_M1_Color.pdf
// Tower units: tower/[floor]/units/LACS_T-[n]_M1_Color.pdf
export const TOWER_UNIT_FLOOR_MAPPINGS: { [key: string]: { floorFloorplan: string; individualFloorplan?: string; combinedFloorplan?: string } } = {
  // 1st Floor
  't100': {
    floorFloorplan: towerPath('1st-floor', 'LACS_Floor 1_M1_Color.pdf'),
    combinedFloorplan: towerPath('1st-floor', 'LACS_T-100_Suite and Floor Plan.pdf')
  },
  't110': {
    floorFloorplan: towerPath('1st-floor', 'LACS_Floor 1_M1_Color.pdf'),
    combinedFloorplan: towerPath('1st-floor', 'LACS_T-110_Suite and Floor Plan.pdf')
  },

  // 2nd Floor (Verified Correct)
  't200': {
    floorFloorplan: towerPath('2nd-floor', 'LACS_Floor 2_M1_Color.pdf'),
    combinedFloorplan: towerPath('2nd-floor', 'LACS_T-200_Suite and Floor Plan.pdf')
  },
  't210': {
    floorFloorplan: towerPath('2nd-floor', 'LACS_Floor 2_M1_Color.pdf'),
    combinedFloorplan: towerPath('2nd-floor', 'LACS_T-210_Suite and Floor Plan.pdf')
  },
  't220': {
    floorFloorplan: towerPath('2nd-floor', 'LACS_Floor 2_M1_Color.pdf'),
    combinedFloorplan: towerPath('2nd-floor', 'LACS_T-220_Suite and Floor Plan.pdf')
  },
  't230': {
    floorFloorplan: towerPath('2nd-floor', 'LACS_Floor 2_M1_Color.pdf'),
    combinedFloorplan: towerPath('2nd-floor', 'LACS_T-230_Suite and Floor Plan.pdf')
  },

  // 3rd Floor (Fixed filenames)
  't300': {
    floorFloorplan: towerPath('3rd-floor', 'LACS_Floor 3_Color.pdf'),
    combinedFloorplan: towerPath('3rd-floor', 'LACS_T-300_Suite and Floor Plan.pdf')
  },
  't310': {
    floorFloorplan: towerPath('3rd-floor', 'LACS_Floor 3_Color.pdf'),
    combinedFloorplan: towerPath('3rd-floor', 'LACS_T-310_Suite and Floor Plan.pdf')
  },
  't320': {
    floorFloorplan: towerPath('3rd-floor', 'LACS_Floor 3_Color.pdf'),
    combinedFloorplan: towerPath('3rd-floor', 'LACS_T-320_Suite and Floor Plan.pdf')
  },
  't340': {
    floorFloorplan: towerPath('3rd-floor', 'LACS_Floor 3_Color.pdf'),
    combinedFloorplan: towerPath('3rd-floor', 'LACS_T-340_Suite and Floor Plan.pdf')
  },

  // 4th Floor (Fixed filenames)
  't400': {
    floorFloorplan: towerPath('4th-floor', 'REF_LACS_Floor 4_D14_Color.pdf'),
    combinedFloorplan: towerPath('4th-floor', 'LACS_T-400_Suite and Floor Plan.pdf')
  },
  't410': {
    floorFloorplan: towerPath('4th-floor', 'REF_LACS_Floor 4_D14_Color.pdf'),
    combinedFloorplan: towerPath('4th-floor', 'LACS_T-410_Suite and Floor Plan.pdf')
  },
  't420': {
    floorFloorplan: towerPath('4th-floor', 'REF_LACS_Floor 4_D14_Color.pdf'),
    combinedFloorplan: towerPath('4th-floor', 'LACS_T-420_Suite and Floor Plan.pdf')
  },
  't430': {
    floorFloorplan: towerPath('4th-floor', 'REF_LACS_Floor 4_D14_Color.pdf'),
    combinedFloorplan: towerPath('4th-floor', 'LACS_T-430_Suite and Floor Plan.pdf')
  },
  't450': {
    floorFloorplan: towerPath('4th-floor', 'REF_LACS_Floor 4_D14_Color.pdf'),
    combinedFloorplan: towerPath('4th-floor', 'LACS_T-450_Suite and Floor Plan.pdf')
  },

  // 5th Floor (Fixed filenames)
  't500': {
    floorFloorplan: towerPath('5th-floor', 'LACS_Floor 5_M1_Color.pdf'),
    combinedFloorplan: towerPath('5th-floor', 'LACS_T-500_Suite and Floor Plan.pdf')
  },
  't530': {
    floorFloorplan: towerPath('5th-floor', 'LACS_Floor 5_M1_Color.pdf'),
    combinedFloorplan: towerPath('5th-floor', 'LACS_T-530_Suite and Floor Plan.pdf')
  },
  't550': {
    floorFloorplan: towerPath('5th-floor', 'LACS_Floor 5_M1_Color.pdf'),
    combinedFloorplan: towerPath('5th-floor', 'LACS_T-550_Suite and Floor Plan.pdf')
  },

  // 6th Floor
  // 6th Floor
  't600': {
    floorFloorplan: towerPath('6th-floor', 'LACS_Floor 6_M1_Color.pdf'),
    combinedFloorplan: towerPath('6th-floor', 'LACS_T-600_Suite and Floor Plan.pdf')
  },

  // 7th Floor
  // 7th Floor
  't700': {
    floorFloorplan: towerPath('7th-floor', 'LACS_Floor 7_M1_Color.pdf'),
    combinedFloorplan: towerPath('7th-floor', 'LACS_T-700_Suite and Floor Plan.pdf')
  },

  // 8th Floor
  // 8th Floor
  't800': {
    floorFloorplan: towerPath('8th-floor', 'LACS_Floor 8_M1_Color.pdf'),
    combinedFloorplan: towerPath('8th-floor', 'LACS_T-800_Suite and Floor Plan.pdf')
  },

  // 9th Floor (No individual units on disk)
  // 9th Floor (No individual units on disk)
  't900': {
    floorFloorplan: towerPath('9th-floor', 'LACS_Floor 9_M1_Color.pdf'),
    combinedFloorplan: towerPath('9th-floor', 'LACS_T-900_Suite and Floor Plan.pdf')
  },
  't950': {
    floorFloorplan: towerPath('9th-floor', 'LACS_Floor 9_M1_Color.pdf'),
    combinedFloorplan: towerPath('9th-floor', 'LACS_T-950_Suite and Floor Plan.pdf')
  },

  // 10th Floor
  // 10th Floor
  't1000': {
    floorFloorplan: towerPath('10th-floor', 'LACS_Floor 10_M1_Color.pdf'),
    combinedFloorplan: towerPath('10th-floor', 'LACS_T-1000_Suite and Floor Plan.pdf')
  },

  // 11th Floor
  // 11th Floor
  't1100': {
    floorFloorplan: towerPath('11th-floor', 'LACS_Floor 11_M1_Color.pdf'),
    combinedFloorplan: towerPath('11th-floor', 'LACS_T-1100_Suite and Floor Plan.pdf')
  },

  // 12th Floor
  // 12th Floor
  't1200': {
    floorFloorplan: towerPath('12th-floor', 'LACS_Floor 12_M1_Color.pdf'),
    combinedFloorplan: towerPath('12th-floor', 'LACS_T-1200_Suite and Floor Plan.pdf')
  }
};

// Maryland Building unit to floor mapping
export const MARYLAND_UNIT_FLOOR_MAPPINGS: { [key: string]: { floorFloorplan: string; individualFloorplan?: string } } = {
  // Ground Floor - all units use single floorplan (MG Floorplan.pdf)
  'm20': { floorFloorplan: marylandPath('ground-floor', 'MG Floorplan.pdf') },
  'm40': { floorFloorplan: marylandPath('ground-floor', 'MG Floorplan.pdf') },
  'm45': { floorFloorplan: marylandPath('ground-floor', 'MG Floorplan.pdf') },
  'm50': { floorFloorplan: marylandPath('ground-floor', 'MG Floorplan.pdf') },
  'etlab': { floorFloorplan: marylandPath('ground-floor', 'MG Floorplan.pdf') },
  'mgstage7': { floorFloorplan: marylandPath('ground-floor', 'MG Floorplan.pdf') },
  'studioom': { floorFloorplan: marylandPath('ground-floor', 'MG Floorplan.pdf') },

  // First Floor (M1xx) -> maryland/1st-floor/M1xx_LACS.pdf
  'm120': { floorFloorplan: marylandPath('1st-floor', 'M1Floor_LACS.pdf'), individualFloorplan: marylandPath('1st-floor', 'M120_LACS.pdf') },
  'm130': { floorFloorplan: marylandPath('1st-floor', 'M1Floor_LACS.pdf'), individualFloorplan: marylandPath('1st-floor', 'M130_LACS.pdf') },
  'm140': { floorFloorplan: marylandPath('1st-floor', 'M1Floor_LACS.pdf'), individualFloorplan: marylandPath('1st-floor', 'M140_LACS.pdf') },
  'm145': { floorFloorplan: marylandPath('1st-floor', 'M1Floor_LACS.pdf'), individualFloorplan: marylandPath('1st-floor', 'M145_LACS.pdf') },
  'm150': { floorFloorplan: marylandPath('1st-floor', 'M1Floor_LACS.pdf'), individualFloorplan: marylandPath('1st-floor', 'M150_LACS.pdf') },
  'm160': { floorFloorplan: marylandPath('1st-floor', 'M1Floor_LACS.pdf'), individualFloorplan: marylandPath('1st-floor', 'M160_LACS.pdf') },
  'm170': { floorFloorplan: marylandPath('1st-floor', 'M1Floor_LACS.pdf'), individualFloorplan: marylandPath('1st-floor', 'M170_LACS.pdf') },
  'm180': { floorFloorplan: marylandPath('1st-floor', 'M1Floor_LACS.pdf'), individualFloorplan: marylandPath('1st-floor', 'M180_LACS.pdf') },

  // Second Floor (M2xx) -> maryland/2nd-floor/M2xx_LACS.pdf
  'm210': { floorFloorplan: marylandPath('2nd-floor', 'M2Floor_LACS.pdf'), individualFloorplan: marylandPath('2nd-floor', 'M210_LACS.pdf') },
  'm220': { floorFloorplan: marylandPath('2nd-floor', 'M2Floor_LACS.pdf'), individualFloorplan: marylandPath('2nd-floor', 'M220_LACS.pdf') },
  'm230': { floorFloorplan: marylandPath('2nd-floor', 'M2Floor_LACS.pdf'), individualFloorplan: marylandPath('2nd-floor', 'M230_LACS.pdf') },
  'm240': { floorFloorplan: marylandPath('2nd-floor', 'M2Floor_LACS.pdf'), individualFloorplan: marylandPath('2nd-floor', 'M240_LACS.pdf') },
  'm250': { floorFloorplan: marylandPath('2nd-floor', 'M2Floor_LACS.pdf'), individualFloorplan: marylandPath('2nd-floor', 'M250_LACS.pdf') },
  'm260': { floorFloorplan: marylandPath('2nd-floor', 'M2Floor_LACS.pdf'), individualFloorplan: marylandPath('2nd-floor', 'M260_LACS.pdf') },
  'm270': { floorFloorplan: marylandPath('2nd-floor', 'M2Floor_LACS.pdf'), individualFloorplan: marylandPath('2nd-floor', 'M270_LACS.pdf') },

  // Third Floor (M3xx) -> maryland/3rd-floor/M3xx_LACS.pdf
  'm300': { floorFloorplan: marylandPath('3rd-floor', 'M3Floor_LACS.pdf'), individualFloorplan: marylandPath('3rd-floor', 'M300_LACS.pdf') },
  'm320': { floorFloorplan: marylandPath('3rd-floor', 'M3Floor_LACS.pdf'), individualFloorplan: marylandPath('3rd-floor', 'M320_LACS.pdf') },
  'm340': { floorFloorplan: marylandPath('3rd-floor', 'M3Floor_LACS.pdf'), individualFloorplan: marylandPath('3rd-floor', 'M340_LACS.pdf') },
  'm345': { floorFloorplan: marylandPath('3rd-floor', 'M3Floor_LACS.pdf'), individualFloorplan: marylandPath('3rd-floor', 'M345_LACS.pdf') },
  'm350': { floorFloorplan: marylandPath('3rd-floor', 'M3Floor_LACS.pdf'), individualFloorplan: marylandPath('3rd-floor', 'M350_LACS.pdf') },

  // Mezzanine
  'mezz': { floorFloorplan: marylandPath('3rd-floor', 'M3Floor_LACS.pdf') }
};

// Fifth Street Building unit to floor mapping
export const FIFTH_STREET_UNIT_FLOOR_MAPPINGS: { [key: string]: { floorFloorplan: string; individualFloorplan?: string; combinedFloorplan?: string } } = {
  // Ground Floor -> LACS_FG Floor Plan_M1_Color_Compressed.pdf
  // Ground Floor -> LACS_F-XX_Suite and Floor Plan.pdf
  'f10': {
    floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('ground-floor', 'LACS_F-10_Suite and Floor Plan.pdf')
  },
  'f15': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },
  'f20': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },
  'f25': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },
  'f30': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },
  'f35': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },
  'f40': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },
  'f50': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },
  'f60': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },
  'f70': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },
  'club76': { floorFloorplan: fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf') },

  // First Floor (F1xx) -> F[num]_LACS.pdf
  'f100': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F100_LACS.pdf') },
  'f105': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F105_LACS.pdf') },
  'f115': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F115_LACS.pdf') },
  'f140': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F140_LACS.pdf') },
  'f150': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F150_LACS.pdf') },
  'f160': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F160_LACS.pdf') },
  'f170': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F170_LACS.pdf') },
  'f175': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F175_LACS.pdf') },
  'f180': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F180_LACS.pdf') },
  'f185': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F185_LACS.pdf') },
  'f187': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F187_LACS.pdf') },
  'f190': { floorFloorplan: fifthStreetPath('1st-floor', 'LACS_F1 Floor Plan_M1_Color_Compressed.pdf'), individualFloorplan: fifthStreetPath('1st-floor', 'F190_LACS.pdf') },

  // Second Floor (F2xx) -> LACS_F-[num]_M1_Color_Compressed.pdf (NOTE THE DASH)
  // Second Floor (F2xx)
  'f200': {
    floorFloorplan: fifthStreetPath('2nd-floor', 'LACS_F2 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('2nd-floor', 'LACS_F-200_Suite and Floor Plan.pdf')
  },
  'f240': {
    floorFloorplan: fifthStreetPath('2nd-floor', 'LACS_F2 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('2nd-floor', 'LACS_F-240_Suite and Floor Plan.pdf')
  },
  'f250': {
    floorFloorplan: fifthStreetPath('2nd-floor', 'LACS_F2 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('2nd-floor', 'LACS_F-250_Suite and Floor Plan.pdf')
  },
  'f280': {
    floorFloorplan: fifthStreetPath('2nd-floor', 'LACS_F2 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('2nd-floor', 'LACS_F-280_Suite and Floor Plan.pdf')
  },
  'f290': {
    floorFloorplan: fifthStreetPath('2nd-floor', 'LACS_F2 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('2nd-floor', 'LACS_F-290_Suite and Floor Plan.pdf')
  },

  // Third Floor (F3xx) -> F[num]_LACS.pdf
  // Third Floor (F3xx)
  'f300': {
    floorFloorplan: fifthStreetPath('3rd-floor', 'LACS_F3 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('3rd-floor', 'LACS_F-300_Suite and Floor Plan.pdf')
  },
  'f330': {
    floorFloorplan: fifthStreetPath('3rd-floor', 'LACS_F3 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('3rd-floor', 'LACS_F-330_Suite and Floor Plan.pdf')
  },
  'f340': {
    floorFloorplan: fifthStreetPath('3rd-floor', 'LACS_F3 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('3rd-floor', 'LACS_F-340_Suite and Floor Plan.pdf')
  },
  'f345': {
    floorFloorplan: fifthStreetPath('3rd-floor', 'LACS_F3 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('3rd-floor', 'LACS_F-345_Suite and Floor Plan.pdf')
  },
  'f350': {
    floorFloorplan: fifthStreetPath('3rd-floor', 'LACS_F3 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('3rd-floor', 'LACS_F-350_Suite and Floor Plan.pdf')
  },
  'f360': {
    floorFloorplan: fifthStreetPath('3rd-floor', 'LACS_F3 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('3rd-floor', 'LACS_F-360_Suite and Floor Plan.pdf')
  },
  'f363': {
    floorFloorplan: fifthStreetPath('3rd-floor', 'LACS_F3 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('3rd-floor', 'LACS_F-363_Suite and Floor Plan.pdf')
  },
  'f365': {
    floorFloorplan: fifthStreetPath('3rd-floor', 'LACS_F3 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('3rd-floor', 'LACS_F-365_Suite and Floor Plan.pdf')
  },
  'f380': {
    floorFloorplan: fifthStreetPath('3rd-floor', 'LACS_F3 Floor Plan_M1_Color_Compressed.pdf'),
    combinedFloorplan: fifthStreetPath('3rd-floor', 'LACS_F-380_Suite and Floor Plan.pdf')
  }
};

// Clean unit name for matching
function cleanUnitName(unitName: string): string {
  if (!unitName) return '';
  return unitName.toLowerCase().replace(/[\s\-_\.]+/g, '').replace(/[^a-z0-9]/g, '');
}

// Special case mappings
const SPECIAL_MAPPINGS: { [key: string]: string } = {
  // Maryland Ground
  'm20': marylandPath('ground-floor', 'MG_Full_LACS.pdf'), // Assumed
  'm40': marylandPath('ground-floor', 'MG_Full_LACS.pdf'),
  'm45': marylandPath('ground-floor', 'MG_Full_LACS.pdf'),
  // Fifth Ground -> FG (which we know is LACS_FG...)
  'fglibrary': fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf'),
  'fgrestroom': fifthStreetPath('ground-floor', 'LACS_FG Floor Plan_M1_Color_Compressed.pdf'),
};

// Helpers
export function isFifthStreetGroundFloorUnit(unitName: string): boolean {
  if (!unitName) return false;
  const cleanName = cleanUnitName(unitName);
  const groundFloorUnits = ['f10', 'f15', 'f20', 'f25', 'f30', 'f35', 'f40', 'f50', 'f60', 'f70', 'club76', 'fglibrary', 'fgrestroom'];
  return groundFloorUnits.includes(cleanName) || cleanName.includes('club76');
}

export function isTowerUnit(unitName: string): boolean {
  if (!unitName) return false;
  return TOWER_UNIT_FLOOR_MAPPINGS.hasOwnProperty(cleanUnitName(unitName));
}

export function isMarylandUnit(unitName: string): boolean {
  if (!unitName) return false;
  return MARYLAND_UNIT_FLOOR_MAPPINGS.hasOwnProperty(cleanUnitName(unitName));
}

export function isFifthStreetUnit(unitName: string): boolean {
  if (!unitName) return false;
  return FIFTH_STREET_UNIT_FLOOR_MAPPINGS.hasOwnProperty(cleanUnitName(unitName));
}

export function isStageOrProductionUnit(unitName: string): boolean {
  if (!unitName) return false;
  const cleanName = cleanUnitName(unitName).toLowerCase();
  const stagePatterns = [/^stage\s*[1-8a-f]?$/i, /^stage[1-8a-f]$/i, /^s[1-8a-f]$/i];
  const productionPatterns = [/production/i, /prod/i, /office/i];
  return stagePatterns.some(pattern => pattern.test(cleanName)) || productionPatterns.some(pattern => pattern.test(cleanName));
}

// Accessors (Exported for UI to use directly)
export function getTowerUnitFloorFloorplan(unitName: string): string | null {
  const m = TOWER_UNIT_FLOOR_MAPPINGS[cleanUnitName(unitName)];
  return m ? m.floorFloorplan : null;
}
export function getTowerUnitIndividualFloorplan(unitName: string): string | null {
  const m = TOWER_UNIT_FLOOR_MAPPINGS[cleanUnitName(unitName)];
  return m ? m.individualFloorplan || null : null;
}
export function getTowerUnitCombinedFloorplan(unitName: string): string | null {
  const m = TOWER_UNIT_FLOOR_MAPPINGS[cleanUnitName(unitName)];
  return m ? m.combinedFloorplan || null : null;
}
export function getMarylandUnitFloorFloorplan(unitName: string): string | null {
  const m = MARYLAND_UNIT_FLOOR_MAPPINGS[cleanUnitName(unitName)];
  return m ? m.floorFloorplan : null;
}
export function getMarylandUnitIndividualFloorplan(unitName: string): string | null {
  const m = MARYLAND_UNIT_FLOOR_MAPPINGS[cleanUnitName(unitName)];
  return m ? m.individualFloorplan || null : null;
}
export function getFifthStreetUnitFloorFloorplan(unitName: string): string | null {
  const m = FIFTH_STREET_UNIT_FLOOR_MAPPINGS[cleanUnitName(unitName)];
  return m ? m.floorFloorplan : null;
}
export function getFifthStreetUnitIndividualFloorplan(unitName: string): string | null {
  const m = FIFTH_STREET_UNIT_FLOOR_MAPPINGS[cleanUnitName(unitName)];
  return m ? m.individualFloorplan || null : null;
}
export function getFifthStreetUnitCombinedFloorplan(unitName: string): string | null {
  const m = FIFTH_STREET_UNIT_FLOOR_MAPPINGS[cleanUnitName(unitName)];
  return m ? m.combinedFloorplan || null : null;
}


// MAIN LOOKUP FUNCTION
export function getFloorplanUrl(unitName: string, unitData?: any): string | null {
  if (!unitName) return null;
  const cleanName = cleanUnitName(unitName);

  // Dev logging for M-20 fallback verification
  if (cleanName === 'm20') {
    console.log('M-20 floorplan lookup: using Maryland Ground Floor fallback');
  }

  // 1. Check Specific Mappings (Highest Priority)

  if (isTowerUnit(unitName)) {
    const map = TOWER_UNIT_FLOOR_MAPPINGS[cleanName];
    // Prioritize individual if exists, else floor
    return map.individualFloorplan || map.floorFloorplan;
  }

  if (isMarylandUnit(unitName)) {
    const map = MARYLAND_UNIT_FLOOR_MAPPINGS[cleanName];
    return map.individualFloorplan || map.floorFloorplan;
  }

  if (isFifthStreetUnit(unitName)) {
    const map = FIFTH_STREET_UNIT_FLOOR_MAPPINGS[cleanName];
    return map.individualFloorplan || map.floorFloorplan;
  }

  // 2. Special cases
  if (SPECIAL_MAPPINGS[cleanName]) {
    return SPECIAL_MAPPINGS[cleanName];
  }

  // 3. Fallback: Site Map for stages/production
  if (isStageOrProductionUnit(unitName)) {
    // We might not have a PDF for Site Map yet? 
    // If kept as PNG, it needs to look in converted. 
    // Assuming for now we stick to PDF logic or return the old PNG path.
    // Let's check if the user uploaded a Site Map PDF. If not, use generic path.
    return `floorplans/converted/LACS_Site Map_M1_Color_page_1.png`;
  }

  // 4. Fallback from CSV? 
  // If user provided a URL in CSV, we should probably pass it through, 
  // BUT we want to force PDF usage if we know the unit. 
  // If we missed the unit in our hardcoded lists, we fall back to CSV.
  if (unitData?.floorplan_url) {
    // If it's a PDF URL, cool. If it implies a PNG, maybe we rely on it.
    return unitData.floorplan_url;
  }

  return null;
}
