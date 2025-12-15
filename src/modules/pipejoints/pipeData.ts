/**
 * Standard Pipe Data Library
 * 
 * ANSI/ASME B36.10M - Welded and Seamless Wrought Steel Pipe
 * ANSI/ASME B36.19M - Stainless Steel Pipe
 * 
 * All dimensions in mm
 */

export interface PipeSize {
  nps: string;           // Nominal Pipe Size (e.g., "1/2", "1", "2", "24")
  od: number;            // Outside Diameter in mm
  schedules: {
    [schedule: string]: number;  // Wall thickness in mm
  };
}

// Standard pipe sizes with OD and wall thicknesses by schedule
// SCH 5 removed - not commonly used
export const PIPE_DATA: PipeSize[] = [
  {
    nps: '1/2"',
    od: 21.3,
    schedules: {
      'SCH 10': 2.11,
      'SCH 40': 2.77,
      'SCH 80': 3.73,
      'SCH 160': 4.78,
      'XXS': 7.47,
    }
  },
  {
    nps: '3/4"',
    od: 26.7,
    schedules: {
      'SCH 10': 2.11,
      'SCH 40': 2.87,
      'SCH 80': 3.91,
      'SCH 160': 5.56,
      'XXS': 7.82,
    }
  },
  {
    nps: '1"',
    od: 33.4,
    schedules: {
      'SCH 10': 2.77,
      'SCH 40': 3.38,
      'SCH 80': 4.55,
      'SCH 160': 6.35,
      'XXS': 9.09,
    }
  },
  {
    nps: '1-1/4"',
    od: 42.2,
    schedules: {
      'SCH 10': 2.77,
      'SCH 40': 3.56,
      'SCH 80': 4.85,
      'SCH 160': 6.35,
      'XXS': 9.70,
    }
  },
  {
    nps: '1-1/2"',
    od: 48.3,
    schedules: {
      'SCH 10': 2.77,
      'SCH 40': 3.68,
      'SCH 80': 5.08,
      'SCH 160': 7.14,
      'XXS': 10.15,
    }
  },
  {
    nps: '2"',
    od: 60.3,
    schedules: {
      'SCH 10': 2.77,
      'SCH 40': 3.91,
      'SCH 80': 5.54,
      'SCH 160': 8.74,
      'XXS': 11.07,
    }
  },
  {
    nps: '2-1/2"',
    od: 73.0,
    schedules: {
      'SCH 10': 3.05,
      'SCH 40': 5.16,
      'SCH 80': 7.01,
      'SCH 160': 9.53,
      'XXS': 14.02,
    }
  },
  {
    nps: '3"',
    od: 88.9,
    schedules: {
      'SCH 10': 3.05,
      'SCH 40': 5.49,
      'SCH 80': 7.62,
      'SCH 160': 11.13,
      'XXS': 15.24,
    }
  },
  {
    nps: '3-1/2"',
    od: 101.6,
    schedules: {
      'SCH 10': 3.05,
      'SCH 40': 5.74,
      'SCH 80': 8.08,
    }
  },
  {
    nps: '4"',
    od: 114.3,
    schedules: {
      'SCH 10': 3.05,
      'SCH 40': 6.02,
      'SCH 80': 8.56,
      'SCH 120': 11.13,
      'SCH 160': 13.49,
      'XXS': 17.12,
    }
  },
  {
    nps: '5"',
    od: 141.3,
    schedules: {
      'SCH 10': 3.40,
      'SCH 40': 6.55,
      'SCH 80': 9.53,
      'SCH 120': 12.70,
      'SCH 160': 15.88,
      'XXS': 19.05,
    }
  },
  {
    nps: '6"',
    od: 168.3,
    schedules: {
      'SCH 10': 3.40,
      'SCH 40': 7.11,
      'SCH 80': 10.97,
      'SCH 120': 14.27,
      'SCH 160': 18.26,
      'XXS': 21.95,
    }
  },
  {
    nps: '8"',
    od: 219.1,
    schedules: {
      'SCH 10': 3.76,
      'SCH 20': 6.35,
      'SCH 30': 7.04,
      'SCH 40': 8.18,
      'SCH 60': 10.31,
      'SCH 80': 12.70,
      'SCH 100': 15.09,
      'SCH 120': 18.26,
      'SCH 140': 20.62,
      'SCH 160': 23.01,
      'XXS': 22.23,
    }
  },
  {
    nps: '10"',
    od: 273.1,
    schedules: {
      'SCH 10': 4.19,
      'SCH 20': 6.35,
      'SCH 30': 7.80,
      'SCH 40': 9.27,
      'SCH 60': 12.70,
      'SCH 80': 15.09,
      'SCH 100': 18.26,
      'SCH 120': 21.44,
      'SCH 140': 25.40,
      'SCH 160': 28.58,
    }
  },
  {
    nps: '12"',
    od: 323.9,
    schedules: {
      'SCH 10': 4.57,
      'SCH 20': 6.35,
      'SCH 30': 8.38,
      'SCH 40': 10.31,
      'SCH 60': 14.27,
      'SCH 80': 17.48,
      'SCH 100': 21.44,
      'SCH 120': 25.40,
      'SCH 140': 28.58,
      'SCH 160': 33.32,
    }
  },
  {
    nps: '14"',
    od: 355.6,
    schedules: {
      'SCH 10': 6.35,
      'SCH 20': 7.92,
      'SCH 30': 9.53,
      'SCH 40': 11.13,
      'SCH 60': 15.09,
      'SCH 80': 19.05,
      'SCH 100': 23.83,
      'SCH 120': 27.79,
      'SCH 140': 31.75,
      'SCH 160': 35.71,
    }
  },
  {
    nps: '16"',
    od: 406.4,
    schedules: {
      'SCH 10': 6.35,
      'SCH 20': 7.92,
      'SCH 30': 9.53,
      'SCH 40': 12.70,
      'SCH 60': 16.66,
      'SCH 80': 21.44,
      'SCH 100': 26.19,
      'SCH 120': 30.96,
      'SCH 140': 36.53,
      'SCH 160': 40.49,
    }
  },
  {
    nps: '18"',
    od: 457.2,
    schedules: {
      'SCH 10': 6.35,
      'SCH 20': 7.92,
      'SCH 30': 11.13,
      'SCH 40': 14.27,
      'SCH 60': 19.05,
      'SCH 80': 23.83,
      'SCH 100': 29.36,
      'SCH 120': 34.93,
      'SCH 140': 39.67,
      'SCH 160': 45.24,
    }
  },
  {
    nps: '20"',
    od: 508.0,
    schedules: {
      'SCH 10': 6.35,
      'SCH 20': 9.53,
      'SCH 30': 12.70,
      'SCH 40': 15.09,
      'SCH 60': 20.62,
      'SCH 80': 26.19,
      'SCH 100': 32.54,
      'SCH 120': 38.10,
      'SCH 140': 44.45,
      'SCH 160': 50.01,
    }
  },
  {
    nps: '22"',
    od: 558.8,
    schedules: {
      'SCH 10': 6.35,
      'SCH 20': 9.53,
      'SCH 30': 12.70,
      'SCH 60': 22.23,
      'SCH 80': 28.58,
      'SCH 100': 34.93,
      'SCH 120': 41.28,
      'SCH 140': 47.63,
      'SCH 160': 53.98,
    }
  },
  {
    nps: '24"',
    od: 609.6,
    schedules: {
      'SCH 10': 6.35,
      'SCH 20': 9.53,
      'SCH 30': 14.27,
      'SCH 40': 17.48,
      'SCH 60': 24.61,
      'SCH 80': 30.96,
      'SCH 100': 38.89,
      'SCH 120': 46.02,
      'SCH 140': 52.37,
      'SCH 160': 59.54,
    }
  },
  {
    nps: '26"',
    od: 660.4,
    schedules: {
      'SCH 10': 7.92,
      'SCH 20': 12.70,
      'STD': 9.53,
      'XS': 12.70,
    }
  },
  {
    nps: '28"',
    od: 711.2,
    schedules: {
      'SCH 10': 7.92,
      'SCH 20': 12.70,
      'SCH 30': 15.88,
      'STD': 9.53,
      'XS': 12.70,
    }
  },
  {
    nps: '30"',
    od: 762.0,
    schedules: {
      'SCH 10': 7.92,
      'SCH 20': 12.70,
      'SCH 30': 15.88,
      'STD': 9.53,
      'XS': 12.70,
    }
  },
  {
    nps: '32"',
    od: 812.8,
    schedules: {
      'SCH 10': 7.92,
      'SCH 20': 12.70,
      'SCH 30': 15.88,
      'SCH 40': 17.48,
      'STD': 9.53,
      'XS': 12.70,
    }
  },
  {
    nps: '34"',
    od: 863.6,
    schedules: {
      'SCH 10': 7.92,
      'SCH 20': 12.70,
      'SCH 30': 15.88,
      'SCH 40': 17.48,
      'STD': 9.53,
      'XS': 12.70,
    }
  },
  {
    nps: '36"',
    od: 914.4,
    schedules: {
      'SCH 10': 7.92,
      'SCH 20': 12.70,
      'SCH 30': 15.88,
      'SCH 40': 19.05,
      'STD': 9.53,
      'XS': 12.70,
    }
  },
  {
    nps: '42"',
    od: 1066.8,
    schedules: {
      'SCH 20': 12.70,
      'SCH 30': 15.88,
      'SCH 40': 21.44,
      'STD': 9.53,
      'XS': 12.70,
    }
  },
  {
    nps: '48"',
    od: 1219.2,
    schedules: {
      'SCH 20': 12.70,
      'SCH 30': 15.88,
      'SCH 40': 24.61,
      'STD': 9.53,
      'XS': 12.70,
    }
  },
];

/**
 * Get all available NPS sizes
 */
export function getAllNPSSizes(): string[] {
  return PIPE_DATA.map(p => p.nps);
}

/**
 * Get available schedules for a given NPS
 */
export function getSchedulesForNPS(nps: string): string[] {
  const pipe = PIPE_DATA.find(p => p.nps === nps);
  return pipe ? Object.keys(pipe.schedules) : [];
}

/**
 * Get pipe dimensions for a given NPS and schedule
 */
export function getPipeDimensions(nps: string, schedule: string): { od: number; wallThickness: number } | null {
  const pipe = PIPE_DATA.find(p => p.nps === nps);
  if (!pipe) return null;
  
  const wallThickness = pipe.schedules[schedule];
  if (wallThickness === undefined) return null;
  
  return { od: pipe.od, wallThickness };
}

/**
 * Generate a unique key for pipe size + schedule combo
 */
export function getPipeSizeKey(nps: string, schedule: string): string {
  return `${nps}|${schedule}`;
}

/**
 * Parse a pipe size key back to NPS and schedule
 */
export function parsePipeSizeKey(key: string): { nps: string; schedule: string } | null {
  const parts = key.split('|');
  if (parts.length !== 2) return null;
  return { nps: parts[0], schedule: parts[1] };
}
