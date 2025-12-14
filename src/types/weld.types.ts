/**
 * Welding process types used in pressure vessel fabrication
 */
export type WeldProcess = 'GTAW' | 'SMAW' | 'FCAW' | 'GMAW' | 'SAW' | 'Skip';

/**
 * Joint configuration types
 */
export type JointType = 'singlebevel' | 'doublebevel';

/**
 * Bead dimensions for a welding process
 */
export interface BeadSize {
  /** Bead height in mm */
  h: number;
  /** Bead width in mm */
  w: number;
}

/**
 * Bead sizes for all welding processes
 */
export interface BeadSizes {
  GTAW: BeadSize;
  SMAW: BeadSize;
  FCAW: BeadSize;
  GMAW: BeadSize;
  SAW: BeadSize;
}

/**
 * Travel speeds for each process (mm/min)
 */
export interface TravelSpeeds {
  GTAW: number;
  SMAW: number;
  FCAW: number;
  GMAW: number;
  SAW: number;
}

/**
 * Travel speeds by thickness range
 */
export interface TravelSpeedsByThickness {
  /** < 20mm thickness */
  thin: TravelSpeeds;
  /** 20-40mm thickness */
  medium: TravelSpeeds;
  /** > 40mm thickness */
  thick: TravelSpeeds;
}

/**
 * Operator factors (time multipliers)
 */
export interface OperatorFactors {
  inside: number;
  outside: number;
}

/**
 * Operator factors by thickness range
 */
export interface OperatorFactorsByThickness {
  /** < 12mm */
  range1: OperatorFactors;
  /** 12-18mm */
  range2: OperatorFactors;
  /** 18-25mm */
  range3: OperatorFactors;
  /** 25-35mm */
  range4: OperatorFactors;
  /** 35-50mm */
  range5: OperatorFactors;
  /** > 50mm */
  range6: OperatorFactors;
}

/**
 * Process layer - defines a process and the min groove width to use it
 */
export interface ProcessLayer {
  process: Exclude<WeldProcess, 'Skip'>;
  minWidth: number; // mm - minimum groove width to switch to this process
}

/**
 * Zone distribution percentages (legacy - kept for compatibility)
 */
export interface ZoneDistribution {
  /** Root pass percentage */
  zone1Pct: number;
  /** Fill passes percentage */
  zone2Pct: number;
  /** Cap pass percentage */
  zone3Pct: number;
}

/**
 * Process strategy - which process to use for each zone
 */
export interface ProcessStrategy {
  /** Root pass process */
  proc1: WeldProcess;
  /** Fill passes process */
  proc2: WeldProcess;
  /** Cap pass process */
  proc3: WeldProcess;
  /** Fillet weld process */
  procFillet: Exclude<WeldProcess, 'Skip'>;
}

/**
 * Inside weld process layers - width-based transitions
 */
export interface InsideWeldLayers {
  layers: ProcessLayer[];
}

/**
 * Geometry input parameters
 */
export interface GeometryInput {
  /** Nozzle outer diameter in mm */
  nozzleOD: number;
  /** Shell plate thickness in mm */
  shellThick: number;
  /** Joint type */
  jointType: JointType;
  /** Root gap in mm */
  rootGap: number;
  /** Root face height in mm */
  rootFace: number;
  /** Fillet throat size in mm */
  filletThroat: number;
  /** Inside bevel angle in degrees (for both joint types) */
  insideBevelAngle: number;
  /** Outside bevel angle in degrees (double bevel only) */
  outsideBevelAngle: number;
  /** Split ratio - inside percentage (double bevel only) */
  splitRatio: number;
  /** Single bevel angle in degrees (single bevel only) */
  singleBevelAngle: number;
}

/**
 * Volume calculation results
 */
export interface VolumeResults {
  /** Inside weld volume in mm³ */
  insideVolume: number;
  /** Outside weld volume in mm³ (0 for single bevel) */
  outsideVolume: number;
  /** Fillet weld volume in mm³ */
  filletVolume: number;
  /** Total weld volume in mm³ */
  totalVolume: number;
  /** Inside weld depth in mm */
  insideDepth: number;
  /** Outside weld depth in mm */
  outsideDepth: number;
}

/**
 * Zone volumes
 */
export interface ZoneVolumes {
  zone1Vol: number;
  zone2Vol: number;
  zone3Vol: number;
}

/**
 * Pass calculation results
 */
export interface PassResults {
  /** Zone 1 (root) passes */
  zone1Passes: number;
  /** Zone 2 (fill) passes */
  zone2Passes: number;
  /** Zone 3 (cap) passes */
  zone3Passes: number;
  /** Total inside passes */
  insidePasses: number;
  /** Outside weld passes */
  outsidePasses: number;
  /** Fillet weld passes */
  filletPasses: number;
  /** Total passes */
  totalPasses: number;
}

/**
 * Arc time results (in minutes)
 */
export interface ArcTimeResults {
  zone1Arc: number;
  zone2Arc: number;
  zone3Arc: number;
  insideArc: number;
  outsideArc: number;
  filletArc: number;
}

/**
 * Time calculation results (in hours)
 */
export interface TimeResults {
  /** Inside weld time in hours */
  insideTime: number;
  /** Outside weld time in hours */
  outsideTime: number;
  /** Fillet weld time in hours */
  filletTime: number;
  /** Total welding time in hours */
  totalTime: number;
}

/**
 * Complete calculation results
 */
export interface CalculationResults {
  volumes: VolumeResults;
  zoneVolumes: ZoneVolumes;
  passes: PassResults;
  arcTimes: ArcTimeResults;
  times: TimeResults;
  /** Weld circumference in mm */
  circumference: number;
  /** Applied operator factors */
  factors: OperatorFactors;
  /** Applied travel speeds */
  speeds: TravelSpeeds;
}

/**
 * Calculated layer with depth boundaries
 */
export interface CalculatedLayer {
  process: Exclude<WeldProcess, 'Skip'>;
  startDepthPct: number; // 0-1, from root
  endDepthPct: number;   // 0-1, from root
  volume: number;        // mm³
}

/**
 * Activity times for nozzle installation workflow (in hours)
 * These can be manually entered or auto-filled based on nozzle size/thickness
 */
export interface ActivityTimes {
  /** Mark nozzle position on shell */
  markPosition: number;
  /** Cut hole and bevel penetration */
  cutAndBevel: number;
  /** Grind bevel clean */
  grindBevelClean: number;
  /** Fit nozzle in position */
  fitNozzle: number;
  /** Pre-heat before 1st side weld */
  preheat1: number;
  /** Weld 1st side (calculated from weld params) */
  weld1stSide: number;
  /** Grind 1st side flat */
  grind1stSide: number;
  /** Back-gouge 2nd side */
  backGouge: number;
  /** Pre-heat before 2nd side weld */
  preheat2: number;
  /** Weld 2nd side (calculated from weld params) */
  weld2ndSide: number;
  /** Grind 2nd side flat */
  grind2ndSide: number;
  /** Fillet weld (calculated from weld params) */
  filletWeld: number;
  /** NDE inspection */
  nde: number;
}

/**
 * Activity codes for production tracking
 */
export type ActivityCode = 'CUTNOZZ' | 'FNOZZ' | 'PREHEAT' | 'WNOZZ' | 'BACGRI' | 'MATCUT' | 'NDE';

/**
 * Activity code breakdown for a nozzle
 */
export interface ActivityCodeBreakdown {
  CUTNOZZ: number;  // Mark + Cut penetration
  FNOZZ: number;    // Fit nozzle
  PREHEAT: number;  // Pre-heat (both sides)
  WNOZZ: number;    // All welding (1st side + 2nd side + fillet)
  BACGRI: number;   // Back-gouge
  MATCUT: number;   // Grind bevel clean + grind flat (both sides)
  NDE: number;      // NDE inspection
}

/**
 * A single nozzle item in the job estimate
 */
export interface NozzleItem {
  id: string;
  /** Nozzle tag/name (e.g., "N1", "N2A", etc.) */
  tag: string;
  /** Quantity of this nozzle type */
  quantity: number;
  /** Geometry inputs */
  geometry: GeometryInput;
  /** Process layers for inside weld */
  insideLayers: ProcessLayer[];
  /** Outside weld process */
  outsideProcess: Exclude<WeldProcess, 'Skip'>;
  /** Fillet process */
  filletProcess: Exclude<WeldProcess, 'Skip'>;
  /** Manual activity times (hours per nozzle) */
  activityTimes: ActivityTimes;
  /** Calculated results (cached) */
  results?: CalculationResults;
  /** Activity code breakdown (hours per nozzle) */
  activityCodes?: ActivityCodeBreakdown;
}

/**
 * Job-level estimate containing multiple nozzles
 */
export interface JobEstimate {
  /** Job number/name */
  jobNumber: string;
  /** Job description */
  description: string;
  /** List of nozzle items */
  nozzles: NozzleItem[];
  /** Created date */
  createdAt: Date;
  /** Last modified date */
  modifiedAt: Date;
}

/**
 * Default activity times - can be overridden
 */
export interface ActivityTimeDefaults {
  /** Default times by shell thickness range */
  byThickness: {
    thin: Partial<ActivityTimes>;    // < 20mm
    medium: Partial<ActivityTimes>;  // 20-40mm
    thick: Partial<ActivityTimes>;   // > 40mm
  };
  /** Default times by nozzle size range */
  byNozzleSize: {
    small: Partial<ActivityTimes>;   // < 200mm OD
    medium: Partial<ActivityTimes>;  // 200-500mm OD
    large: Partial<ActivityTimes>;   // > 500mm OD
  };
}

/**
 * Complete calculation results including activities
 */
export interface FullCalculationResults extends CalculationResults {
  /** Activity times breakdown */
  activities: ActivityTimes;
  /** Grand total time including all activities */
  grandTotalTime: number;
}

/**
 * Complete weld state including all inputs and settings
 */
export interface WeldState {
  geometry: GeometryInput;
  processStrategy: ProcessStrategy;
  beadSizes: BeadSizes;
  travelSpeedsByThickness: TravelSpeedsByThickness;
  operatorFactorsByThickness: OperatorFactorsByThickness;
  zoneDistribution: ZoneDistribution;
  activityTimes: ActivityTimes;
}
