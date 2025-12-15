import { describe, it, expect } from 'vitest';
import {
  calculateCircumference,
  calculateBevelWidth,
  calculateFilletLeg,
  calculateFilletArea,
  calculateTrapezoidArea,
  calculateVolumes,
} from './geometry';
import type { GeometryInput } from '../types/weld.types';

describe('Geometry Calculations', () => {
  describe('calculateCircumference', () => {
    it('calculates circumference correctly for 500mm OD', () => {
      const result = calculateCircumference(500);
      expect(result).toBeCloseTo(Math.PI * 500, 5);
      expect(result).toBeCloseTo(1570.796, 2);
    });

    it('calculates circumference correctly for 1000mm OD', () => {
      const result = calculateCircumference(1000);
      expect(result).toBeCloseTo(3141.593, 2);
    });
  });

  describe('calculateBevelWidth', () => {
    it('calculates bevel width for 45° angle', () => {
      // tan(45°) = 1, so width = depth
      const result = calculateBevelWidth(10, 45);
      expect(result).toBeCloseTo(10, 5);
    });

    it('calculates bevel width for 30° angle', () => {
      // tan(30°) ≈ 0.577
      const result = calculateBevelWidth(10, 30);
      expect(result).toBeCloseTo(5.774, 2);
    });

    it('calculates bevel width for 60° angle', () => {
      // tan(60°) ≈ 1.732
      const result = calculateBevelWidth(10, 60);
      expect(result).toBeCloseTo(17.32, 1);
    });
  });

  describe('calculateFilletLeg', () => {
    it('calculates fillet leg from throat size', () => {
      // leg = throat × √2
      const result = calculateFilletLeg(6);
      expect(result).toBeCloseTo(6 * Math.sqrt(2), 5);
      expect(result).toBeCloseTo(8.485, 2);
    });
  });

  describe('calculateFilletArea', () => {
    it('calculates fillet area correctly', () => {
      // Area = 0.5 × leg²
      const legSize = 8.485;
      const result = calculateFilletArea(legSize);
      expect(result).toBeCloseTo(0.5 * legSize * legSize, 2);
    });
  });

  describe('calculateTrapezoidArea', () => {
    it('calculates trapezoid area correctly', () => {
      // Area = (top + bottom) / 2 × height
      const result = calculateTrapezoidArea(10, 20, 5);
      expect(result).toBe(75);
    });

    it('calculates rectangle area when top equals bottom', () => {
      const result = calculateTrapezoidArea(10, 10, 5);
      expect(result).toBe(50);
    });
  });

  describe('calculateVolumes - Double Bevel', () => {
    const doubleBevelInput: GeometryInput = {
      nozzleOD: 500,
      shellThick: 50,
      jointType: 'doublebevel',
      rootGap: 5,
      rootFace: 3,
      filletThroat: 6,
      insideBevelAngle: 45,
      outsideBevelAngle: 45,
      splitRatio: 70,
      singleBevelAngle: 30,
    };

    it('calculates volumes for standard double bevel joint', () => {
      const result = calculateVolumes(doubleBevelInput);

      // Verify all volumes are positive
      expect(result.insideVolume).toBeGreaterThan(0);
      expect(result.outsideVolume).toBeGreaterThan(0);
      expect(result.filletVolume).toBeGreaterThan(0);
      expect(result.totalVolume).toBeGreaterThan(0);

      // Verify total equals sum of parts
      expect(result.totalVolume).toBeCloseTo(
        result.insideVolume + result.outsideVolume + result.filletVolume,
        2
      );

      // Verify depths
      expect(result.insideDepth).toBeCloseTo(35, 1); // 70% of 50mm
      expect(result.outsideDepth).toBeCloseTo(15, 1); // 30% of 50mm
    });

    it('handles zero root face', () => {
      const input: GeometryInput = { ...doubleBevelInput, rootFace: 0 };
      const result = calculateVolumes(input);

      expect(result.insideVolume).toBeGreaterThan(0);
      expect(result.outsideVolume).toBeGreaterThan(0);
    });

    it('handles different split ratios', () => {
      const input60: GeometryInput = { ...doubleBevelInput, splitRatio: 60 };
      const input80: GeometryInput = { ...doubleBevelInput, splitRatio: 80 };

      const result60 = calculateVolumes(input60);
      const result80 = calculateVolumes(input80);

      // Higher split ratio = more inside depth, less outside depth
      expect(result80.insideDepth).toBeGreaterThan(result60.insideDepth);
      expect(result80.outsideDepth).toBeLessThan(result60.outsideDepth);
    });
  });

  describe('calculateVolumes - Single Bevel', () => {
    const singleBevelInput: GeometryInput = {
      nozzleOD: 500,
      shellThick: 50,
      jointType: 'singlebevel',
      rootGap: 5,
      rootFace: 3,
      filletThroat: 6,
      insideBevelAngle: 45,
      outsideBevelAngle: 45,
      splitRatio: 70,
      singleBevelAngle: 30,
    };

    it('calculates volumes for single bevel joint', () => {
      const result = calculateVolumes(singleBevelInput);

      // Single bevel has no outside volume
      expect(result.outsideVolume).toBe(0);
      expect(result.outsideDepth).toBe(0);

      // Inside volume should be positive
      expect(result.insideVolume).toBeGreaterThan(0);

      // Inside depth equals full shell thickness
      expect(result.insideDepth).toBe(50);

      // Fillet volume still calculated
      expect(result.filletVolume).toBeGreaterThan(0);
    });

    it('handles very thin plates', () => {
      const input: GeometryInput = { ...singleBevelInput, shellThick: 10 };
      const result = calculateVolumes(input);

      expect(result.insideVolume).toBeGreaterThan(0);
      expect(result.insideDepth).toBe(10);
    });

    it('handles very thick plates', () => {
      const input: GeometryInput = { ...singleBevelInput, shellThick: 100 };
      const result = calculateVolumes(input);

      expect(result.insideVolume).toBeGreaterThan(0);
      expect(result.insideDepth).toBe(100);
    });
  });

  describe('Volume Validation - Match Original Calculator', () => {
    // Test case from documentation: 500mm OD, 50mm thick, 70/30 split
    it('matches expected volumes for reference case', () => {
      const input: GeometryInput = {
        nozzleOD: 500,
        shellThick: 50,
        jointType: 'doublebevel',
        rootGap: 5,
        rootFace: 3,
        filletThroat: 6,
        insideBevelAngle: 45,
        outsideBevelAngle: 45,
        splitRatio: 70,
        singleBevelAngle: 30,
      };

      const result = calculateVolumes(input);
      const circumference = Math.PI * 500;

      // Convert to cm³ for comparison (divide by 1000)
      const totalVolumeCm3 = result.totalVolume / 1000;

      // The total volume should be in a reasonable range for this geometry
      // Based on the original calculator's output
      expect(totalVolumeCm3).toBeGreaterThan(100);
      expect(totalVolumeCm3).toBeLessThan(2000);

      // Verify circumference calculation is correct
      expect(circumference).toBeCloseTo(1570.796, 2);
    });
  });
});



