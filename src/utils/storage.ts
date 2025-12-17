import type { NozzleItem, BeadSizes, TravelSpeedsByThickness, OperatorFactorsByThickness } from '../types/weld.types';

const STORAGE_KEY = 'nozzle-estimator-projects';
const SETTINGS_KEY = 'nozzle-estimator-settings';

export interface SavedProject {
  id: string;
  jobNumber: string;
  description: string;
  nozzles: NozzleItem[];
  createdAt: string;
  modifiedAt: string;
}

export interface SavedSettings {
  beadSizes: BeadSizes;
  travelSpeeds: TravelSpeedsByThickness;
  operatorFactors: OperatorFactorsByThickness;
}

/**
 * Get all saved projects
 */
export function getProjects(): SavedProject[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Get a single project by ID
 */
export function getProject(id: string): SavedProject | null {
  const projects = getProjects();
  return projects.find(p => p.id === id) || null;
}

/**
 * Save a project (creates new or updates existing)
 */
export function saveProject(project: Omit<SavedProject, 'id' | 'createdAt' | 'modifiedAt'> & { id?: string }): SavedProject {
  const projects = getProjects();
  const now = new Date().toISOString();
  
  if (project.id) {
    // Update existing
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
      const updated: SavedProject = {
        ...projects[index],
        ...project,
        id: project.id,
        modifiedAt: now,
      };
      projects[index] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      return updated;
    }
  }
  
  // Create new
  const newProject: SavedProject = {
    id: generateId(),
    jobNumber: project.jobNumber,
    description: project.description,
    nozzles: project.nozzles,
    createdAt: now,
    modifiedAt: now,
  };
  projects.push(newProject);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return newProject;
}

/**
 * Delete a project
 */
export function deleteProject(id: string): void {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

/**
 * Save settings (shared across all projects)
 */
export function saveSettings(settings: SavedSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Load settings
 */
export function loadSettings(): SavedSettings | null {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}




