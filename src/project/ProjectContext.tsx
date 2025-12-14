import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { VesselProject, ModuleId, ProjectState } from './types';
import type { SharedSettings, ModuleSummary } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/settings';
import { getProjects, saveProject, deleteProject, loadSettings, saveSettings, createEmptyProject } from './storage';

interface ProjectContextValue extends ProjectState {
  // Project actions
  newProject: () => void;
  loadProject: (id: string) => void;
  save: () => void;
  deleteCurrentProject: () => void;
  deleteProjectById: (id: string) => void;
  
  // Project data
  updateJobNumber: (value: string) => void;
  updateVesselName: (value: string) => void;
  updateDescription: (value: string) => void;
  
  // Module data
  getModuleData: <T>(moduleId: ModuleId) => T | undefined;
  setModuleData: <T>(moduleId: ModuleId, data: T) => void;
  updateModuleSummary: (moduleId: ModuleId, summary: ModuleSummary) => void;
  
  // Settings
  updateSettings: (settings: SharedSettings) => void;
  saveCurrentSettings: () => void;
  
  // Navigation
  setActiveModule: (moduleId: ModuleId) => void;
  
  // Refresh projects list
  refreshProjects: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<VesselProject | null>(null);
  const [savedProjects, setSavedProjects] = useState<VesselProject[]>([]);
  const [settings, setSettings] = useState<SharedSettings>(DEFAULT_SETTINGS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>('nozzles');

  // Load saved data on mount
  useEffect(() => {
    setSavedProjects(getProjects());
    const savedSettings = loadSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
    // Start with a new empty project
    setCurrentProject(createEmptyProject());
  }, []);

  const refreshProjects = useCallback(() => {
    setSavedProjects(getProjects());
  }, []);

  const newProject = useCallback(() => {
    setCurrentProject(createEmptyProject());
    setHasUnsavedChanges(false);
  }, []);

  const loadProject = useCallback((id: string) => {
    const project = savedProjects.find(p => p.id === id);
    if (project) {
      setCurrentProject({ ...project });
      setHasUnsavedChanges(false);
    }
  }, [savedProjects]);

  const save = useCallback(() => {
    if (currentProject) {
      const saved = saveProject(currentProject);
      setCurrentProject(saved);
      setSavedProjects(getProjects());
      setHasUnsavedChanges(false);
    }
  }, [currentProject]);

  const deleteCurrentProject = useCallback(() => {
    if (currentProject && confirm('Delete this project permanently?')) {
      deleteProject(currentProject.id);
      setSavedProjects(getProjects());
      newProject();
    }
  }, [currentProject, newProject]);

  const deleteProjectById = useCallback((id: string) => {
    deleteProject(id);
    setSavedProjects(getProjects());
    // If we deleted the current project, create a new one
    if (currentProject?.id === id) {
      newProject();
    }
  }, [currentProject, newProject]);

  const updateJobNumber = useCallback((value: string) => {
    setCurrentProject(prev => {
      if (!prev || prev.jobNumber === value) return prev;
      setHasUnsavedChanges(true);
      return { ...prev, jobNumber: value };
    });
  }, []);

  const updateVesselName = useCallback((value: string) => {
    setCurrentProject(prev => {
      if (!prev || prev.vesselName === value) return prev;
      setHasUnsavedChanges(true);
      return { ...prev, vesselName: value };
    });
  }, []);

  const updateDescription = useCallback((value: string) => {
    setCurrentProject(prev => {
      if (!prev || prev.description === value) return prev;
      setHasUnsavedChanges(true);
      return { ...prev, description: value };
    });
  }, []);

  const getModuleData = useCallback(<T,>(moduleId: ModuleId): T | undefined => {
    return currentProject?.modules[moduleId] as T | undefined;
  }, [currentProject]);

  const setModuleData = useCallback(<T,>(moduleId: ModuleId, data: T) => {
    setCurrentProject(prev => {
      if (!prev) return prev;
      
      // Check if data actually changed to avoid false "unsaved" flags
      const currentData = prev.modules[moduleId];
      const dataString = JSON.stringify(data);
      const currentString = JSON.stringify(currentData);
      
      if (dataString === currentString) {
        return prev; // No change, don't update state or mark unsaved
      }
      
      // Data has changed - mark as unsaved
      setHasUnsavedChanges(true);
      
      return {
        ...prev,
        modules: { ...prev.modules, [moduleId]: data },
      };
    });
  }, []);

  const updateModuleSummary = useCallback((moduleId: ModuleId, summary: ModuleSummary) => {
    setCurrentProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        summaries: { ...prev.summaries, [moduleId]: summary },
      };
    });
  }, []);

  const updateSettings = useCallback((newSettings: SharedSettings) => {
    setSettings(newSettings);
  }, []);

  const saveCurrentSettings = useCallback(() => {
    saveSettings(settings);
  }, [settings]);

  const value: ProjectContextValue = {
    currentProject,
    savedProjects,
    settings,
    hasUnsavedChanges,
    activeModule,
    newProject,
    loadProject,
    save,
    deleteCurrentProject,
    deleteProjectById,
    updateJobNumber,
    updateVesselName,
    updateDescription,
    getModuleData,
    setModuleData,
    updateModuleSummary,
    updateSettings,
    saveCurrentSettings,
    setActiveModule,
    refreshProjects,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

