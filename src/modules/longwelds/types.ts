import type { WeldProcess } from '../../shared/types';

/**
 * Long Weld (Longitudinal Seam) Types
 * 
 * Long welds are the longitudinal seams that run along the length of shell courses.
 * They join the rolled plate edges to form a cylinder.
 */

export interface LongWeldGeometry {
  // Shell dimensions
  shellThickness: number;      // mm - plate thickness
  weldLength: number;          // mm - length of the weld seam
  
  // Bevel configuration
  jointType: 'singlevee' | 'doublevee';
  insideBevelAngle: number;    // degrees
  outsideBevelAngle: number;   // degrees (for double-sided joints)
  rootGap: number;             // mm
  rootFace: number;            // mm (land)
  
  // For double-sided joints
  splitRatio: number;          // % - how much is welded from inside vs outside
}

export interface LongWeldItem {
  id: string;
  tag: string;                 // e.g., "Shell 1 Long", "S1-LS"
  quantity: number;            // Number of identical welds
  
  geometry: LongWeldGeometry;
  
  // Process strategy - similar to nozzles but for seam welds
  insideLayers: ProcessLayer[];
  outsideProcess: Exclude<WeldProcess, 'Skip'>;
  
  // Activity times (hours)
  activityTimes: LongWeldActivityTimes;
  
  // Calculated results
  results?: LongWeldResults;
  activityCodes?: LongWeldActivityCodes;
}

export interface ProcessLayer {
  process: Exclude<WeldProcess, 'Skip'>;
  minWidth: number;  // mm - groove width threshold to switch process
}

export interface LongWeldActivityTimes {
  cutPlate: number;        // Cut plate - MATCUT
  cleanPlate: number;      // Clean plate for rolling - MATCUT
  moveToRoll: number;      // Move to roll - CRANE
  roll: number;            // Roll plate - ROLL
  fitUp: number;           // Fit the long weld - FLON
  moveToWeld1: number;     // Move to welding station - CRANE
  preheat1stSide: number;  // Pre-heat 1st side - PREHEAT
  weld1stSide: number;     // Weld 1st side - WELON (calculated)
  moveToMill: number;      // Move to mill - CRANE
  backMill: number;        // Back mill - BACMIL
  moveToWeld2: number;     // Move to welding station - CRANE
  preheat2ndSide: number;  // Pre-heat 2nd side - PREHEAT
  weld2ndSide: number;     // Weld 2nd side - SUBLON or MANLON (calculated)
  moveToReRoll: number;    // Move to roll - CRANE
  reRoll: number;          // Re-roll - ROLL
  nde: number;             // NDE inspection - NDE
}

export interface LongWeldResults {
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

export interface LongWeldActivityCodes {
  MATCUT: number;     // Cut plate + clean plate for rolling
  CRANE: number;      // All crane moves
  ROLL: number;       // Roll + re-roll
  FLON: number;       // Fit the long weld
  PREHEAT: number;    // Pre-heat 1st side + 2nd side
  WELON: number;      // Weld 1st side
  BACMIL: number;     // Back mill
  SUBLON: number;     // Weld 2nd side - Sub Arc (thick material)
  MANLON: number;     // Weld 2nd side - Manual (thin material)
  NDE: number;        // NDE inspection
}

// Module data stored in project
export interface LongWeldsModuleData {
  welds: LongWeldItem[];
}

// Default values
export const DEFAULT_LONG_WELD_GEOMETRY: LongWeldGeometry = {
  shellThickness: 20,
  weldLength: 2000,
  jointType: 'doublevee',
  insideBevelAngle: 30,
  outsideBevelAngle: 30,
  rootGap: 3,
  rootFace: 2,
  splitRatio: 60,
};

export const DEFAULT_LONG_WELD_ACTIVITY_TIMES: LongWeldActivityTimes = {
  cutPlate: 0.5,       // Cut plate
  cleanPlate: 0.25,    // Clean plate for rolling
  moveToRoll: 0.25,    // Move to roll
  roll: 0.5,           // Roll plate
  fitUp: 0.5,          // Fit the long weld
  moveToWeld1: 0.25,   // Move to welding station
  preheat1stSide: 0.5, // Pre-heat 1st side
  weld1stSide: 0,      // Calculated
  moveToMill: 0.25,    // Move to mill
  backMill: 0.5,       // Back mill
  moveToWeld2: 0.25,   // Move to welding station
  preheat2ndSide: 0.25,// Pre-heat 2nd side
  weld2ndSide: 0,      // Calculated
  moveToReRoll: 0.25,  // Move to roll
  reRoll: 0.25,        // Re-roll
  nde: 0.5,            // NDE
};

export const DEFAULT_LONG_WELD_LAYERS: ProcessLayer[] = [
  { process: 'GTAW', minWidth: 0 },
  { process: 'SMAW', minWidth: 8 },
  { process: 'SAW', minWidth: 15 },
];

