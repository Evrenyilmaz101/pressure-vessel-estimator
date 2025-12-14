import type { SharedSettings } from '../../shared/types';
import type { 
  LongWeldGeometry, 
  LongWeldItem, 
  LongWeldResults, 
  LongWeldActivityCodes,
  LongWeldActivityTimes,
  ProcessLayer,
} from './types';

/**
 * Calculate geometry details for a long seam weld
 */
function calculateGeometryDetails(geometry: LongWeldGeometry) {
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
 * Calculate weld volumes for a long seam weld
 * 
 * For V-groove (both Single Vee and Double Vee):
 * - Cross-section is a trapezoid with bottom = rootGap, top = rootGap + 2*bevelWidth
 * - Trapezoidal area = (top + bottom) / 2 * height
 * - Plus root face rectangular area
 */
function calculateVolumes(geometry: LongWeldGeometry): { insideVolume: number; outsideVolume: number } {
  const { weldLength, rootGap, rootFace, jointType } = geometry;
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

  // Volume = area * length (mm³)
  const insideVolume = insideArea * weldLength;
  const outsideVolume = outsideArea * weldLength;

  return { insideVolume, outsideVolume };
}

/**
 * Calculate the volume for each process layer based on width thresholds
 * 
 * For a V-groove, the cross-section at any depth is a trapezoid.
 * Width increases linearly from rootGap at bottom to insideTopWidth at top.
 * 
 * The volume of a slice from width w1 to w2 in a V-groove can be calculated
 * by integrating the trapezoidal cross-sections. For simplicity, we use:
 * 
 * Volume from w1 to w2 = (average width) * (depth span) * length
 * 
 * Since width is linear with depth: avgWidth = (w1 + w2) / 2
 * And depth span = (w2 - w1) / (totalWidthRange) * totalDepth
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

  // For each layer, calculate the actual trapezoidal volume it covers
  // The total groove area (excluding root face) = (rootGap + insideTopWidth) / 2 * depth
  // We need to calculate what fraction of this each layer covers
  
  for (let i = 0; i < sortedLayers.length; i++) {
    const layer = sortedLayers[i];
    const nextLayer = sortedLayers[i + 1];
    
    // Layer starts at its minWidth, ends at next layer's minWidth (or top)
    const startWidth = Math.max(layer.minWidth, rootGap);
    const endWidth = nextLayer ? Math.min(nextLayer.minWidth, insideTopWidth) : insideTopWidth;
    
    if (endWidth <= startWidth) continue;
    
    // Calculate the trapezoidal area for this layer slice
    // Area of trapezoid = (top + bottom) / 2 * height
    // Here: top = endWidth, bottom = startWidth
    // Height (depth) is proportional to width change
    const depthFraction = (endWidth - startWidth) / totalWidthRange;
    const avgWidth = (startWidth + endWidth) / 2;
    
    // The layer's area relative to total bevel area
    // Total bevel area = (rootGap + insideTopWidth) / 2 * 1 (normalized depth)
    // Layer area = avgWidth * depthFraction
    const layerArea = avgWidth * depthFraction;
    const totalBevelArea = (rootGap + insideTopWidth) / 2;
    
    const percentage = (layerArea / totalBevelArea) * 100;
    
    layerVolumes.push({
      process: layer.process,
      volume: insideVolume * (percentage / 100),
      percentage,
    });
  }
  
  // Normalize to ensure percentages sum to 100% (handles rounding)
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
 * Main calculation function for long welds
 */
export function calculateLongWeld(
  item: LongWeldItem,
  settings: SharedSettings
): LongWeldResults {
  const { geometry, insideLayers, outsideProcess } = item;
  const { beadSizes, travelSpeeds, operatorFactors } = settings;
  const { weldLength, shellThickness, rootGap } = geometry;
  
  const { insideVolume, outsideVolume } = calculateVolumes(geometry);
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
    const volumePerPass = beadArea * weldLength;
    const passes = Math.max(1, Math.ceil(layer.volume / volumePerPass));
    
    const speed = speeds[layer.process as keyof typeof speeds] || 150;
    const arcTime = (weldLength * passes) / speed; // in minutes
    
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
      const volumePerPassOut = beadAreaOut * weldLength;
      outsidePasses = Math.max(1, Math.ceil(outsideVolume / volumePerPassOut));
      
      const speedOut = speeds[outsideProcess as keyof typeof speeds] || 150;
      outsideArcTime = (weldLength * outsidePasses) / speedOut; // in minutes
      outsideTotalTime = (outsideArcTime * factors.outside) / 60; // convert to hours
    }
  }

  return {
    insideVolume,
    outsideVolume,
    totalVolume: insideVolume + outsideVolume,
    insidePasses: totalInsidePasses,
    outsidePasses,
    totalPasses: totalInsidePasses + outsidePasses,
    times: {
      insideArcTime: totalInsideArcTime / 60, // convert to hours
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
 * 1. Cut plate - MATCUT
 * 2. Clean plate for rolling - MATCUT
 * 3. Move to roll - CRANE
 * 4. Roll - ROLL
 * 5. Fit the long weld - FLON
 * 6. Move to welding station - CRANE
 * 7. Pre-heat 1st side - PREHEAT
 * 8. Weld 1st side - WELON
 * 9. Move to mill - CRANE
 * 10. Back mill - BACMIL
 * 11. Move to welding station - CRANE
 * 12. Pre-heat 2nd side - PREHEAT
 * 13. Weld 2nd side - SUBLON (SAW) or MANLON (manual for thin)
 * 14. Move to roll - CRANE
 * 15. Re-roll - ROLL
 * 16. NDE
 */
export function calculateLongWeldActivityCodes(
  activityTimes: LongWeldActivityTimes,
  results: LongWeldResults,
  outsideProcess: string,
  shellThickness: number
): LongWeldActivityCodes {
  // Determine if 2nd side is sub arc or manual based on process and thickness
  // Generally SAW for thick material, manual (GTAW/SMAW) for thin
  const isSubArc = outsideProcess === 'SAW' || (shellThickness >= 12 && outsideProcess !== 'GTAW' && outsideProcess !== 'SMAW');
  
  return {
    MATCUT: activityTimes.cutPlate + activityTimes.cleanPlate,
    CRANE: activityTimes.moveToRoll + activityTimes.moveToWeld1 + activityTimes.moveToMill + activityTimes.moveToWeld2 + activityTimes.moveToReRoll,
    ROLL: activityTimes.roll + activityTimes.reRoll,
    FLON: activityTimes.fitUp,
    PREHEAT: activityTimes.preheat1stSide + activityTimes.preheat2ndSide,
    WELON: results.times.insideTotalTime,
    BACMIL: activityTimes.backMill,
    SUBLON: isSubArc ? results.times.outsideTotalTime : 0,
    MANLON: isSubArc ? 0 : results.times.outsideTotalTime,
    NDE: activityTimes.nde,
  };
}

