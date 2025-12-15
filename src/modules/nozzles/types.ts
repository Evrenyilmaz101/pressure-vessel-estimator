import type { WeldProcess, JointType } from '../../shared/types';

/**
 * Process layer - defines a process and the min groove width to use it
 */
export interface ProcessLayer {
  process: Exclude<WeldProcess, 'Skip'>;
  minWidth: number; // mm - minimum groove width to switch to this process
}

/**
 * Geometry input parameters for nozzle
 */
export interface NozzleGeometry {
  nozzleOD: number;
  shellThick: number;
  jointType: JointType;
  rootGap: number;
  rootFace: number;
  filletThroat: number;
  insideBevelAngle: number;
  outsideBevelAngle: number;
  splitRatio: number;
  singleBevelAngle: number;
}

/**
 * Activity times for nozzle installation workflow (in hours)
 */
export interface NozzleActivityTimes {
  markPosition: number;
  cutAndBevel: number;
  grindBevelClean: number;
  fitNozzle: number;
  preheat1: number;
  weld1stSide: number;
  grind1stSide: number;
  backGouge: number;
  preheat2: number;
  weld2ndSide: number;
  grind2ndSide: number;
  filletWeld: number;
  nde: number;
}

/**
 * Activity code breakdown for a nozzle
 */
export interface NozzleActivityCodes {
  CUTNOZZ: number;
  FNOZZ: number;
  PREHEAT: number;
  WNOZZ: number;
  BACGRI: number;
  MATCUT: number;
  NDE: number;
}

/**
 * Calculation results for a nozzle
 */
export interface NozzleCalculationResults {
  circumference: number;
  volumes: {
    insideVolume: number;
    outsideVolume: number;
    filletVolume: number;
    totalVolume: number;
  };
  passes: {
    zone1Passes: number;
    zone2Passes: number;
    zone3Passes: number;
    insidePasses: number;
    outsidePasses: number;
    filletPasses: number;
    totalPasses: number;
  };
  times: {
    insideTime: number;
    outsideTime: number;
    filletTime: number;
    totalTime: number;
  };
}

/**
 * A single nozzle item
 */
export interface NozzleItem {
  id: string;
  tag: string;
  quantity: number;
  geometry: NozzleGeometry;
  insideLayers: ProcessLayer[];
  outsideProcess: Exclude<WeldProcess, 'Skip'>;
  filletProcess: Exclude<WeldProcess, 'Skip'>;
  activityTimes: NozzleActivityTimes;
  results?: NozzleCalculationResults;
  activityCodes?: NozzleActivityCodes;
}

/**
 * Nozzles module data (stored in project)
 */
export interface NozzlesModuleData {
  nozzles: NozzleItem[];
}

/**
 * Default geometry for new nozzle
 */
export const DEFAULT_NOZZLE_GEOMETRY: NozzleGeometry = {
  nozzleOD: 300,
  shellThick: 25,
  jointType: 'doublebevel',
  rootGap: 3,
  rootFace: 2,
  filletThroat: 6,
  insideBevelAngle: 35,
  outsideBevelAngle: 15,
  splitRatio: 70,
  singleBevelAngle: 35,
};

/**
 * Default activity times
 */
export const DEFAULT_NOZZLE_ACTIVITY_TIMES: NozzleActivityTimes = {
  markPosition: 0.25,
  cutAndBevel: 1.0,
  grindBevelClean: 0.5,
  fitNozzle: 1.0,
  preheat1: 0.5,
  weld1stSide: 0,
  grind1stSide: 0.5,
  backGouge: 0.5,
  preheat2: 0.25,
  weld2ndSide: 0,
  grind2ndSide: 0.5,
  filletWeld: 0,
  nde: 1.0,
};

/**
 * Default process layers
 */
export const DEFAULT_PROCESS_LAYERS: ProcessLayer[] = [
  { process: 'GTAW', minWidth: 0 },
  { process: 'SMAW', minWidth: 6 },
  { process: 'FCAW', minWidth: 20 },
];



