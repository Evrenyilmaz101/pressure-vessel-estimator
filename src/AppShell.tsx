import { useState, useRef } from 'react';
import { useProject, MODULES, type ModuleId, exportAllToJSON, exportProjectToJSON, importFromJSON, mergeImportedProjects } from './project';
import { SummaryModule } from './modules/summary';
import { PlaceholderModule } from './modules/placeholder';
import { NozzlesModule } from './modules/nozzles';
import { LongWeldsModule } from './modules/longwelds';
import { CircWeldsModule } from './modules/circwelds';
import './AppShell.css';

type ViewType = 'summary' | ModuleId | 'settings';

export function AppShell() {
  const {
    currentProject,
    savedProjects,
    hasUnsavedChanges,
    settings,
    save,
    newProject,
    loadProject,
    deleteProjectById,
    updateJobNumber,
    updateVesselName,
    updateSettings,
    saveCurrentSettings,
    refreshProjects,
  } = useProject();

  const [activeView, setActiveView] = useState<ViewType>('nozzles');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showJobEdit, setShowJobEdit] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importFromJSON(file);
      const { projectsAdded, projectsUpdated } = mergeImportedProjects(result.projects, result.settings);
      
      setImportMessage(`✓ ${result.message} (${projectsAdded} added, ${projectsUpdated} updated)`);
      refreshProjects();
      
      // Clear message after 3 seconds
      setTimeout(() => setImportMessage(null), 3000);
    } catch (err) {
      setImportMessage(`✗ ${err instanceof Error ? err.message : 'Import failed'}`);
      setTimeout(() => setImportMessage(null), 3000);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Export all projects
  const handleExportAll = () => {
    exportAllToJSON(settings);
    setShowProjectMenu(false);
  };

  // Export current project
  const handleExportCurrent = () => {
    if (currentProject) {
      exportProjectToJSON(currentProject);
      setShowProjectMenu(false);
    }
  };

  const renderModule = () => {
    if (activeView === 'summary') {
      return <SummaryModule />;
    }
    
    if (activeView === 'settings') {
      return (
        <SettingsPanel 
          settings={settings} 
          onUpdate={updateSettings}
          onSave={saveCurrentSettings}
        />
      );
    }

    // Find the module info
    const moduleInfo = MODULES.find(m => m.id === activeView);
    
    if (activeView === 'nozzles') {
      return <NozzlesModule />;
    }

    if (activeView === 'longwelds') {
      return <LongWeldsModule />;
    }

    if (activeView === 'circwelds') {
      return <CircWeldsModule />;
    }

    // Placeholder for other modules
    if (moduleInfo) {
      return <PlaceholderModule module={moduleInfo} />;
    }

    return null;
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <h1>🏭 Pressure Vessel Estimator</h1>
        </div>

        <div className="header-right">
          <button className="btn-save" onClick={save}>
            💾 Save
            {hasUnsavedChanges && <span className="unsaved-dot">●</span>}
          </button>
          
          <div className="project-menu-wrapper">
            <button 
              className="btn-projects" 
              onClick={() => setShowProjectMenu(!showProjectMenu)}
            >
              📁 Projects ▾
            </button>
            
            {showProjectMenu && (
              <div className="project-dropdown">
                <button className="dropdown-item new" onClick={() => { newProject(); setShowProjectMenu(false); }}>
                  + New Project
                </button>
                <div className="dropdown-divider" />
                
                {/* Export/Import Section */}
                <div className="dropdown-section-label">File Operations</div>
                <button className="dropdown-item" onClick={handleExportCurrent} disabled={!currentProject}>
                  📤 Export Current Project
                </button>
                <button className="dropdown-item" onClick={handleExportAll}>
                  📦 Export All (Backup)
                </button>
                <button className="dropdown-item" onClick={() => fileInputRef.current?.click()}>
                  📥 Import from File...
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
                
                <div className="dropdown-divider" />
                <div className="dropdown-section-label">Saved Projects</div>
                {savedProjects.length === 0 ? (
                  <div className="dropdown-empty">No saved projects</div>
                ) : (
                  savedProjects.map(project => (
                    <div 
                      key={project.id} 
                      className={`dropdown-item project ${project.id === currentProject?.id ? 'active' : ''}`}
                    >
                      <div 
                        className="project-details"
                        onClick={() => { loadProject(project.id); setShowProjectMenu(false); }}
                      >
                        <strong>{project.jobNumber || '(No job #)'}</strong>
                        <span>{project.vesselName || 'Untitled'}</span>
                        <small>{new Date(project.modifiedAt).toLocaleDateString()}</small>
                      </div>
                      <button 
                        className="btn-delete-project"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (confirm(`Delete project "${project.jobNumber || project.vesselName || 'Untitled'}"?`)) {
                            deleteProjectById(project.id);
                          }
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="job-info-bar">
        <div className="job-display">
          <span className="job-label">JOB:</span>
          <span className="job-value">{currentProject?.jobNumber || '—'}</span>
        </div>
        <div className="job-display vessel">
          <span className="job-label">DESCRIPTION:</span>
          <span className="job-value">{currentProject?.vesselName || 'Untitled'}</span>
        </div>
        <button className="btn-edit-job" onClick={() => setShowJobEdit(true)}>✏️ Edit</button>
        {hasUnsavedChanges && <span className="unsaved-indicator">● Unsaved</span>}
      </div>

      {showJobEdit && (
        <div className="job-edit-modal">
          <div className="job-edit-content">
            <h3>Project Details</h3>
            <div className="edit-field">
              <label>Job Number</label>
              <input
                type="text"
                value={currentProject?.jobNumber || ''}
                onChange={(e) => updateJobNumber(e.target.value)}
                placeholder="Enter job number"
                autoFocus
              />
            </div>
            <div className="edit-field">
              <label>Description</label>
              <input
                type="text"
                value={currentProject?.vesselName || ''}
                onChange={(e) => updateVesselName(e.target.value)}
                placeholder="Enter description"
              />
            </div>
            <button className="btn-close-edit" onClick={() => setShowJobEdit(false)}>Done</button>
          </div>
        </div>
      )}

      <nav className="module-nav">
        <button 
          className={`nav-item summary ${activeView === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveView('summary')}
        >
          📊 Summary
        </button>
        
        {MODULES.map(mod => (
          <button
            key={mod.id}
            className={`nav-item ${activeView === mod.id ? 'active' : ''}`}
            onClick={() => setActiveView(mod.id)}
          >
            {mod.icon} {mod.name}
          </button>
        ))}

        <button 
          className={`nav-item settings ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveView('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>

      {importMessage && (
        <div className={`import-toast ${importMessage.startsWith('✓') ? 'success' : 'error'}`}>
          {importMessage}
        </div>
      )}

      <main className="module-content">
        {renderModule()}
      </main>
    </div>
  );
}

// Settings Panel Component
import type { SharedSettings, BeadSizes, TravelSpeedsByThickness, OperatorFactorsByThickness } from './shared/types';
import { NumberInput } from './shared/components';

const PROCESSES = ['GTAW', 'SMAW', 'FCAW', 'GMAW', 'SAW'] as const;

interface SettingsPanelProps {
  settings: SharedSettings;
  onUpdate: (settings: SharedSettings) => void;
  onSave: () => void;
}

function SettingsPanel({ settings, onUpdate, onSave }: SettingsPanelProps) {
  const updateBeadSize = (proc: keyof BeadSizes, field: 'h' | 'w', value: number) => {
    onUpdate({
      ...settings,
      beadSizes: {
        ...settings.beadSizes,
        [proc]: { ...settings.beadSizes[proc], [field]: value }
      }
    });
  };

  const updateTravelSpeed = (range: keyof TravelSpeedsByThickness, proc: string, value: number) => {
    onUpdate({
      ...settings,
      travelSpeeds: {
        ...settings.travelSpeeds,
        [range]: { ...settings.travelSpeeds[range], [proc]: value }
      }
    });
  };

  const updateOpFactor = (range: keyof OperatorFactorsByThickness, field: 'inside' | 'outside', value: number) => {
    onUpdate({
      ...settings,
      operatorFactors: {
        ...settings.operatorFactors,
        [range]: { ...settings.operatorFactors[range], [field]: value }
      }
    });
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>⚙️ Shared Settings</h2>
        <p>These settings apply to all modules and calculations.</p>
        <button className="btn-save" onClick={onSave}>💾 Save Settings</button>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>🔧 Bead Sizes (mm)</h3>
          <div className="settings-table">
            <div className="table-header">
              <span>Process</span>
              <span>Height</span>
              <span>Width</span>
            </div>
            {PROCESSES.map(proc => (
              <div key={proc} className="table-row">
                <span className="process-tag" data-process={proc}>{proc}</span>
                <NumberInput 
                  value={settings.beadSizes[proc].h} 
                  step={0.1}
                  onChange={(v) => updateBeadSize(proc, 'h', v)} 
                />
                <NumberInput 
                  value={settings.beadSizes[proc].w} 
                  step={0.1}
                  onChange={(v) => updateBeadSize(proc, 'w', v)} 
                />
              </div>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <h3>⚡ Travel Speeds (mm/min)</h3>
          <div className="settings-table">
            <div className="table-header">
              <span>Process</span>
              <span>&lt;20mm</span>
              <span>20-40mm</span>
              <span>&gt;40mm</span>
            </div>
            {PROCESSES.map(proc => (
              <div key={proc} className="table-row">
                <span className="process-tag" data-process={proc}>{proc}</span>
                <NumberInput value={settings.travelSpeeds.thin[proc]} step={5} onChange={(v) => updateTravelSpeed('thin', proc, v)} />
                <NumberInput value={settings.travelSpeeds.medium[proc]} step={5} onChange={(v) => updateTravelSpeed('medium', proc, v)} />
                <NumberInput value={settings.travelSpeeds.thick[proc]} step={5} onChange={(v) => updateTravelSpeed('thick', proc, v)} />
              </div>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <h3>👷 Operator Factors</h3>
          <p className="card-desc">Time multiplier for setup, repositioning, etc.</p>
          <div className="settings-table">
            <div className="table-header">
              <span>Thickness</span>
              <span>Inside</span>
              <span>Outside</span>
            </div>
            {[
              { key: 'range1' as const, label: '<12mm' },
              { key: 'range2' as const, label: '12-18mm' },
              { key: 'range3' as const, label: '18-25mm' },
              { key: 'range4' as const, label: '25-35mm' },
              { key: 'range5' as const, label: '35-50mm' },
              { key: 'range6' as const, label: '>50mm' },
            ].map(({ key, label }) => (
              <div key={key} className="table-row">
                <span>{label}</span>
                <NumberInput value={settings.operatorFactors[key].inside} step={0.1} onChange={(v) => updateOpFactor(key, 'inside', v)} />
                <NumberInput value={settings.operatorFactors[key].outside} step={0.1} onChange={(v) => updateOpFactor(key, 'outside', v)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

