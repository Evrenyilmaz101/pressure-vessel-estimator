import type { SharedSettings } from '../../shared/types';
import type { NozzleItem, NozzleCalculationResults, NozzleActivityTimes, NozzleActivityCodes, ProcessLayer } from './types';

/**
 * Calculate layer volumes based on width thresholds for nozzle bevel
 * 
 * For a single bevel (J-groove), width goes from rootGap at bottom to rootGap+bevelWidth at top
 * For a double bevel, same applies to each side
 */
function calculateLayerVolumes(
  insideLayers: ProcessLayer[],
  insideVolume: number,
  rootGap: number,
  insideBevelWidth: number
): { process: string; volume: number; percentage: number }[] {
  if (insideLayers.length === 0) {
    return [{ process: 'SMAW', volume: insideVolume, percentage: 100 }];
  }

  const insideTopWidth = rootGap + insideBevelWidth;
  const sortedLayers = [...insideLayers].sort((a, b) => a.minWidth - b.minWidth);
  const layerVolumes: { process: string; volume: number; percentage: number }[] = [];

  const totalWidthRange = insideTopWidth - rootGap;
  
  // Handle edge case: no bevel (rectangular groove)
  if (totalWidthRange <= 0) {
    return [{ process: sortedLayers[0].process, volume: insideVolume, percentage: 100 }];
  }

  // For each layer, calculate the actual trapezoidal volume it covers
  for (let i = 0; i < sortedLayers.length; i++) {
    const layer = sortedLayers[i];
    const nextLayer = sortedLayers[i + 1];
    
    // Layer starts at its minWidth, ends at next layer's minWidth (or top)
    const startWidth = Math.max(layer.minWidth, rootGap);
    const endWidth = nextLayer ? Math.min(nextLayer.minWidth, insideTopWidth) : insideTopWidth;
    
    if (endWidth <= startWidth) continue;
    
    // Calculate the trapezoidal area for this layer slice
    const depthFraction = (endWidth - startWidth) / totalWidthRange;
    const avgWidth = (startWidth + endWidth) / 2;
    
    // The layer's area relative to total bevel area
    const layerArea = avgWidth * depthFraction;
    const totalBevelArea = (rootGap + insideTopWidth) / 2;
    
    const percentage = (layerArea / totalBevelArea) * 100;
    
    layerVolumes.push({
      process: layer.process,
      volume: insideVolume * (percentage / 100),
      percentage,
    });
  }
  
  // Normalize to ensure percentages sum to 100%
  const totalPct = layerVolumes.reduce((sum, l) => sum + l.percentage, 0);
  if (totalPct > 0 && Math.abs(totalPct - 100) > 0.01) {
    layerVolumes.forEach(l => {
      l.percentage = (l.percentage / totalPct) * 100;
      l.volume = insideVolume * (l.percentage / 100);
    });
  }
  
  return layerVolumes;
}

/**
 * Calculate nozzle weld results
 */
export function calculateNozzle(nozzle: NozzleItem, settings: SharedSettings): NozzleCalculationResults {
  const { geometry, insideLayers, outsideProcess, filletProcess } = nozzle;
  const { beadSizes, travelSpeeds, operatorFactors } = settings;

  // Calculate circumference
  const circumference = Math.PI * geometry.nozzleOD;

  // Determine thickness range for speeds
  const thickness = geometry.shellThick;
  const speedRange = thickness < 20 ? 'thin' : thickness <= 40 ? 'medium' : 'thick';
  const speeds = travelSpeeds[speedRange];

  // Determine operator factor range
  const opRange = 
    thickness < 12 ? 'range1' :
    thickness < 18 ? 'range2' :
    thickness < 25 ? 'range3' :
    thickness < 35 ? 'range4' :
    thickness < 50 ? 'range5' : 'range6';
  const factors = operatorFactors[opRange];

  // Calculate depths
  let insideDepth: number;
  let outsideDepth: number;

  if (geometry.jointType === 'doublebevel') {
    const splitRatioDecimal = geometry.splitRatio / 100;
    insideDepth = Math.max(0, geometry.shellThick * splitRatioDecimal - geometry.rootFace / 2);
    outsideDepth = Math.max(0, geometry.shellThick * (1 - splitRatioDecimal) - geometry.rootFace / 2);
  } else {
    insideDepth = Math.max(0, geometry.shellThick - geometry.rootFace);
    outsideDepth = 0;
  }

  // Calculate bevel widths
  const insideBevelAngle = geometry.jointType === 'doublebevel' ? geometry.insideBevelAngle : geometry.singleBevelAngle;
  const insideBevelWidth = insideDepth * Math.tan((insideBevelAngle * Math.PI) / 180);
  const outsideBevelWidth = outsideDepth * Math.tan((geometry.outsideBevelAngle * Math.PI) / 180);

  // Calculate volumes (mm³)
  // For single bevel (J-groove): trapezoid with bottom=rootGap, top=rootGap+bevelWidth
  // For double bevel: same logic for each side
  // Cross-section area = (bottom + top) / 2 * height + root face rectangle
  
  // Inside bevel cross-section (trapezoid)
  const insideBevelArea = 0.5 * (geometry.rootGap + (geometry.rootGap + insideBevelWidth)) * insideDepth;
  // Root face area (rectangle) - half goes to each side for double bevel
  const insideRootFaceArea = geometry.jointType === 'doublebevel' 
    ? geometry.rootGap * (geometry.rootFace / 2) 
    : geometry.rootGap * geometry.rootFace;
  const insideVolume = (insideBevelArea + insideRootFaceArea) * circumference;
  
  // Outside bevel (only for double bevel)
  let outsideVolume = 0;
  if (geometry.jointType === 'doublebevel') {
    const outsideBevelArea = 0.5 * (geometry.rootGap + (geometry.rootGap + outsideBevelWidth)) * outsideDepth;
    const outsideRootFaceArea = geometry.rootGap * (geometry.rootFace / 2);
    outsideVolume = (outsideBevelArea + outsideRootFaceArea) * circumference;
  }
  
  // Fillet weld (triangle)
  const filletLeg = geometry.filletThroat * Math.sqrt(2);
  const filletVolume = 0.5 * filletLeg * filletLeg * circumference;
  
  const totalVolume = insideVolume + outsideVolume + filletVolume;

  // Calculate layer volumes based on width thresholds
  const layerVolumes = calculateLayerVolumes(
    insideLayers,
    insideVolume,
    geometry.rootGap,
    insideBevelWidth
  );

  // Calculate passes and time for each inside layer
  let totalInsidePasses = 0;
  let totalInsideArcTime = 0;
  const zonePasses: number[] = [];

  for (const layer of layerVolumes) {
    const bead = beadSizes[layer.process as keyof typeof beadSizes];
    if (!bead || layer.volume <= 0) {
      zonePasses.push(0);
      continue;
    }
    
    const beadArea = bead.h * bead.w;
    const volumePerPass = beadArea * circumference;
    const passes = Math.max(1, Math.ceil(layer.volume / volumePerPass));
    
    const speed = speeds[layer.process as keyof typeof speeds] || 150;
    const arcTime = (circumference * passes) / speed; // in minutes
    
    totalInsidePasses += passes;
    totalInsideArcTime += arcTime;
    zonePasses.push(passes);
  }

  // Calculate inside total time with operator factor
  const insideTime = (totalInsideArcTime * factors.inside) / 60; // convert to hours

  // Calculate outside passes and time
  const beadOut = beadSizes[outsideProcess];
  const outsidePasses = outsideVolume > 0 ? Math.max(1, Math.ceil(outsideVolume / (beadOut.h * beadOut.w * circumference))) : 0;
  const speedOut = speeds[outsideProcess];
  const outsideArc = outsidePasses > 0 ? (circumference * outsidePasses) / speedOut : 0;
  const outsideTime = (outsideArc * factors.outside) / 60;

  // Calculate fillet passes and time
  const beadFillet = beadSizes[filletProcess];
  const filletPasses = Math.max(1, Math.ceil(filletVolume / (beadFillet.h * beadFillet.w * circumference)));
  const speedFillet = speeds[filletProcess];
  const filletArc = (circumference * filletPasses) / speedFillet;
  const filletTime = (filletArc * factors.inside) / 60;

  const totalTime = insideTime + outsideTime + filletTime;

  return {
    circumference,
    volumes: {
      insideVolume,
      outsideVolume,
      filletVolume,
      totalVolume,
    },
    passes: {
      zone1Passes: zonePasses[0] || 0,
      zone2Passes: zonePasses[1] || 0,
      zone3Passes: zonePasses[2] || 0,
      insidePasses: totalInsidePasses,
      outsidePasses,
      filletPasses,
      totalPasses: totalInsidePasses + outsidePasses + filletPasses,
    },
    times: {
      insideTime,
      outsideTime,
      filletTime,
      totalTime,
    },
  };
}

/**
 * Calculate activity codes from activity times and weld results
 */
export function calculateActivityCodes(
  activityTimes: NozzleActivityTimes,
  weldTimes: { insideTime: number; outsideTime: number; filletTime: number }
): NozzleActivityCodes {
  return {
    CUTNOZZ: activityTimes.markPosition + activityTimes.cutAndBevel,
    FNOZZ: activityTimes.fitNozzle,
    PREHEAT: activityTimes.preheat1 + activityTimes.preheat2,
    WNOZZ: weldTimes.insideTime + weldTimes.outsideTime + weldTimes.filletTime,
    BACGRI: activityTimes.backGouge,
    MATCUT: activityTimes.grindBevelClean + activityTimes.grind1stSide + activityTimes.grind2ndSide,
    NDE: activityTimes.nde,
  };
}

