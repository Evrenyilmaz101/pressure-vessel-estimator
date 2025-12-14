import { describe, it, expect } from 'vitest';
import {
  calculateZoneVolumes,
  calculatePasses,
  calculateAllPasses,
} from './passes';
import type {
  ZoneDistribution,
  VolumeResults,
  ZoneVolumes,
  ProcessStrategy,
} from '../types/weld.types';
import { DEFAULT_BEAD_SIZES } from '../utils/constants';

describe('Pass Calculations', () => {
  describe('calculateZoneVolumes', () => {
    it('distributes volume according to percentages', () => {
      const insideVolume = 1000;
      const distribution: ZoneDistribution = {
        zone1Pct: 25,
        zone2Pct: 35,
        zone3Pct: 40,
      };

      const result = calculateZoneVolumes(insideVolume, distribution);

      expect(result.zone1Vol).toBe(250);
      expect(result.zone2Vol).toBe(350);
      expect(result.zone3Vol).toBe(400);
    });

    it('handles equal distribution', () => {
      const insideVolume = 900;
      const distribution: ZoneDistribution = {
        zone1Pct: 33.33,
        zone2Pct: 33.33,
        zone3Pct: 33.34,
      };

      const result = calculateZoneVolumes(insideVolume, distribution);

      expect(result.zone1Vol).toBeCloseTo(300, 0);
      expect(result.zone2Vol).toBeCloseTo(300, 0);
      expect(result.zone3Vol).toBeCloseTo(300, 0);
    });

    it('handles zero volume', () => {
      const distribution: ZoneDistribution = {
        zone1Pct: 25,
        zone2Pct: 35,
        zone3Pct: 40,
      };

      const result = calculateZoneVolumes(0, distribution);

      expect(result.zone1Vol).toBe(0);
      expect(result.zone2Vol).toBe(0);
      expect(result.zone3Vol).toBe(0);
    });
  });

  describe('calculatePasses', () => {
    it('calculates passes correctly', () => {
      // Volume = 1000 mm³, bead area = 2 × 5 = 10 mm², circ = 100 mm
      // Passes = 1000 / (10 × 100) = 1
      const result = calculatePasses(1000, 2, 5, 100);
      expect(result).toBe(1);
    });

    it('rounds up partial passes', () => {
      // Volume = 1500 mm³, bead area = 10 mm², circ = 100 mm
      // Passes = 1500 / 1000 = 1.5 → rounds to 2
      const result = calculatePasses(1500, 2, 5, 100);
      expect(result).toBe(2);
    });

    it('returns 0 for zero volume', () => {
      const result = calculatePasses(0, 2, 5, 100);
      expect(result).toBe(0);
    });

    it('returns 0 for zero bead dimensions', () => {
      expect(calculatePasses(1000, 0, 5, 100)).toBe(0);
      expect(calculatePasses(1000, 2, 0, 100)).toBe(0);
    });

    it('returns 0 for zero circumference', () => {
      const result = calculatePasses(1000, 2, 5, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateAllPasses', () => {
    const volumes: VolumeResults = {
      insideVolume: 100000,
      outsideVolume: 50000,
      filletVolume: 10000,
      totalVolume: 160000,
      insideDepth: 35,
      outsideDepth: 15,
    };

    const zoneVolumes: ZoneVolumes = {
      zone1Vol: 25000,
      zone2Vol: 35000,
      zone3Vol: 40000,
    };

    const circumference = 1570.796; // π × 500

    const processStrategy: ProcessStrategy = {
      proc1: 'GTAW',
      proc2: 'SMAW',
      proc3: 'FCAW',
      procFillet: 'FCAW',
    };

    it('calculates all passes correctly', () => {
      const result = calculateAllPasses(
        volumes,
        zoneVolumes,
        circumference,
        processStrategy,
        DEFAULT_BEAD_SIZES
      );

      // All pass counts should be positive
      expect(result.zone1Passes).toBeGreaterThan(0);
      expect(result.zone2Passes).toBeGreaterThan(0);
      expect(result.zone3Passes).toBeGreaterThan(0);
      expect(result.insidePasses).toBeGreaterThan(0);
      expect(result.outsidePasses).toBeGreaterThan(0);
      expect(result.filletPasses).toBeGreaterThan(0);

      // Inside passes = sum of zone passes
      expect(result.insidePasses).toBe(
        result.zone1Passes + result.zone2Passes + result.zone3Passes
      );

      // Total passes = inside + outside + fillet
      expect(result.totalPasses).toBe(
        result.insidePasses + result.outsidePasses + result.filletPasses
      );
    });

    it('handles Skip process', () => {
      const strategyWithSkip: ProcessStrategy = {
        ...processStrategy,
        proc2: 'Skip',
      };

      const result = calculateAllPasses(
        volumes,
        zoneVolumes,
        circumference,
        strategyWithSkip,
        DEFAULT_BEAD_SIZES
      );

      expect(result.zone2Passes).toBe(0);
      expect(result.insidePasses).toBe(result.zone1Passes + result.zone3Passes);
    });

    it('handles zero outside volume (single bevel)', () => {
      const singleBevelVolumes: VolumeResults = {
        ...volumes,
        outsideVolume: 0,
        outsideDepth: 0,
      };

      const result = calculateAllPasses(
        singleBevelVolumes,
        zoneVolumes,
        circumference,
        processStrategy,
        DEFAULT_BEAD_SIZES
      );

      expect(result.outsidePasses).toBe(0);
    });
  });
});

