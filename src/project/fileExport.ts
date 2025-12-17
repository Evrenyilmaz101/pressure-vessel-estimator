import type { VesselProject } from './types';
import type { SharedSettings } from '../shared/types';
import { getProjects, saveProject, saveSettings } from './storage';

/**
 * Full export format including all projects and settings
 */
export interface ExportData {
  version: string;
  exportedAt: string;
  settings: SharedSettings;
  projects: VesselProject[];
}

/**
 * Export all data to JSON file
 */
export function exportAllToJSON(settings: SharedSettings): void {
  const projects = getProjects();
  
  const data: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings,
    projects,
  };

  downloadJSON(data, `vessel-estimator-backup-${formatDate(new Date())}.json`);
}

/**
 * Export single project to JSON file
 */
export function exportProjectToJSON(project: VesselProject): void {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    project,
  };

  const filename = project.jobNumber 
    ? `${project.jobNumber}-${formatDate(new Date())}.json`
    : `project-${project.id}-${formatDate(new Date())}.json`;

  downloadJSON(data, filename);
}

/**
 * Import data from JSON file
 * Returns imported projects and settings
 */
export async function importFromJSON(file: File): Promise<{
  projects: VesselProject[];
  settings?: SharedSettings;
  message: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Check if it's a full backup or single project
        if (data.projects && Array.isArray(data.projects)) {
          // Full backup
          resolve({
            projects: data.projects,
            settings: data.settings,
            message: `Imported ${data.projects.length} project(s)`,
          });
        } else if (data.project) {
          // Single project
          resolve({
            projects: [data.project],
            message: `Imported project: ${data.project.jobNumber || data.project.id}`,
          });
        } else {
          reject(new Error('Invalid file format'));
        }
      } catch (err) {
        reject(new Error('Failed to parse JSON file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Merge imported projects with existing (avoids duplicates by ID)
 */
export function mergeImportedProjects(
  imported: VesselProject[],
  importSettings?: SharedSettings
): { projectsAdded: number; projectsUpdated: number } {
  const existing = getProjects();
  const existingIds = new Set(existing.map(p => p.id));
  
  let added = 0;
  let updated = 0;

  for (const project of imported) {
    if (existingIds.has(project.id)) {
      // Update existing
      saveProject(project);
      updated++;
    } else {
      // Add new
      saveProject(project);
      added++;
    }
  }

  if (importSettings) {
    saveSettings(importSettings);
  }

  return { projectsAdded: added, projectsUpdated: updated };
}

// Helpers
function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}




