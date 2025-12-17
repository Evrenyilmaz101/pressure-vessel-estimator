import { describe, it, expect } from 'vitest';
import {
  getTravelSpeeds,
  getOperatorFactors,
  calculateArcTime,
  calculateAllArcTimes,
  calculateTotalTimes,
} from './time';
import type {
  PassResults,
  ProcessStrategy,
  ArcTimeResults,
} from '../types/weld.types';
import {
  DEFAULT_TRAVEL_SPEEDS,
  DEFAULT_OPERATOR_FACTORS,
} from '../utils/constants';

describe('Time Calculations', () => {
  describe('getTravelSpeeds', () => {
    it('returns thin speeds for thickness < 20mm', () => {
      const result = getTravelSpeeds(15, DEFAULT_TRAVEL_SPEEDS);
      expect(result).toEqual(DEFAULT_TRAVEL_SPEEDS.thin);
      expect(result.GTAW).toBe(60);
      expect(result.SMAW).toBe(120);
      expect(result.FCAW).toBe(180);
    });

    it('returns medium speeds for thickness 20-40mm', () => {
      const result = getTravelSpeeds(30, DEFAULT_TRAVEL_SPEEDS);
      expect(result).toEqual(DEFAULT_TRAVEL_SPEEDS.medium);
      expect(result.GTAW).toBe(70);
      expect(result.SMAW).toBe(140);
      expect(result.FCAW).toBe(220);
    });

    it('returns thick speeds for thickness > 40mm', () => {
      const result = getTravelSpeeds(50, DEFAULT_TRAVEL_SPEEDS);
      expect(result).toEqual(DEFAULT_TRAVEL_SPEEDS.thick);
      expect(result.GTAW).toBe(80);
      expect(result.SMAW).toBe(150);
      expect(result.FCAW).toBe(250);
    });

    it('handles boundary at 20mm', () => {
      expect(getTravelSpeeds(19.9, DEFAULT_TRAVEL_SPEEDS)).toEqual(DEFAULT_TRAVEL_SPEEDS.thin);
      expect(getTravelSpeeds(20, DEFAULT_TRAVEL_SPEEDS)).toEqual(DEFAULT_TRAVEL_SPEEDS.medium);
    });

    it('handles boundary at 40mm', () => {
      expect(getTravelSpeeds(39.9, DEFAULT_TRAVEL_SPEEDS)).toEqual(DEFAULT_TRAVEL_SPEEDS.medium);
      expect(getTravelSpeeds(40, DEFAULT_TRAVEL_SPEEDS)).toEqual(DEFAULT_TRAVEL_SPEEDS.thick);
    });
  });

  describe('getOperatorFactors', () => {
    it('returns range1 factors for thickness < 12mm', () => {
      const result = getOperatorFactors(10, DEFAULT_OPERATOR_FACTORS);
      expect(result).toEqual(DEFAULT_OPERATOR_FACTORS.range1);
      expect(result.inside).toBe(5.0);
      expect(result.outside).toBe(3.5);
    });

    it('returns range2 factors for thickness 12-18mm', () => {
      const result = getOperatorFactors(15, DEFAULT_OPERATOR_FACTORS);
      expect(result).toEqual(DEFAULT_OPERATOR_FACTORS.range2);
    });

    it('returns range3 factors for thickness 18-25mm', () => {
      const result = getOperatorFactors(20, DEFAULT_OPERATOR_FACTORS);
      expect(result).toEqual(DEFAULT_OPERATOR_FACTORS.range3);
    });

    it('returns range4 factors for thickness 25-35mm', () => {
      const result = getOperatorFactors(30, DEFAULT_OPERATOR_FACTORS);
      expect(result).toEqual(DEFAULT_OPERATOR_FACTORS.range4);
    });

    it('returns range5 factors for thickness 35-50mm', () => {
      const result = getOperatorFactors(40, DEFAULT_OPERATOR_FACTORS);
      expect(result).toEqual(DEFAULT_OPERATOR_FACTORS.range5);
    });

    it('returns range6 factors for thickness > 50mm', () => {
      const result = getOperatorFactors(60, DEFAULT_OPERATOR_FACTORS);
      expect(result).toEqual(DEFAULT_OPERATOR_FACTORS.range6);
      expect(result.inside).toBe(1.8);
      expect(result.outside).toBe(1.5);
    });
  });

  describe('calculateArcTime', () => {
    it('calculates arc time correctly', () => {
      // 5 passes × 1000mm circumference / 100 mm/min = 50 minutes
      const result = calculateArcTime(5, 1000, 100);
      expect(result).toBe(50);
    });

    it('returns 0 for zero passes', () => {
      const result = calculateArcTime(0, 1000, 100);
      expect(result).toBe(0);
    });

    it('returns 0 for zero speed', () => {
      const result = calculateArcTime(5, 1000, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateAllArcTimes', () => {
    const passes: PassResults = {
      zone1Passes: 4,
      zone2Passes: 5,
      zone3Passes: 3,
      insidePasses: 12,
      outsidePasses: 2,
      filletPasses: 1,
      totalPasses: 15,
    };

    const circumference = 1570.796;

    const processStrategy: ProcessStrategy = {
      proc1: 'GTAW',
      proc2: 'SMAW',
      proc3: 'FCAW',
      procFillet: 'FCAW',
    };

    const speeds = DEFAULT_TRAVEL_SPEEDS.thick;

    it('calculates all arc times correctly', () => {
      const result = calculateAllArcTimes(passes, circumference, processStrategy, speeds);

      // Zone 1: 4 passes × 1570.796 / 80 (GTAW speed)
      expect(result.zone1Arc).toBeCloseTo((4 * 1570.796) / 80, 2);

      // Zone 2: 5 passes × 1570.796 / 150 (SMAW speed)
      expect(result.zone2Arc).toBeCloseTo((5 * 1570.796) / 150, 2);

      // Zone 3: 3 passes × 1570.796 / 250 (FCAW speed)
      expect(result.zone3Arc).toBeCloseTo((3 * 1570.796) / 250, 2);

      // Inside arc = sum of zone arcs
      expect(result.insideArc).toBeCloseTo(
        result.zone1Arc + result.zone2Arc + result.zone3Arc,
        2
      );

      // Outside arc: 2 passes × 1570.796 / 250 (FCAW speed)
      expect(result.outsideArc).toBeCloseTo((2 * 1570.796) / 250, 2);

      // Fillet arc: 1 pass × 1570.796 / 250 (FCAW speed)
      expect(result.filletArc).toBeCloseTo((1 * 1570.796) / 250, 2);
    });

    it('handles Skip process with zero arc time', () => {
      const strategyWithSkip: ProcessStrategy = {
        ...processStrategy,
        proc2: 'Skip',
      };

      const passesWithSkip: PassResults = {
        ...passes,
        zone2Passes: 0,
      };

      const result = calculateAllArcTimes(
        passesWithSkip,
        circumference,
        strategyWithSkip,
        speeds
      );

      expect(result.zone2Arc).toBe(0);
    });
  });

  describe('calculateTotalTimes', () => {
    const arcTimes: ArcTimeResults = {
      zone1Arc: 60, // 1 hour in minutes
      zone2Arc: 30, // 0.5 hours
      zone3Arc: 30, // 0.5 hours
      insideArc: 120, // 2 hours
      outsideArc: 30, // 0.5 hours
      filletArc: 15, // 0.25 hours
    };

    it('calculates total times with operator factors', () => {
      const factors = { inside: 2.0, outside: 1.5 };
      const result = calculateTotalTimes(arcTimes, factors);

      // Inside: (120 min / 60) × 2.0 = 4 hours
      expect(result.insideTime).toBe(4);

      // Outside: (30 min / 60) × 1.5 = 0.75 hours
      expect(result.outsideTime).toBe(0.75);

      // Fillet: (15 min / 60) × 1.5 = 0.375 hours
      expect(result.filletTime).toBe(0.375);

      // Total: 4 + 0.75 + 0.375 = 5.125 hours
      expect(result.totalTime).toBeCloseTo(5.125, 3);
    });

    it('applies correct factors for different positions', () => {
      const factors = { inside: 3.0, outside: 2.0 };
      const result = calculateTotalTimes(arcTimes, factors);

      // Inside uses inside factor
      expect(result.insideTime).toBe((120 / 60) * 3.0);

      // Outside and fillet use outside factor
      expect(result.outsideTime).toBe((30 / 60) * 2.0);
      expect(result.filletTime).toBe((15 / 60) * 2.0);
    });
  });
});




