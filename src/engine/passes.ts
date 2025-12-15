import type {
  BeadSizes,
  ZoneDistribution,
  ProcessStrategy,
  VolumeResults,
  ZoneVolumes,
  PassResults,
  WeldProcess,
} from '../types/weld.types';

/**
 * Calculate zone volumes based on inside volume and distribution percentages
 * @param insideVolume - Total inside weld volume in mm³
 * @param zoneDistribution - Zone distribution percentages
 * @returns Zone volumes
 */
export function calculateZoneVolumes(
  insideVolume: number,
  zoneDistribution: ZoneDistribution
): ZoneVolumes {
  return {
    zone1Vol: insideVolume * (zoneDistribution.zone1Pct / 100),
    zone2Vol: insideVolume * (zoneDistribution.zone2Pct / 100),
    zone3Vol: insideVolume * (zoneDistribution.zone3Pct / 100),
  };
}

/**
 * Calculate number of passes for a given volume and bead size
 * @param volume - Weld volume in mm³
 * @param beadHeight - Bead height in mm
 * @param beadWidth - Bead width in mm
 * @param circumference - Weld circumference in mm
 * @returns Number of passes (rounded up)
 */
export function calculatePasses(
  volume: number,
  beadHeight: number,
  beadWidth: number,
  circumference: number
): number {
  if (volume <= 0 || beadHeight <= 0 || beadWidth <= 0 || circumference <= 0) {
    return 0;
  }
  return Math.ceil(volume / (beadHeight * beadWidth * circumference));
}

/**
 * Get bead size for a process, handling 'Skip' process
 * @param process - Welding process
 * @param beadSizes - Bead sizes configuration
 * @returns Bead size or null for Skip
 */
function getBeadSize(
  process: WeldProcess,
  beadSizes: BeadSizes
): { h: number; w: number } | null {
  if (process === 'Skip') {
    return null;
  }
  return beadSizes[process];
}

/**
 * Calculate all pass counts
 * @param volumes - Volume calculation results
 * @param zoneVolumes - Zone volumes
 * @param circumference - Weld circumference in mm
 * @param processStrategy - Process strategy
 * @param beadSizes - Bead sizes configuration
 * @returns Pass calculation results
 */
export function calculateAllPasses(
  volumes: VolumeResults,
  zoneVolumes: ZoneVolumes,
  circumference: number,
  processStrategy: ProcessStrategy,
  beadSizes: BeadSizes
): PassResults {
  // Zone 1 (root) passes
  const bead1 = getBeadSize(processStrategy.proc1, beadSizes);
  const zone1Passes = bead1
    ? calculatePasses(zoneVolumes.zone1Vol, bead1.h, bead1.w, circumference)
    : 0;

  // Zone 2 (fill) passes
  const bead2 = getBeadSize(processStrategy.proc2, beadSizes);
  const zone2Passes = bead2
    ? calculatePasses(zoneVolumes.zone2Vol, bead2.h, bead2.w, circumference)
    : 0;

  // Zone 3 (cap) passes
  const bead3 = getBeadSize(processStrategy.proc3, beadSizes);
  const zone3Passes = bead3
    ? calculatePasses(zoneVolumes.zone3Vol, bead3.h, bead3.w, circumference)
    : 0;

  const insidePasses = zone1Passes + zone2Passes + zone3Passes;

  // Outside weld passes (always FCAW for double bevel)
  const outsidePasses =
    volumes.outsideVolume > 0
      ? calculatePasses(
          volumes.outsideVolume,
          beadSizes.FCAW.h,
          beadSizes.FCAW.w,
          circumference
        )
      : 0;

  // Fillet weld passes
  const beadFillet = beadSizes[processStrategy.procFillet];
  const filletPasses = calculatePasses(
    volumes.filletVolume,
    beadFillet.h,
    beadFillet.w,
    circumference
  );

  const totalPasses = insidePasses + outsidePasses + filletPasses;

  return {
    zone1Passes,
    zone2Passes,
    zone3Passes,
    insidePasses,
    outsidePasses,
    filletPasses,
    totalPasses,
  };
}



