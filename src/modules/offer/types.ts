/**
 * Offer Sheet Module Types
 * 
 * Structures for generating a professional scope of works document
 * that auto-populates from estimate data.
 */

export interface OfferProjectDetails {
  projectName: string;
  client: string;
  attention: string;
  ourReference: string;
  revision: string;
  date: string;
}

export interface OfferEquipmentItem {
  tag: string;
  description: string;
  quantity: number;
  included: boolean;
}

export interface OfferEngineering {
  mechanicalDesign: boolean;
  thermalDesign: boolean;
  feaAnalysis: boolean;
  vibrationAnalysis: boolean;
  thirdPartyVerification: boolean;
  designRegistration: boolean;
  detailDrawings: boolean;
  siteSurvey: boolean;
}

export interface OfferQualityAssurance {
  qaMdcDocs: boolean;
  asmeUStamp: boolean;
  asmeU2Stamp: boolean;
  thirdPartyInspection: boolean;
}

export interface OfferDesignCodes {
  as1210: boolean;
  asmeVIIIDiv1: boolean;
  asmeVIIIDiv2: boolean;
  asmePVHO1: boolean;
  pd5500: boolean;
  temaClass: 'R' | 'C' | 'B' | 'none';
  otherCode: string;
}

export interface OfferMaterialItem {
  component: string;
  specification: string;
  origin: string;
  included: boolean;
}

export interface OfferMaterials {
  items: OfferMaterialItem[];
  certType: 'EN10204_3.1' | 'EN10204_3.2';
  countryExclusions: string[]; // e.g., ['China', 'India']
  freeIssue: boolean;
  freeIssueItems: string;
}

export interface OfferNDEItem {
  description: string;
  coverage: number; // 0, 10, 20, ... 100 (percentage)
}

export interface OfferNDE {
  // General
  visualExamination: OfferNDEItem;
  
  // Long Welds
  longWeldsUT: OfferNDEItem;
  longWeldsMPI: OfferNDEItem;
  
  // Circ Welds
  circWeldsUT: OfferNDEItem;
  circWeldsMPI: OfferNDEItem;
  
  // Nozzles
  nozzleFlangeRT: OfferNDEItem;
  nozzleShellUT: OfferNDEItem;
  nozzleShellMPI: OfferNDEItem;
  
  // Attachments
  liftingAttachmentsMPI: OfferNDEItem;
  externalAttachmentsMPI: OfferNDEItem;
  internalAttachmentsMPI: OfferNDEItem;
  
  // Other
  tubeWeldsDPI: OfferNDEItem;
}

export interface OfferHeatTreatment {
  pwhtShellside: boolean;
  pwhtTubeside: boolean;
  pwhtOther: string;
}

export interface OfferPressureTesting {
  hydroShellside: boolean;
  hydroTubeside: boolean;
  airTestShellside: boolean;
  airTestTubeside: boolean;
  testPressure: string;
  testMedium: string;
}

export interface OfferSurfaceProtection {
  blastStandard: string; // e.g., 'AS1627.4 class 2.5'
  blastMedia: 'Garnet' | 'Grit' | 'Shot' | 'Other';
  paintSpec: string;
  internalProtection: string;
}

export interface OfferTransport {
  includedInPrice: boolean;
  vesselSaddles: boolean;
  timberSupports: boolean;
  tarpaulin: boolean;
  dimensions: string;
  weight: string;
  destination: string;
}

export interface OfferMilestones {
  milestones: OfferMilestoneItem[];
  paymentTerms: '30 days' | '60 days' | 'Other';
  paymentTermsOther: string;
}

export interface OfferMilestoneItem {
  description: string;
  percentage: number;
  included: boolean;
}

export interface OfferWarranty {
  standard: '18/12' | '24/18' | 'Other';
  customTerms: string;
}

export interface OfferValidity {
  days: number;
  budgetOnly: boolean;
  exchangeRateNote: string;
}

export interface OfferNote {
  id: string;
  category: 'offer' | 'project' | 'standard';
  text: string;
  included: boolean;
}

export interface OfferPricingItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  included: boolean;
}

export interface OfferPricing {
  items: OfferPricingItem[];
  discount: number;
  discountDescription: string;
  subtotal: number;
  total: number;
  currency: 'AUD' | 'USD' | 'EUR';
  leadTime: string;
}

// Main offer data structure
export interface OfferData {
  projectDetails: OfferProjectDetails;
  equipment: OfferEquipmentItem[];
  engineering: OfferEngineering;
  qualityAssurance: OfferQualityAssurance;
  designCodes: OfferDesignCodes;
  materials: OfferMaterials;
  nde: OfferNDE;
  heatTreatment: OfferHeatTreatment;
  pressureTesting: OfferPressureTesting;
  surfaceProtection: OfferSurfaceProtection;
  transport: OfferTransport;
  milestones: OfferMilestones;
  warranty: OfferWarranty;
  validity: OfferValidity;
  notes: OfferNote[];
  pricing: OfferPricing;
}

// Module data stored in project
export interface OfferModuleData {
  offer: OfferData;
}

// Default values
export const DEFAULT_PROJECT_DETAILS: OfferProjectDetails = {
  projectName: '',
  client: '',
  attention: '',
  ourReference: '',
  revision: '0',
  date: new Date().toISOString().split('T')[0],
};

export const DEFAULT_ENGINEERING: OfferEngineering = {
  mechanicalDesign: true,
  thermalDesign: false,
  feaAnalysis: false,
  vibrationAnalysis: false,
  thirdPartyVerification: false,
  designRegistration: true,
  detailDrawings: true,
  siteSurvey: false,
};

export const DEFAULT_QA: OfferQualityAssurance = {
  qaMdcDocs: true,
  asmeUStamp: false,
  asmeU2Stamp: false,
  thirdPartyInspection: false,
};

export const DEFAULT_DESIGN_CODES: OfferDesignCodes = {
  as1210: true,
  asmeVIIIDiv1: false,
  asmeVIIIDiv2: false,
  asmePVHO1: false,
  pd5500: false,
  temaClass: 'none',
  otherCode: '',
};

export const DEFAULT_NDE_ITEM: OfferNDEItem = {
  description: '',
  coverage: 0,
};

export const DEFAULT_NDE: OfferNDE = {
  // General
  visualExamination: { description: 'Visual examination', coverage: 100 },
  
  // Long Welds
  longWeldsUT: { description: 'UT of long welds', coverage: 100 },
  longWeldsMPI: { description: 'MPI/DPI of long welds', coverage: 100 },
  
  // Circ Welds
  circWeldsUT: { description: 'UT of circ welds', coverage: 100 },
  circWeldsMPI: { description: 'MPI/DPI of circ welds', coverage: 100 },
  
  // Nozzles
  nozzleFlangeRT: { description: 'RT nozzle flange to neck welds', coverage: 100 },
  nozzleShellUT: { description: 'UT nozzle to shell welds', coverage: 100 },
  nozzleShellMPI: { description: 'MPI/DPI nozzle to shell welds', coverage: 100 },
  
  // Attachments
  liftingAttachmentsMPI: { description: 'MPI/DPI lifting attachments', coverage: 100 },
  externalAttachmentsMPI: { description: 'MPI/DPI external attachments', coverage: 100 },
  internalAttachmentsMPI: { description: 'MPI/DPI internal attachments', coverage: 100 },
  
  // Other
  tubeWeldsDPI: { description: 'DPI of tube welds', coverage: 0 },
};

export const DEFAULT_HEAT_TREATMENT: OfferHeatTreatment = {
  pwhtShellside: false,
  pwhtTubeside: false,
  pwhtOther: '',
};

export const DEFAULT_PRESSURE_TESTING: OfferPressureTesting = {
  hydroShellside: true,
  hydroTubeside: false,
  airTestShellside: false,
  airTestTubeside: false,
  testPressure: '',
  testMedium: 'Water',
};

export const DEFAULT_SURFACE_PROTECTION: OfferSurfaceProtection = {
  blastStandard: 'AS1627.4 class 2.5',
  blastMedia: 'Garnet',
  paintSpec: '1 coat IOZ Primer to 75um DFT & 1 coat Epoxy to 125um DFT',
  internalProtection: '',
};

export const DEFAULT_TRANSPORT: OfferTransport = {
  includedInPrice: true,
  vesselSaddles: true,
  timberSupports: true,
  tarpaulin: true,
  dimensions: '',
  weight: '',
  destination: '',
};

export const DEFAULT_MILESTONES: OfferMilestones = {
  milestones: [
    { description: 'Order acceptance / Purchase order', percentage: 10, included: true },
    { description: 'Submission of ITP & GA Drawing', percentage: 10, included: true },
    { description: 'Material on site', percentage: 30, included: true },
    { description: 'Successful completion of hydrotest', percentage: 40, included: true },
    { description: 'Delivery & MDR', percentage: 10, included: true },
  ],
  paymentTerms: '30 days',
  paymentTermsOther: '',
};

export const DEFAULT_WARRANTY: OfferWarranty = {
  standard: '18/12',
  customTerms: '',
};

export const DEFAULT_VALIDITY: OfferValidity = {
  days: 30,
  budgetOnly: false,
  exchangeRateNote: '',
};

export const DEFAULT_MATERIALS: OfferMaterials = {
  items: [],
  certType: 'EN10204_3.1',
  countryExclusions: ['China'],
  freeIssue: false,
  freeIssueItems: '',
};

export const DEFAULT_PRICING: OfferPricing = {
  items: [],
  discount: 0,
  discountDescription: '',
  subtotal: 0,
  total: 0,
  currency: 'AUD',
  leadTime: '',
};

// Standard notes library
export const STANDARD_NOTES: OfferNote[] = [
  // Offer notes
  { id: 'offer-1', category: 'offer', text: 'Our offer is based on standard shift hours.', included: false },
  { id: 'offer-2', category: 'offer', text: 'Our offer is based on like for like replacement.', included: false },
  { id: 'offer-3', category: 'offer', text: 'Nozzle projections above 300mm will incur additional charges.', included: false },
  
  // Project notes
  { id: 'project-1', category: 'project', text: 'Production Test Coupons included per each welding procedure tendered.', included: false },
  { id: 'project-2', category: 'project', text: 'Sour service requirements have not been considered in this offer.', included: false },
  
  // Standard notes
  { id: 'standard-1', category: 'standard', text: 'The program is subject to confirmation at the time of order.', included: true },
  { id: 'standard-2', category: 'standard', text: 'This quotation is not an acceptance of any contractual terms or specifications that may have been supplied as a part of the invitation to tender documentation.', included: true },
  { id: 'standard-3', category: 'standard', text: 'No retention, security, liquidated/consequential damages are to be withheld on payments.', included: true },
  { id: 'standard-4', category: 'standard', text: 'If stock materials form the basis of our offer, pricing & project lead time may be impacted if sold prior to order placement.', included: true },
];

export function createDefaultOfferData(): OfferData {
  return {
    projectDetails: { ...DEFAULT_PROJECT_DETAILS },
    equipment: [],
    engineering: { ...DEFAULT_ENGINEERING },
    qualityAssurance: { ...DEFAULT_QA },
    designCodes: { ...DEFAULT_DESIGN_CODES },
    materials: { ...DEFAULT_MATERIALS },
    nde: { ...DEFAULT_NDE },
    heatTreatment: { ...DEFAULT_HEAT_TREATMENT },
    pressureTesting: { ...DEFAULT_PRESSURE_TESTING },
    surfaceProtection: { ...DEFAULT_SURFACE_PROTECTION },
    transport: { ...DEFAULT_TRANSPORT },
    milestones: { ...DEFAULT_MILESTONES },
    warranty: { ...DEFAULT_WARRANTY },
    validity: { ...DEFAULT_VALIDITY },
    notes: STANDARD_NOTES.map(n => ({ ...n })),
    pricing: { ...DEFAULT_PRICING },
  };
}

