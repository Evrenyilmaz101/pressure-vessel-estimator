import type { WeldProcess } from '../../shared/types';

/**
 * Circ Weld (Circumferential Seam) Types
 * 
 * Circ welds are the girth seams that join shell courses together.
 * The weld length is calculated from the shell inside diameter (circumference = π × ID).
 */

export interface CircWeldGeometry {
  // Shell dimensions
  shellThickness: number;      // mm - plate thickness
  insideDiameter: number;      // mm - inside diameter of shell
  
  // Bevel configuration
  jointType: 'singlevee' | 'doublevee';
  insideBevelAngle: number;    // degrees
  outsideBevelAngle: number;   // degrees (for double-sided joints)
  rootGap: number;             // mm
  rootFace: number;            // mm (land)
  
  // For double-sided joints
  splitRatio: number;          // % - how much is welded from inside vs outside
}

export interface CircWeldItem {
  id: string;
  tag: string;                 // e.g., "S1-S2 Circ", "Course 1-2"
  quantity: number;            // Number of identical welds
  
  geometry: CircWeldGeometry;
  
  // Process strategy
  insideLayers: ProcessLayer[];
  outsideProcess: Exclude<WeldProcess, 'Skip'>;
  
  // Activity times (hours)
  activityTimes: CircWeldActivityTimes;
  
  // Calculated results
  results?: CircWeldResults;
  activityCodes?: CircWeldActivityCodes;
}

export interface ProcessLayer {
  process: Exclude<WeldProcess, 'Skip'>;
  minWidth: number;  // mm - groove width threshold to switch process
}

export interface CircWeldActivityTimes {
  moveToAssembly: number;  // Move shells to assembly station - CRANE
  fitUp: number;           // Fit circ weld - FCIRC
  preheat1stSide: number;  // Pre-heat 1st side - PREHEAT
  weld1stSide: number;     // Weld 1st side - WECIRC (calculated)
  backMill: number;        // Back mill - BACMIL
  preheat2ndSide: number;  // Pre-heat 2nd side - PREHEAT
  weld2ndSide: number;     // Weld 2nd side - SUBCIRC or MANCIR (calculated)
  nde: number;             // NDE inspection - NDE
}

export interface CircWeldResults {
  // Calculated values
  circumference: number;     // mm - π × ID
  
  // Volumes
  insideVolume: number;    // mm³
  outsideVolume: number;   // mm³
  totalVolume: number;     // mm³
  
  // Passes
  insidePasses: number;
  outsidePasses: number;
  totalPasses: number;
  
  // Times (hours)
  times: {
    insideArcTime: number;
    outsideArcTime: number;
    insideTotalTime: number;  // With operator factor
    outsideTotalTime: number;
    totalWeldTime: number;
  };
}

export interface CircWeldActivityCodes {
  CRANE: number;      // Move shells to assembly station
  FCIRC: number;      // Fit circ weld
  PREHEAT: number;    // Preheat
  WECIRC: number;     // Weld 1st side
  BACMIL: number;     // Back mill
  SUBCIRC: number;    // Weld 2nd side - Sub Arc (thick material)
  MANCIR: number;     // Weld 2nd side - Manual (thin material)
  NDE: number;        // NDE inspection
}

// Module data stored in project
export interface CircWeldsModuleData {
  welds: CircWeldItem[];
}

// Default values
export const DEFAULT_CIRC_WELD_GEOMETRY: CircWeldGeometry = {
  shellThickness: 20,
  insideDiameter: 3000,
  jointType: 'doublevee',
  insideBevelAngle: 30,
  outsideBevelAngle: 30,
  rootGap: 3,
  rootFace: 2,
  splitRatio: 60,
};

export const DEFAULT_CIRC_WELD_ACTIVITY_TIMES: CircWeldActivityTimes = {
  moveToAssembly: 0.5, // Move shells to assembly station
  fitUp: 1.0,          // Fit circ weld
  preheat1stSide: 0.5, // Pre-heat 1st side
  weld1stSide: 0,      // Calculated
  backMill: 0.75,      // Back mill
  preheat2ndSide: 0.25,// Pre-heat 2nd side
  weld2ndSide: 0,      // Calculated
  nde: 0.5,            // NDE
};

export const DEFAULT_CIRC_WELD_LAYERS: ProcessLayer[] = [
  { process: 'GTAW', minWidth: 0 },
  { process: 'SMAW', minWidth: 8 },
  { process: 'SAW', minWidth: 15 },
];

