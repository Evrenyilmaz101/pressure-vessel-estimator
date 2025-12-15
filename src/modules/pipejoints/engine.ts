import type { SharedSettings } from '../../shared/types';
import type { 
  PipeJointItem, 
  PipeJointResults, 
  PipeJointActivityCodes,
  PipeJointPreset,
  PipeJointSettings,
} from './types';
import { DEFAULT_PIPE_JOINT_PRESET } from './types';
import { getPipeDimensions } from './pipeData';

/**
 * Get the effective settings for a pipe joint
 * Returns the preset settings merged with any custom overrides
 */
export function getEffectiveSettings(
  item: PipeJointItem,
  pipeJointSettings: PipeJointSettings
): PipeJointPreset | null {
  // Get pipe dimensions
  const dims = getPipeDimensions(item.nps, item.schedule);
  if (!dims) return null;
  
  // Find preset for this pipe size/schedule
  const preset = pipeJointSettings.presets.find(
    p => p.nps === item.nps && p.schedule === item.schedule
  );
  
  // Build effective settings
  const baseSettings: PipeJointPreset = preset || {
    nps: item.nps,
    schedule: item.schedule,
    od: dims.od,
    wallThickness: dims.wallThickness,
    ...DEFAULT_PIPE_JOINT_PRESET,
  };
  
  // Apply custom overrides if enabled
  if (item.useCustomSettings && item.customSettings) {
    return {
      ...baseSettings,
      ...item.customSettings,
      // Always use actual pipe dimensions
      od: dims.od,
      wallThickness: dims.wallThickness,
    };
  }
  
  return {
    ...baseSettings,
    od: dims.od,
    wallThickness: dims.wallThickness,
  };
}

/**
 * Calculate weld volume for a single-V butt joint on pipe
 * 
 * Cross-section is a trapezoid:
 * - Bottom width = root gap
 * - Top width = root gap + 2 * (depth * tan(bevelAngle))
 * - Depth = wall thickness - root face
 * 
 * Plus root face rectangular area
 */
function calculateWeldVolume(
  od: number,
  wallThickness: number,
  rootGap: number,
  rootFace: number,
  bevelAngle: number
): number {
  const circumference = Math.PI * od;
  
  // Bevel depth (excluding root face)
  const bevelDepth = wallThickness - rootFace;
  
  // Width at top of bevel
  const bevelWidth = bevelDepth * Math.tan((bevelAngle * Math.PI) / 180);
  const topWidth = rootGap + 2 * bevelWidth;
  
  // Trapezoidal area for bevel
  const bevelArea = ((topWidth + rootGap) / 2) * bevelDepth;
  
  // Root face rectangular area
  const rootFaceArea = rootGap * rootFace;
  
  // Total cross-sectional area
  const totalArea = bevelArea + rootFaceArea;
  
  // Volume = area × circumference
  return totalArea * circumference;
}

/**
 * Calculate number of passes for a given volume and process
 */
function calculatePasses(
  volume: number,
  circumference: number,
  beadH: number,
  beadW: number
): number {
  const beadArea = beadH * beadW;
  const volumePerPass = beadArea * circumference;
  return Math.max(1, Math.ceil(volume / volumePerPass));
}

/**
 * Calculate weld time for given passes and process
 */
function calculateWeldTime(
  passes: number,
  circumference: number,
  travelSpeed: number,
  operatorFactor: number
): number {
  const arcTimeMinutes = (circumference * passes) / travelSpeed;
  return (arcTimeMinutes * operatorFactor) / 60; // Convert to hours
}

/**
 * Main calculation function for pipe joints
 */
export function calculatePipeJoint(
  item: PipeJointItem,
  pipeJointSettings: PipeJointSettings,
  sharedSettings: SharedSettings
): PipeJointResults | null {
  const effectiveSettings = getEffectiveSettings(item, pipeJointSettings);
  if (!effectiveSettings) return null;
  
  const { 
    od, 
    wallThickness, 
    rootGap, 
    rootFace, 
    bevelAngle,
    rootProcess,
    fillProcess,
    capProcess,
    fitUpTime,
    preheatTime,
    ndeTime,
  } = effectiveSettings;
  
  const { beadSizes, travelSpeeds, operatorFactors } = sharedSettings;
  
  const circumference = Math.PI * od;
  const weldVolume = calculateWeldVolume(od, wallThickness, rootGap, rootFace, bevelAngle);
  
  // Determine thickness category for speeds
  const speedCategory = wallThickness < 20 ? 'thin' : wallThickness <= 40 ? 'medium' : 'thick';
  const speeds = travelSpeeds[speedCategory];
  
  // Determine operator factor range
  const opRange = 
    wallThickness < 12 ? 'range1' :
    wallThickness < 18 ? 'range2' :
    wallThickness < 25 ? 'range3' :
    wallThickness < 35 ? 'range4' :
    wallThickness < 50 ? 'range5' : 'range6';
  
  // Use inside factor for pipe welding (similar to inside of vessel)
  const opFactor = operatorFactors[opRange].inside;
  
  // Calculate root pass (first pass at root)
  const rootBead = beadSizes[rootProcess as keyof typeof beadSizes];
  const rootBeadArea = rootBead.h * rootBead.w;
  const rootVolume = rootGap * rootFace * circumference; // Approximate root volume
  const rootPasses = Math.max(1, Math.ceil(rootVolume / (rootBeadArea * circumference)));
  const rootSpeed = speeds[rootProcess as keyof typeof speeds] || 80;
  const rootTime = calculateWeldTime(rootPasses, circumference, rootSpeed, opFactor);
  
  // Calculate fill passes (bulk of the weld)
  const fillBead = beadSizes[fillProcess as keyof typeof beadSizes];
  const remainingVolume = weldVolume - rootVolume;
  const capVolume = fillBead.h * fillBead.w * circumference; // One pass worth for cap
  const fillVolume = Math.max(0, remainingVolume - capVolume);
  const fillPasses = calculatePasses(fillVolume, circumference, fillBead.h, fillBead.w);
  const fillSpeed = speeds[fillProcess as keyof typeof speeds] || 100;
  const fillTime = calculateWeldTime(fillPasses, circumference, fillSpeed, opFactor);
  
  // Calculate cap pass
  const capBead = beadSizes[capProcess as keyof typeof beadSizes];
  const capPasses = Math.max(1, Math.ceil(capVolume / (capBead.h * capBead.w * circumference)));
  const capSpeed = speeds[capProcess as keyof typeof speeds] || 100;
  const capTime = calculateWeldTime(capPasses, circumference, capSpeed, opFactor);
  
  const totalPasses = rootPasses + fillPasses + capPasses;
  const totalWeldTime = rootTime + fillTime + capTime;
  const totalTime = fitUpTime + preheatTime + totalWeldTime + ndeTime;
  
  return {
    circumference,
    weldVolume,
    rootPasses,
    fillPasses,
    capPasses,
    totalPasses,
    rootTime,
    fillTime,
    capTime,
    totalWeldTime,
    totalTime,
  };
}

/**
 * Calculate activity codes from results
 */
export function calculatePipeJointActivityCodes(
  item: PipeJointItem,
  results: PipeJointResults,
  pipeJointSettings: PipeJointSettings
): PipeJointActivityCodes {
  const effectiveSettings = getEffectiveSettings(item, pipeJointSettings);
  
  return {
    FPIPE: effectiveSettings?.fitUpTime || 0.5,
    PREHEAT: effectiveSettings?.preheatTime || 0.25,
    WPIPE: results.totalWeldTime,
    NDE: effectiveSettings?.ndeTime || 0.5,
  };
}


