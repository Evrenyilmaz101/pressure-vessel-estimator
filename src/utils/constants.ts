import type {
  BeadSizes,
  TravelSpeedsByThickness,
  OperatorFactorsByThickness,
  ZoneDistribution,
  GeometryInput,
  ProcessStrategy,
  ProcessLayer,
  ActivityTimes,
} from '../types/weld.types';

/**
 * Default bead sizes for each welding process (mm)
 */
export const DEFAULT_BEAD_SIZES: BeadSizes = {
  GTAW: { h: 1.0, w: 4.0 },
  SMAW: { h: 2.0, w: 5.0 },
  FCAW: { h: 2.5, w: 6.0 },
  GMAW: { h: 2.5, w: 6.0 },
  SAW: { h: 4.0, w: 10.0 },
};

/**
 * Default travel speeds by thickness range (mm/min)
 */
export const DEFAULT_TRAVEL_SPEEDS: TravelSpeedsByThickness = {
  thin: { GTAW: 60, SMAW: 120, FCAW: 180, GMAW: 200, SAW: 300 },
  medium: { GTAW: 70, SMAW: 140, FCAW: 220, GMAW: 240, SAW: 350 },
  thick: { GTAW: 80, SMAW: 150, FCAW: 250, GMAW: 280, SAW: 400 },
};

/**
 * Default operator factors by thickness range
 */
export const DEFAULT_OPERATOR_FACTORS: OperatorFactorsByThickness = {
  range1: { inside: 5.0, outside: 3.5 }, // < 12mm
  range2: { inside: 4.5, outside: 3.0 }, // 12-18mm
  range3: { inside: 3.5, outside: 2.5 }, // 18-25mm
  range4: { inside: 2.5, outside: 2.0 }, // 25-35mm
  range5: { inside: 2.0, outside: 1.7 }, // 35-50mm
  range6: { inside: 1.8, outside: 1.5 }, // > 50mm
};

/**
 * Default zone distribution percentages
 * Note: Cap pass removed - fillet weld replaces capping on nozzles
 */
export const DEFAULT_ZONE_DISTRIBUTION: ZoneDistribution = {
  zone1Pct: 30, // Root pass
  zone2Pct: 70, // Fill passes
  zone3Pct: 0,  // Cap pass (not used for nozzles)
};

/**
 * Default geometry input values
 */
export const DEFAULT_GEOMETRY: GeometryInput = {
  nozzleOD: 500,
  shellThick: 50,
  jointType: 'doublebevel',
  rootGap: 5,
  rootFace: 3,
  filletThroat: 6,
  insideBevelAngle: 45,
  outsideBevelAngle: 45,
  splitRatio: 70,
  singleBevelAngle: 30,
};

/**
 * Default process strategy
 */
export const DEFAULT_PROCESS_STRATEGY: ProcessStrategy = {
  proc1: 'GTAW',
  proc2: 'SMAW',
  proc3: 'FCAW',
  procFillet: 'FCAW',
};

/**
 * Default process layers for inside weld (width-based)
 * Each layer specifies the groove width at which you switch TO that process
 * Example: GTAW starts at root, switch to SMAW at 6mm, switch to FCAW at 20mm
 */
export const DEFAULT_PROCESS_LAYERS: ProcessLayer[] = [
  { process: 'GTAW', minWidth: 0 },    // Start with GTAW at root (0mm)
  { process: 'SMAW', minWidth: 6 },    // Switch to SMAW when groove is 6mm wide
  { process: 'FCAW', minWidth: 20 },   // Switch to FCAW when groove is 20mm wide
];

/**
 * Default activity times (in hours)
 * Welding times (weld1stSide, weld2ndSide, filletWeld) are calculated, not manual
 */
export const DEFAULT_ACTIVITY_TIMES: ActivityTimes = {
  markPosition: 0.25,      // 15 min
  cutAndBevel: 1.0,        // 1 hour
  grindBevelClean: 0.5,    // 30 min
  fitNozzle: 1.0,          // 1 hour
  preheat1: 0.5,           // 30 min
  weld1stSide: 0,          // Calculated
  grind1stSide: 0.5,       // 30 min
  backGouge: 0.5,          // 30 min
  preheat2: 0.25,          // 15 min
  weld2ndSide: 0,          // Calculated
  grind2ndSide: 0.5,       // 30 min
  filletWeld: 0,           // Calculated
  nde: 1.0,                // 1 hour
};

