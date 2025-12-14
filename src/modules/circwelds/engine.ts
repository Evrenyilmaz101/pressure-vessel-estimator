import type { SharedSettings } from '../../shared/types';
import type { 
  CircWeldGeometry, 
  CircWeldItem, 
  CircWeldResults, 
  CircWeldActivityCodes,
  CircWeldActivityTimes,
  ProcessLayer,
} from './types';

/**
 * Calculate geometry details for a circ seam weld
 */
function calculateGeometryDetails(geometry: CircWeldGeometry) {
  const { 
    shellThickness, 
    jointType, 
    insideBevelAngle, 
    outsideBevelAngle,
    rootGap, 
    rootFace,
    splitRatio 
  } = geometry;

  // Calculate depths based on joint type
  let insideDepth: number;
  let outsideDepth: number;

  if (jointType === 'singlevee') {
    insideDepth = shellThickness - rootFace;
    outsideDepth = 0;
  } else {
    const splitDecimal = splitRatio / 100;
    insideDepth = Math.max(0, shellThickness * splitDecimal - rootFace / 2);
    outsideDepth = Math.max(0, shellThickness * (1 - splitDecimal) - rootFace / 2);
  }

  // Calculate bevel widths at top of groove (for V-groove, this is per side)
  const insideBevelWidth = insideDepth * Math.tan((insideBevelAngle * Math.PI) / 180);
  const outsideBevelWidth = outsideDepth * Math.tan((outsideBevelAngle * Math.PI) / 180);

  // For V-groove, total top width includes both sides
  const insideTopWidth = rootGap + 2 * insideBevelWidth;
  const outsideTopWidth = rootGap + 2 * outsideBevelWidth;

  return {
    insideDepth,
    outsideDepth,
    insideBevelWidth,
    outsideBevelWidth,
    insideTopWidth,
    outsideTopWidth,
  };
}

/**
 * Calculate weld volumes for a circ seam weld
 * 
 * For V-groove (both Single Vee and Double Vee):
 * - Cross-section is a trapezoid with bottom = rootGap, top = rootGap + 2*bevelWidth
 * - Trapezoidal area = (top + bottom) / 2 * height
 * - Plus root face rectangular area
 */
function calculateVolumes(geometry: CircWeldGeometry, circumference: number): { insideVolume: number; outsideVolume: number } {
  const { rootGap, rootFace, jointType } = geometry;
  const { insideDepth, outsideDepth, insideTopWidth, outsideTopWidth } = calculateGeometryDetails(geometry);

  // Inside bevel cross-section (trapezoid): (top + bottom) / 2 * height
  const insideBevelArea = ((insideTopWidth + rootGap) / 2) * insideDepth;
  
  // Root face area (rectangle) - for double vee, half goes to each side
  const insideRootFaceArea = jointType === 'doublevee' 
    ? rootGap * (rootFace / 2)
    : rootGap * rootFace;
  
  const insideArea = insideBevelArea + insideRootFaceArea;
  
  let outsideArea: number;
  if (outsideDepth > 0) {
    // Double Vee - full outside weld
    const outsideBevelArea = ((outsideTopWidth + rootGap) / 2) * outsideDepth;
    const outsideRootFaceArea = rootGap * (rootFace / 2);
    outsideArea = outsideBevelArea + outsideRootFaceArea;
  } else if (jointType === 'singlevee') {
    // Single Vee - back weld after back-gouge
    // Back weld is typically 3-5mm deep sealing pass covering the root area
    const backWeldDepth = Math.min(5, rootFace + 2); // mm
    const backWeldWidth = rootGap + 6; // mm - slightly wider than root gap
    outsideArea = backWeldWidth * backWeldDepth * 0.5; // Roughly triangular
  } else {
    outsideArea = 0;
  }

  // Volume = area * circumference (mm³)
  const insideVolume = insideArea * circumference;
  const outsideVolume = outsideArea * circumference;

  return { insideVolume, outsideVolume };
}

/**
 * Calculate the volume for each process layer based on width thresholds
 * 
 * For a V-groove, the cross-section at any depth is a trapezoid.
 * Width increases linearly from rootGap at bottom to insideTopWidth at top.
 */
function calculateLayerVolumes(
  insideLayers: ProcessLayer[],
  insideVolume: number,
  rootGap: number,
  _insideBevelWidth: number,
  insideTopWidth: number
): { process: string; volume: number; percentage: number }[] {
  if (insideLayers.length === 0) {
    return [{ process: 'SMAW', volume: insideVolume, percentage: 100 }];
  }

  const sortedLayers = [...insideLayers].sort((a, b) => a.minWidth - b.minWidth);
  const layerVolumes: { process: string; volume: number; percentage: number }[] = [];

  const totalWidthRange = insideTopWidth - rootGap;
  
  // Handle edge case: no bevel (rectangular groove)
  if (totalWidthRange <= 0) {
    return [{ process: sortedLayers[0].process, volume: insideVolume, percentage: 100 }];
  }

  for (let i = 0; i < sortedLayers.length; i++) {
    const layer = sortedLayers[i];
    const nextLayer = sortedLayers[i + 1];
    
    const startWidth = Math.max(layer.minWidth, rootGap);
    const endWidth = nextLayer ? Math.min(nextLayer.minWidth, insideTopWidth) : insideTopWidth;
    
    if (endWidth <= startWidth) continue;
    
    // Calculate the trapezoidal area for this layer slice
    const depthFraction = (endWidth - startWidth) / totalWidthRange;
    const avgWidth = (startWidth + endWidth) / 2;
    
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
 * Main calculation function for circ welds
 */
export function calculateCircWeld(
  item: CircWeldItem,
  settings: SharedSettings
): CircWeldResults {
  const { geometry, insideLayers, outsideProcess } = item;
  const { beadSizes, travelSpeeds, operatorFactors } = settings;
  const { shellThickness, insideDiameter, rootGap } = geometry;
  
  // Calculate circumference from inside diameter
  const circumference = Math.PI * insideDiameter;
  
  const { insideVolume, outsideVolume } = calculateVolumes(geometry, circumference);
  const geoDetails = calculateGeometryDetails(geometry);
  
  // Determine speed and operator factor categories
  const speedCategory = shellThickness < 20 ? 'thin' : shellThickness <= 40 ? 'medium' : 'thick';
  const speeds = travelSpeeds[speedCategory];
  
  const opRange = 
    shellThickness < 12 ? 'range1' :
    shellThickness < 18 ? 'range2' :
    shellThickness < 25 ? 'range3' :
    shellThickness < 35 ? 'range4' :
    shellThickness < 50 ? 'range5' : 'range6';
  const factors = operatorFactors[opRange];
  
  // Calculate layer volumes based on width thresholds
  const layerVolumes = calculateLayerVolumes(
    insideLayers,
    insideVolume,
    rootGap,
    geoDetails.insideBevelWidth,
    geoDetails.insideTopWidth
  );
  
  // Calculate passes and time for each inside layer
  let totalInsidePasses = 0;
  let totalInsideArcTime = 0;
  
  for (const layer of layerVolumes) {
    const bead = beadSizes[layer.process as keyof typeof beadSizes];
    if (!bead || layer.volume <= 0) continue;
    
    const beadArea = bead.h * bead.w;
    const volumePerPass = beadArea * circumference;
    const passes = Math.max(1, Math.ceil(layer.volume / volumePerPass));
    
    const speed = speeds[layer.process as keyof typeof speeds] || 150;
    const arcTime = (circumference * passes) / speed; // in minutes
    
    totalInsidePasses += passes;
    totalInsideArcTime += arcTime;
  }
  
  // Calculate inside total time with operator factor
  const insideTotalTime = (totalInsideArcTime * factors.inside) / 60; // convert to hours
  
  // Calculate outside weld (single process)
  let outsidePasses = 0;
  let outsideArcTime = 0;
  let outsideTotalTime = 0;
  
  if (outsideVolume > 0) {
    const beadOut = beadSizes[outsideProcess as keyof typeof beadSizes];
    if (beadOut) {
      const beadAreaOut = beadOut.h * beadOut.w;
      const volumePerPassOut = beadAreaOut * circumference;
      outsidePasses = Math.max(1, Math.ceil(outsideVolume / volumePerPassOut));
      
      const speedOut = speeds[outsideProcess as keyof typeof speeds] || 150;
      outsideArcTime = (circumference * outsidePasses) / speedOut; // in minutes
      outsideTotalTime = (outsideArcTime * factors.outside) / 60; // convert to hours
    }
  }

  return {
    circumference,
    insideVolume,
    outsideVolume,
    totalVolume: insideVolume + outsideVolume,
    insidePasses: totalInsidePasses,
    outsidePasses,
    totalPasses: totalInsidePasses + outsidePasses,
    times: {
      insideArcTime: totalInsideArcTime / 60,
      outsideArcTime: outsideArcTime / 60,
      insideTotalTime,
      outsideTotalTime,
      totalWeldTime: insideTotalTime + outsideTotalTime,
    },
  };
}

/**
 * Calculate activity codes from activity times and weld results
 * 
 * Activity flow:
 * 1. Move shells to assembly station - CRANE
 * 2. Fit circ weld - FCIRC
 * 3. Pre-heat 1st side - PREHEAT
 * 4. Weld 1st side - WECIRC
 * 5. Back mill - BACMIL
 * 6. Pre-heat 2nd side - PREHEAT
 * 7. Weld 2nd side - SUBCIRC (SAW) or MANCIR (manual for thin)
 * 8. NDE
 */
export function calculateCircWeldActivityCodes(
  activityTimes: CircWeldActivityTimes,
  results: CircWeldResults,
  outsideProcess: string,
  shellThickness: number
): CircWeldActivityCodes {
  // Determine if 2nd side is sub arc or manual based on process and thickness
  const isSubArc = outsideProcess === 'SAW' || (shellThickness >= 12 && outsideProcess !== 'GTAW' && outsideProcess !== 'SMAW');
  
  return {
    CRANE: activityTimes.moveToAssembly,
    FCIRC: activityTimes.fitUp,
    PREHEAT: activityTimes.preheat1stSide + activityTimes.preheat2ndSide,
    WECIRC: results.times.insideTotalTime,
    BACMIL: activityTimes.backMill,
    SUBCIRC: isSubArc ? results.times.outsideTotalTime : 0,
    MANCIR: isSubArc ? 0 : results.times.outsideTotalTime,
    NDE: activityTimes.nde,
  };
}

