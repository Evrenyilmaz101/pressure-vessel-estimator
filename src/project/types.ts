import type { SharedSettings, ModuleSummary } from '../shared/types';

/**
 * Module identifiers
 */
export type ModuleId = 'nozzles' | 'longwelds' | 'circwelds' | 'pipejoints' | 'internals' | 'externals' | 'offer';

/**
 * Module metadata
 */
export interface ModuleInfo {
  id: ModuleId;
  name: string;
  description: string;
}

/**
 * All available modules
 */
export const MODULES: ModuleInfo[] = [
  { id: 'nozzles', name: 'Nozzles', description: 'Nozzle-to-shell welds' },
  { id: 'longwelds', name: 'Long Welds', description: 'Longitudinal seam welds' },
  { id: 'circwelds', name: 'Circ Welds', description: 'Circumferential welds' },
  { id: 'pipejoints', name: 'Pipe Joints', description: 'Pipe butt weld joints' },
  { id: 'internals', name: 'Internals', description: 'Internal attachments' },
  { id: 'externals', name: 'Externals', description: 'External attachments' },
  { id: 'offer', name: 'Offer Sheet', description: 'Generate scope of works' },
];

/**
 * Vessel project - contains all module data
 */
export interface VesselProject {
  id: string;
  jobNumber: string;
  vesselName: string;
  description: string;
  createdAt: string;
  modifiedAt: string;
  
  // Module data - each module stores its own data structure
  modules: {
    nozzles?: unknown;      // NozzleItem[]
    longwelds?: unknown;    // LongWeldItem[]
    circwelds?: unknown;    // CircWeldItem[]
    pipejoints?: unknown;   // PipeJointItem[]
    internals?: unknown;    // InternalItem[]
    externals?: unknown;    // ExternalItem[]
    offer?: unknown;        // OfferData
  };
  
  // Cached summaries for quick display
  summaries: Record<ModuleId, ModuleSummary | null>;
}

/**
 * Project context state
 */
export interface ProjectState {
  currentProject: VesselProject | null;
  savedProjects: VesselProject[];
  settings: SharedSettings;
  hasUnsavedChanges: boolean;
  activeModule: ModuleId;
}


