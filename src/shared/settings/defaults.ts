import type { BeadSizes, TravelSpeedsByThickness, OperatorFactorsByThickness, SharedSettings } from '../types';

export const DEFAULT_BEAD_SIZES: BeadSizes = {
  GTAW: { h: 2.5, w: 6 },
  SMAW: { h: 3, w: 8 },
  FCAW: { h: 3.5, w: 10 },
  GMAW: { h: 3, w: 9 },
  SAW: { h: 4, w: 12 },
};

export const DEFAULT_TRAVEL_SPEEDS: TravelSpeedsByThickness = {
  thin: { GTAW: 80, SMAW: 120, FCAW: 200, GMAW: 250, SAW: 400 },
  medium: { GTAW: 70, SMAW: 100, FCAW: 180, GMAW: 220, SAW: 350 },
  thick: { GTAW: 60, SMAW: 90, FCAW: 160, GMAW: 200, SAW: 300 },
};

export const DEFAULT_OPERATOR_FACTORS: OperatorFactorsByThickness = {
  range1: { inside: 1.3, outside: 1.2 },
  range2: { inside: 1.4, outside: 1.3 },
  range3: { inside: 1.5, outside: 1.4 },
  range4: { inside: 1.6, outside: 1.5 },
  range5: { inside: 1.7, outside: 1.6 },
  range6: { inside: 1.8, outside: 1.7 },
};

export const DEFAULT_SETTINGS: SharedSettings = {
  beadSizes: DEFAULT_BEAD_SIZES,
  travelSpeeds: DEFAULT_TRAVEL_SPEEDS,
  operatorFactors: DEFAULT_OPERATOR_FACTORS,
};




