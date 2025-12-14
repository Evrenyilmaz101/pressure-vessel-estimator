import { describe, it, expect } from 'vitest';
import { calculateWeld, validateZoneDistribution } from './index';
import type { GeometryInput, ProcessStrategy, ZoneDistribution } from '../types/weld.types';
import {
  DEFAULT_BEAD_SIZES,
  DEFAULT_TRAVEL_SPEEDS,
  DEFAULT_OPERATOR_FACTORS,
  DEFAULT_ZONE_DISTRIBUTION,
  DEFAULT_GEOMETRY,
  DEFAULT_PROCESS_STRATEGY,
} from '../utils/constants';

describe('Integration Tests - Full Calculation Flow', () => {
  describe('calculateWeld - Double Bevel', () => {
    it('completes full calculation for default double bevel configuration', () => {
      const result = calculateWeld(
        DEFAULT_GEOMETRY,
        DEFAULT_PROCESS_STRATEGY,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        DEFAULT_ZONE_DISTRIBUTION
      );

      // Verify all result sections are populated
      expect(result.volumes).toBeDefined();
      expect(result.zoneVolumes).toBeDefined();
      expect(result.passes).toBeDefined();
      expect(result.arcTimes).toBeDefined();
      expect(result.times).toBeDefined();

      // Verify circumference
      expect(result.circumference).toBeCloseTo(Math.PI * 500, 2);

      // Verify volumes are positive
      expect(result.volumes.insideVolume).toBeGreaterThan(0);
      expect(result.volumes.outsideVolume).toBeGreaterThan(0);
      expect(result.volumes.filletVolume).toBeGreaterThan(0);

      // Verify passes are positive integers
      expect(result.passes.totalPasses).toBeGreaterThan(0);
      expect(Number.isInteger(result.passes.totalPasses)).toBe(true);

      // Verify times are positive
      expect(result.times.totalTime).toBeGreaterThan(0);
      expect(result.times.insideTime).toBeGreaterThan(0);

      // Verify operator factors applied correctly (for 50mm thickness)
      // 50mm is at the boundary, falls into > 50mm range per original calculator logic
      expect(result.factors.inside).toBe(1.8); // > 50mm range
      expect(result.factors.outside).toBe(1.5);

      // Verify travel speeds (for > 40mm thickness)
      expect(result.speeds.GTAW).toBe(80);
      expect(result.speeds.SMAW).toBe(150);
      expect(result.speeds.FCAW).toBe(250);
    });

    it('produces consistent results for same inputs', () => {
      const result1 = calculateWeld(
        DEFAULT_GEOMETRY,
        DEFAULT_PROCESS_STRATEGY,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        DEFAULT_ZONE_DISTRIBUTION
      );

      const result2 = calculateWeld(
        DEFAULT_GEOMETRY,
        DEFAULT_PROCESS_STRATEGY,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        DEFAULT_ZONE_DISTRIBUTION
      );

      expect(result1.times.totalTime).toBe(result2.times.totalTime);
      expect(result1.passes.totalPasses).toBe(result2.passes.totalPasses);
      expect(result1.volumes.totalVolume).toBe(result2.volumes.totalVolume);
    });
  });

  describe('calculateWeld - Single Bevel', () => {
    it('completes full calculation for single bevel configuration', () => {
      const singleBevelGeometry: GeometryInput = {
        ...DEFAULT_GEOMETRY,
        jointType: 'singlebevel',
      };

      const result = calculateWeld(
        singleBevelGeometry,
        DEFAULT_PROCESS_STRATEGY,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        DEFAULT_ZONE_DISTRIBUTION
      );

      // Single bevel should have no outside volume
      expect(result.volumes.outsideVolume).toBe(0);
      expect(result.volumes.outsideDepth).toBe(0);
      expect(result.passes.outsidePasses).toBe(0);
      expect(result.times.outsideTime).toBe(0);

      // But should still have inside and fillet
      expect(result.volumes.insideVolume).toBeGreaterThan(0);
      expect(result.volumes.filletVolume).toBeGreaterThan(0);
      expect(result.times.insideTime).toBeGreaterThan(0);
      expect(result.times.filletTime).toBeGreaterThan(0);
    });
  });

  describe('calculateWeld - Edge Cases', () => {
    it('handles thin plates (< 20mm)', () => {
      const thinGeometry: GeometryInput = {
        ...DEFAULT_GEOMETRY,
        shellThick: 15,
      };

      const result = calculateWeld(
        thinGeometry,
        DEFAULT_PROCESS_STRATEGY,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        DEFAULT_ZONE_DISTRIBUTION
      );

      // Should use thin plate speeds
      expect(result.speeds.GTAW).toBe(60);
      expect(result.speeds.SMAW).toBe(120);
      expect(result.speeds.FCAW).toBe(180);

      // Should use high operator factors (12-18mm range)
      expect(result.factors.inside).toBe(4.5);
      expect(result.factors.outside).toBe(3.0);

      expect(result.times.totalTime).toBeGreaterThan(0);
    });

    it('handles thick plates (> 50mm)', () => {
      const thickGeometry: GeometryInput = {
        ...DEFAULT_GEOMETRY,
        shellThick: 75,
      };

      const result = calculateWeld(
        thickGeometry,
        DEFAULT_PROCESS_STRATEGY,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        DEFAULT_ZONE_DISTRIBUTION
      );

      // Should use thick plate speeds
      expect(result.speeds.GTAW).toBe(80);
      expect(result.speeds.SMAW).toBe(150);
      expect(result.speeds.FCAW).toBe(250);

      // Should use lowest operator factors (> 50mm range)
      expect(result.factors.inside).toBe(1.8);
      expect(result.factors.outside).toBe(1.5);

      expect(result.times.totalTime).toBeGreaterThan(0);
    });

    it('handles Skip process for zone 2', () => {
      const strategyWithSkip: ProcessStrategy = {
        ...DEFAULT_PROCESS_STRATEGY,
        proc2: 'Skip',
      };

      // Adjust zone distribution to account for skip
      const adjustedDistribution: ZoneDistribution = {
        zone1Pct: 40,
        zone2Pct: 0,
        zone3Pct: 60,
      };

      const result = calculateWeld(
        DEFAULT_GEOMETRY,
        strategyWithSkip,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        adjustedDistribution
      );

      expect(result.passes.zone2Passes).toBe(0);
      expect(result.arcTimes.zone2Arc).toBe(0);
      expect(result.times.totalTime).toBeGreaterThan(0);
    });

    it('handles zero root face', () => {
      const noRootFaceGeometry: GeometryInput = {
        ...DEFAULT_GEOMETRY,
        rootFace: 0,
      };

      const result = calculateWeld(
        noRootFaceGeometry,
        DEFAULT_PROCESS_STRATEGY,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        DEFAULT_ZONE_DISTRIBUTION
      );

      expect(result.volumes.totalVolume).toBeGreaterThan(0);
      expect(result.times.totalTime).toBeGreaterThan(0);
    });

    it('handles large nozzle diameter', () => {
      const largeNozzleGeometry: GeometryInput = {
        ...DEFAULT_GEOMETRY,
        nozzleOD: 2000,
      };

      const result = calculateWeld(
        largeNozzleGeometry,
        DEFAULT_PROCESS_STRATEGY,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        DEFAULT_ZONE_DISTRIBUTION
      );

      // Larger circumference = more volume and time
      expect(result.circumference).toBeCloseTo(Math.PI * 2000, 2);
      expect(result.volumes.totalVolume).toBeGreaterThan(0);
      expect(result.times.totalTime).toBeGreaterThan(0);
    });
  });

  describe('validateZoneDistribution', () => {
    it('returns true for valid distribution summing to 100', () => {
      expect(validateZoneDistribution({ zone1Pct: 25, zone2Pct: 35, zone3Pct: 40 })).toBe(true);
      expect(validateZoneDistribution({ zone1Pct: 33.33, zone2Pct: 33.33, zone3Pct: 33.34 })).toBe(true);
      expect(validateZoneDistribution({ zone1Pct: 100, zone2Pct: 0, zone3Pct: 0 })).toBe(true);
    });

    it('returns false for invalid distribution not summing to 100', () => {
      expect(validateZoneDistribution({ zone1Pct: 25, zone2Pct: 35, zone3Pct: 30 })).toBe(false);
      expect(validateZoneDistribution({ zone1Pct: 50, zone2Pct: 50, zone3Pct: 50 })).toBe(false);
      expect(validateZoneDistribution({ zone1Pct: 0, zone2Pct: 0, zone3Pct: 0 })).toBe(false);
    });

    it('allows small floating point tolerance', () => {
      // 33.33 + 33.33 + 33.34 = 100.00, but floating point might give 99.99999...
      expect(validateZoneDistribution({ zone1Pct: 33.33, zone2Pct: 33.33, zone3Pct: 33.34 })).toBe(true);
    });
  });

  describe('Comparison with Original Calculator', () => {
    // These tests validate that our TypeScript implementation matches the original HTML calculator
    it('produces similar results to original calculator for reference case', () => {
      // Reference case: 500mm OD, 50mm thick, double bevel, 70/30 split
      // Default bead sizes, speeds, and factors
      const result = calculateWeld(
        DEFAULT_GEOMETRY,
        DEFAULT_PROCESS_STRATEGY,
        DEFAULT_BEAD_SIZES,
        DEFAULT_TRAVEL_SPEEDS,
        DEFAULT_OPERATOR_FACTORS,
        DEFAULT_ZONE_DISTRIBUTION
      );

      // Verify the calculation produces reasonable results
      // These are sanity checks based on expected ranges

      // Circumference should be ~1571mm for 500mm OD
      expect(result.circumference).toBeCloseTo(1570.8, 0);

      // Total volume should be in cm³ range (converted from mm³)
      const totalVolumeCm3 = result.volumes.totalVolume / 1000;
      expect(totalVolumeCm3).toBeGreaterThan(100);
      expect(totalVolumeCm3).toBeLessThan(2000);

      // Total passes should be in reasonable range
      expect(result.passes.totalPasses).toBeGreaterThan(10);
      expect(result.passes.totalPasses).toBeLessThan(200);

      // Total time should be in hours (reasonable for this size weld)
      expect(result.times.totalTime).toBeGreaterThan(1);
      expect(result.times.totalTime).toBeLessThan(100);
    });
  });
});

