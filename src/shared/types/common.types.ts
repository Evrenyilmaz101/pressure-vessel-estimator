/**
 * Common types shared across all modules
 */

// Welding processes
export type WeldProcess = 'GTAW' | 'SMAW' | 'FCAW' | 'GMAW' | 'SAW' | 'Skip';

// Joint types
export type JointType = 'singlebevel' | 'doublebevel';

// Bead dimensions
export interface BeadSize {
  h: number; // height in mm
  w: number; // width in mm
}

export interface BeadSizes {
  GTAW: BeadSize;
  SMAW: BeadSize;
  FCAW: BeadSize;
  GMAW: BeadSize;
  SAW: BeadSize;
}

// Travel speeds by thickness range
export interface TravelSpeeds {
  GTAW: number;
  SMAW: number;
  FCAW: number;
  GMAW: number;
  SAW: number;
}

export interface TravelSpeedsByThickness {
  thin: TravelSpeeds;   // < 20mm
  medium: TravelSpeeds; // 20-40mm
  thick: TravelSpeeds;  // > 40mm
}

// Operator factors
export interface OperatorFactors {
  inside: number;
  outside: number;
}

export interface OperatorFactorsByThickness {
  range1: OperatorFactors; // < 12mm
  range2: OperatorFactors; // 12-18mm
  range3: OperatorFactors; // 18-25mm
  range4: OperatorFactors; // 25-35mm
  range5: OperatorFactors; // 35-50mm
  range6: OperatorFactors; // > 50mm
}

// Activity codes - used across all modules
export type ActivityCode = 
  | 'CUTNOZZ' | 'FNOZZ' | 'WNOZZ'           // Nozzle specific
  | 'WLONG' | 'FLONG'                        // Long weld specific
  | 'WCIRC' | 'FCIRC'                        // Circ weld specific
  | 'WINT' | 'FINT'                          // Internals
  | 'WEXT' | 'FEXT'                          // Externals
  | 'PREHEAT' | 'BACGRI' | 'MATCUT' | 'NDE'; // Shared

// Module summary for roll-up
export interface ModuleSummary {
  moduleId: string;
  moduleName: string;
  itemCount: number;
  totalHours: number;
  activityBreakdown: Record<string, number>;
}

// Shared settings
export interface SharedSettings {
  beadSizes: BeadSizes;
  travelSpeeds: TravelSpeedsByThickness;
  operatorFactors: OperatorFactorsByThickness;
}



