import type {
  TravelSpeeds,
  TravelSpeedsByThickness,
  OperatorFactors,
  OperatorFactorsByThickness,
  PassResults,
  ProcessStrategy,
  ArcTimeResults,
  TimeResults,
  WeldProcess,
} from '../types/weld.types';

/**
 * Get travel speeds based on shell thickness
 * @param thickness - Shell thickness in mm
 * @param speedsByThickness - Travel speeds configuration
 * @returns Travel speeds for the thickness range
 */
export function getTravelSpeeds(
  thickness: number,
  speedsByThickness: TravelSpeedsByThickness
): TravelSpeeds {
  if (thickness < 20) {
    return speedsByThickness.thin;
  }
  if (thickness < 40) {
    return speedsByThickness.medium;
  }
  return speedsByThickness.thick;
}

/**
 * Get operator factors based on shell thickness
 * @param thickness - Shell thickness in mm
 * @param factorsByThickness - Operator factors configuration
 * @returns Operator factors for the thickness range
 */
export function getOperatorFactors(
  thickness: number,
  factorsByThickness: OperatorFactorsByThickness
): OperatorFactors {
  if (thickness < 12) {
    return factorsByThickness.range1;
  }
  if (thickness < 18) {
    return factorsByThickness.range2;
  }
  if (thickness < 25) {
    return factorsByThickness.range3;
  }
  if (thickness < 35) {
    return factorsByThickness.range4;
  }
  if (thickness < 50) {
    return factorsByThickness.range5;
  }
  return factorsByThickness.range6;
}

/**
 * Get speed for a process, handling 'Skip' process
 * @param process - Welding process
 * @param speeds - Travel speeds
 * @returns Speed in mm/min or 0 for Skip
 */
function getProcessSpeed(process: WeldProcess, speeds: TravelSpeeds): number {
  if (process === 'Skip') {
    return 0;
  }
  return speeds[process];
}

/**
 * Calculate arc time for a number of passes
 * @param passes - Number of passes
 * @param circumference - Weld circumference in mm
 * @param speed - Travel speed in mm/min
 * @returns Arc time in minutes
 */
export function calculateArcTime(
  passes: number,
  circumference: number,
  speed: number
): number {
  if (speed <= 0 || passes <= 0) {
    return 0;
  }
  return (passes * circumference) / speed;
}

/**
 * Calculate all arc times
 * @param passes - Pass calculation results
 * @param circumference - Weld circumference in mm
 * @param processStrategy - Process strategy
 * @param speeds - Travel speeds
 * @returns Arc time results in minutes
 */
export function calculateAllArcTimes(
  passes: PassResults,
  circumference: number,
  processStrategy: ProcessStrategy,
  speeds: TravelSpeeds
): ArcTimeResults {
  const zone1Arc = calculateArcTime(
    passes.zone1Passes,
    circumference,
    getProcessSpeed(processStrategy.proc1, speeds)
  );

  const zone2Arc = calculateArcTime(
    passes.zone2Passes,
    circumference,
    getProcessSpeed(processStrategy.proc2, speeds)
  );

  const zone3Arc = calculateArcTime(
    passes.zone3Passes,
    circumference,
    getProcessSpeed(processStrategy.proc3, speeds)
  );

  const insideArc = zone1Arc + zone2Arc + zone3Arc;

  const outsideArc = calculateArcTime(passes.outsidePasses, circumference, speeds.FCAW);

  const filletArc = calculateArcTime(
    passes.filletPasses,
    circumference,
    speeds[processStrategy.procFillet]
  );

  return {
    zone1Arc,
    zone2Arc,
    zone3Arc,
    insideArc,
    outsideArc,
    filletArc,
  };
}

/**
 * Calculate total welding times with operator factors
 * @param arcTimes - Arc time results in minutes
 * @param factors - Operator factors
 * @returns Time results in hours
 */
export function calculateTotalTimes(
  arcTimes: ArcTimeResults,
  factors: OperatorFactors
): TimeResults {
  // Convert arc time from minutes to hours and apply operator factor
  const insideTime = (arcTimes.insideArc / 60) * factors.inside;
  const outsideTime = (arcTimes.outsideArc / 60) * factors.outside;
  const filletTime = (arcTimes.filletArc / 60) * factors.outside;
  const totalTime = insideTime + outsideTime + filletTime;

  return {
    insideTime,
    outsideTime,
    filletTime,
    totalTime,
  };
}



