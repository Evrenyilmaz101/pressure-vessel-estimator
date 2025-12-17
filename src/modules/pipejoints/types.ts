import type { WeldProcess } from '../../shared/types';

/**
 * Pipe Joint Types
 * 
 * Pipe joints are butt welds between pipe sections.
 * Users select pipe size + schedule, and settings are auto-loaded from admin configuration.
 */

/**
 * Admin-configured settings for each pipe size/schedule combination
 * These are the "locked in" values set up once by admin
 */
export interface PipeJointPreset {
  // Identification
  nps: string;              // Nominal Pipe Size (e.g., "2"", "4"", "6"")
  schedule: string;         // Schedule (e.g., "SCH 40", "SCH 80")
  
  // Auto-populated from pipe data
  od: number;               // Outside diameter (mm)
  wallThickness: number;    // Wall thickness (mm)
  
  // Weld geometry (admin configurable)
  rootGap: number;          // mm (typically 2-3mm)
  rootFace: number;         // mm (typically 1-2mm)
  bevelAngle: number;       // degrees (typically 30-37.5° = 60-75° included)
  
  // Process configuration
  rootProcess: WeldProcess;
  fillProcess: WeldProcess;
  capProcess: WeldProcess;
  
  // Activity times (hours per joint)
  fitUpTime: number;        // Time to fit and tack
  preheatTime: number;      // Preheat time
  ndeTime: number;          // NDE inspection time
  
  // Enabled flag - only enabled presets show in user dropdown
  enabled: boolean;
}

/**
 * A single pipe joint item in the estimator
 */
export interface PipeJointItem {
  id: string;
  tag: string;              // User label (e.g., "Line 101 joints")
  
  // Selection
  nps: string;              // Selected pipe size
  schedule: string;         // Selected schedule
  quantity: number;         // Number of identical joints
  
  // Override flag - if true, user has customized values
  useCustomSettings: boolean;
  
  // Custom settings (only used if useCustomSettings is true)
  customSettings?: Partial<PipeJointPreset>;
  
  // Calculated results
  results?: PipeJointResults;
  activityCodes?: PipeJointActivityCodes;
}

/**
 * Calculated results for a pipe joint
 */
export interface PipeJointResults {
  // Geometry
  circumference: number;    // mm (π × OD)
  weldVolume: number;       // mm³
  
  // Passes
  rootPasses: number;
  fillPasses: number;
  capPasses: number;
  totalPasses: number;
  
  // Times (hours)
  rootTime: number;
  fillTime: number;
  capTime: number;
  totalWeldTime: number;
  totalTime: number;        // Including fit-up, preheat, NDE
}

/**
 * Activity codes for pipe joints
 */
export interface PipeJointActivityCodes {
  FPIPE: number;            // Fit pipe joint
  PREHEAT: number;          // Preheat
  WPIPE: number;            // Weld pipe (root + fill + cap)
  NDE: number;              // NDE inspection
}

/**
 * Module data stored in project
 */
export interface PipeJointsModuleData {
  joints: PipeJointItem[];
}

/**
 * Settings stored globally (admin configuration)
 */
export interface PipeJointSettings {
  presets: PipeJointPreset[];
}

// Default preset values for new pipe sizes
export const DEFAULT_PIPE_JOINT_PRESET: Omit<PipeJointPreset, 'nps' | 'schedule' | 'od' | 'wallThickness'> = {
  rootGap: 3,
  rootFace: 1.5,
  bevelAngle: 30,           // 30° each side = 60° included angle
  rootProcess: 'GTAW',
  fillProcess: 'SMAW',
  capProcess: 'SMAW',
  fitUpTime: 0.5,
  preheatTime: 0.25,
  ndeTime: 0.5,
  enabled: true,
};

// Default activity times
export const DEFAULT_PIPE_JOINT_ACTIVITY_TIMES = {
  fitUpTime: 0.5,
  preheatTime: 0.25,
  ndeTime: 0.5,
};

/**
 * Create a new pipe joint item
 */
export function createNewPipeJoint(tag: string, nps: string = '2"', schedule: string = 'SCH 40'): PipeJointItem {
  return {
    id: Math.random().toString(36).substr(2, 9),
    tag,
    nps,
    schedule,
    quantity: 1,
    useCustomSettings: false,
  };
}



