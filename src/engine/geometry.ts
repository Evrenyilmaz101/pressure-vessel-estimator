import type { GeometryInput, VolumeResults } from '../types/weld.types';

/**
 * Calculate weld circumference from nozzle OD
 * @param nozzleOD - Nozzle outer diameter in mm
 * @returns Circumference in mm
 */
export function calculateCircumference(nozzleOD: number): number {
  return Math.PI * nozzleOD;
}

/**
 * Calculate bevel width from depth and angle
 * @param depth - Bevel depth in mm
 * @param angleDegrees - Bevel angle in degrees
 * @returns Bevel width in mm
 */
export function calculateBevelWidth(depth: number, angleDegrees: number): number {
  return depth * Math.tan((angleDegrees * Math.PI) / 180);
}

/**
 * Calculate fillet leg size from throat size
 * For equal-leg fillet: leg = throat × √2
 * @param throat - Fillet throat size in mm
 * @returns Fillet leg size in mm
 */
export function calculateFilletLeg(throat: number): number {
  return throat * Math.sqrt(2);
}

/**
 * Calculate fillet weld area
 * @param legSize - Fillet leg size in mm
 * @returns Fillet area in mm²
 */
export function calculateFilletArea(legSize: number): number {
  return 0.5 * legSize * legSize;
}

/**
 * Calculate trapezoid area
 * @param topWidth - Top width in mm
 * @param bottomWidth - Bottom width in mm
 * @param height - Height in mm
 * @returns Area in mm²
 */
export function calculateTrapezoidArea(
  topWidth: number,
  bottomWidth: number,
  height: number
): number {
  return ((topWidth + bottomWidth) / 2) * height;
}

/**
 * Calculate all weld volumes for a given geometry
 * @param input - Geometry input parameters
 * @returns Volume calculation results
 */
export function calculateVolumes(input: GeometryInput): VolumeResults {
  const circ = calculateCircumference(input.nozzleOD);
  const filletLeg = calculateFilletLeg(input.filletThroat);
  const filletArea = calculateFilletArea(filletLeg);
  const filletVolume = filletArea * circ;

  let insideVolume: number;
  let outsideVolume: number;
  let insideDepth: number;
  let outsideDepth: number;

  if (input.jointType === 'doublebevel') {
    // Double bevel - bevels on both sides meeting at split point
    const splitRatio = input.splitRatio / 100;

    // Total depths from surfaces to meeting point
    outsideDepth = input.shellThick * (1 - splitRatio);
    insideDepth = input.shellThick * splitRatio;

    // Bevel depths (from surface to root face edge)
    const outsideBevelDepth = outsideDepth - input.rootFace / 2;
    const insideBevelDepth = insideDepth - input.rootFace / 2;

    // Bevel widths at shell edge
    const outsideBevelWidth = calculateBevelWidth(outsideBevelDepth, input.outsideBevelAngle);
    const insideBevelWidth = calculateBevelWidth(insideBevelDepth, input.insideBevelAngle);

    // Outside section: trapezoid from (rootGap + outsideBevelWidth) at top to rootGap at root face top
    const outsideBevelArea = calculateTrapezoidArea(
      input.rootGap + outsideBevelWidth,
      input.rootGap,
      outsideBevelDepth
    );

    // Root face section: rectangle with constant width = rootGap and height = rootFace
    const rootFaceArea = input.rootGap * input.rootFace;

    // Inside section: trapezoid from rootGap at root face bottom to (rootGap + insideBevelWidth) at bottom
    const insideBevelArea = calculateTrapezoidArea(
      input.rootGap,
      input.rootGap + insideBevelWidth,
      insideBevelDepth
    );

    outsideVolume = outsideBevelArea * circ;
    insideVolume = (insideBevelArea + rootFaceArea) * circ;
  } else {
    // Single bevel - weld extends through full shell thickness
    insideDepth = input.shellThick;
    outsideDepth = 0;

    // Weld depth: only where gap exists (above root face flat section)
    const weldDepth = Math.max(0.1, input.shellThick - input.rootFace);
    const weldBevelWidth = calculateBevelWidth(weldDepth, input.singleBevelAngle);

    // Weld is trapezoid from (rootGap + weldBevelWidth) at top to rootGap at root face
    const bevelArea = calculateTrapezoidArea(
      input.rootGap + weldBevelWidth,
      input.rootGap,
      weldDepth
    );

    insideVolume = bevelArea * circ;
    outsideVolume = 0;
  }

  const totalVolume = insideVolume + outsideVolume + filletVolume;

  return {
    insideVolume,
    outsideVolume,
    filletVolume,
    totalVolume,
    insideDepth,
    outsideDepth,
  };
}

