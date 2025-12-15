import type { SharedSettings, ModuleSummary } from '../shared/types';

/**
 * Module identifiers
 */
export type ModuleId = 'nozzles' | 'longwelds' | 'circwelds' | 'pipejoints' | 'internals' | 'externals';

/**
 * Module metadata
 */
export interface ModuleInfo {
  id: ModuleId;
  name: string;
  icon: string;
  description: string;
}

/**
 * All available modules
 */
export const MODULES: ModuleInfo[] = [
  { id: 'nozzles', name: 'Nozzles', icon: '🔩', description: 'Nozzle-to-shell welds' },
  { id: 'longwelds', name: 'Long Welds', icon: '📏', description: 'Longitudinal seam welds' },
  { id: 'circwelds', name: 'Circ Welds', icon: '⭕', description: 'Circumferential welds' },
  { id: 'pipejoints', name: 'Pipe Joints', icon: '🔗', description: 'Pipe butt weld joints' },
  { id: 'internals', name: 'Internals', icon: '📦', description: 'Internal attachments' },
  { id: 'externals', name: 'Externals', icon: '🔧', description: 'External attachments' },
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


