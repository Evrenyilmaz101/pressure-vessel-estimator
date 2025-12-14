/**
 * Nozzle-to-Shell Weld Calculator Engine
 *
 * Pure TypeScript calculation functions for welding time estimation.
 * Based on volumetric calculations for K-bevel nozzle-to-shell joints.
 */

import type {
  GeometryInput,
  ProcessStrategy,
  BeadSizes,
  TravelSpeedsByThickness,
  OperatorFactorsByThickness,
  ZoneDistribution,
  CalculationResults,
} from '../types/weld.types';

import { calculateCircumference, calculateVolumes } from './geometry';
import { calculateZoneVolumes, calculateAllPasses } from './passes';
import {
  getTravelSpeeds,
  getOperatorFactors,
  calculateAllArcTimes,
  calculateTotalTimes,
} from './time';

// Re-export individual functions for testing and direct use
export * from './geometry';
export * from './passes';
export * from './time';

/**
 * Perform complete weld calculation
 *
 * @param geometry - Geometry input parameters
 * @param processStrategy - Process strategy
 * @param beadSizes - Bead sizes configuration
 * @param travelSpeedsByThickness - Travel speeds by thickness
 * @param operatorFactorsByThickness - Operator factors by thickness
 * @param zoneDistribution - Zone distribution percentages
 * @returns Complete calculation results
 */
export function calculateWeld(
  geometry: GeometryInput,
  processStrategy: ProcessStrategy,
  beadSizes: BeadSizes,
  travelSpeedsByThickness: TravelSpeedsByThickness,
  operatorFactorsByThickness: OperatorFactorsByThickness,
  zoneDistribution: ZoneDistribution
): CalculationResults {
  // Step 1: Calculate circumference
  const circumference = calculateCircumference(geometry.nozzleOD);

  // Step 2: Calculate volumes
  const volumes = calculateVolumes(geometry);

  // Step 3: Calculate zone volumes
  const zoneVolumes = calculateZoneVolumes(volumes.insideVolume, zoneDistribution);

  // Step 4: Get thickness-dependent parameters
  const speeds = getTravelSpeeds(geometry.shellThick, travelSpeedsByThickness);
  const factors = getOperatorFactors(geometry.shellThick, operatorFactorsByThickness);

  // Step 5: Calculate passes
  const passes = calculateAllPasses(
    volumes,
    zoneVolumes,
    circumference,
    processStrategy,
    beadSizes
  );

  // Step 6: Calculate arc times
  const arcTimes = calculateAllArcTimes(passes, circumference, processStrategy, speeds);

  // Step 7: Calculate total times with operator factors
  const times = calculateTotalTimes(arcTimes, factors);

  return {
    volumes,
    zoneVolumes,
    passes,
    arcTimes,
    times,
    circumference,
    factors,
    speeds,
  };
}

/**
 * Validate zone distribution sums to 100%
 * @param zoneDistribution - Zone distribution percentages
 * @returns true if valid, false otherwise
 */
export function validateZoneDistribution(zoneDistribution: ZoneDistribution): boolean {
  const total =
    zoneDistribution.zone1Pct + zoneDistribution.zone2Pct + zoneDistribution.zone3Pct;
  return Math.abs(total - 100) <= 0.1;
}

