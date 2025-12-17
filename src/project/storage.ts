import type { VesselProject } from './types';
import type { SharedSettings } from '../shared/types';

const PROJECTS_KEY = 'vessel-estimator-projects';
const SETTINGS_KEY = 'vessel-estimator-settings';

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Get all saved projects
 */
export function getProjects(): VesselProject[] {
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Get a single project by ID
 */
export function getProject(id: string): VesselProject | null {
  const projects = getProjects();
  return projects.find(p => p.id === id) || null;
}

/**
 * Save a project (creates new or updates existing)
 */
export function saveProject(project: VesselProject): VesselProject {
  const projects = getProjects();
  const now = new Date().toISOString();
  
  const index = projects.findIndex(p => p.id === project.id);
  const updated: VesselProject = {
    ...project,
    modifiedAt: now,
    createdAt: project.createdAt || now,
  };
  
  if (index >= 0) {
    projects[index] = updated;
  } else {
    projects.push(updated);
  }
  
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return updated;
}

/**
 * Delete a project
 */
export function deleteProject(id: string): void {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

/**
 * Save shared settings
 */
export function saveSettings(settings: SharedSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Load shared settings
 */
export function loadSettings(): SharedSettings | null {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Create a new empty project
 */
export function createEmptyProject(): VesselProject {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    jobNumber: '',
    vesselName: '',
    description: '',
    createdAt: now,
    modifiedAt: now,
    modules: {},
    summaries: {
      nozzles: null,
      longwelds: null,
      circwelds: null,
      pipejoints: null,
      internals: null,
      externals: null,
      offer: null,
    },
  };
}


