import { useState, useRef } from 'react';
import { useProject, MODULES, type ModuleId, exportAllToJSON, exportProjectToJSON, importFromJSON, mergeImportedProjects } from './project';
import { SummaryModule } from './modules/summary';
import { PlaceholderModule } from './modules/placeholder';
import { NozzlesModule } from './modules/nozzles';
import { LongWeldsModule } from './modules/longwelds';
import { CircWeldsModule } from './modules/circwelds';
import { PipeJointsModule } from './modules/pipejoints';
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

    if (activeView === 'pipejoints') {
      return <PipeJointsModule />;
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
import type { SharedSettings, BeadSizes, TravelSpeedsByThickness, OperatorFactorsByThickness, WeldProcess } from './shared/types';
import { NumberInput } from './shared/components';
import type { PipeJointPreset, PipeJointSettings } from './modules/pipejoints/types';
import { DEFAULT_PIPE_JOINT_PRESET } from './modules/pipejoints/types';
import { getAllNPSSizes, getSchedulesForNPS, getPipeDimensions } from './modules/pipejoints/pipeData';

const PROCESSES = ['GTAW', 'SMAW', 'FCAW', 'GMAW', 'SAW'] as const;

type SettingsTab = 'general' | 'pipejoints';

interface SettingsPanelProps {
  settings: SharedSettings;
  onUpdate: (settings: SharedSettings) => void;
  onSave: () => void;
}

function SettingsPanel({ settings, onUpdate, onSave }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

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
        <h2>⚙️ Settings</h2>
        <div className="settings-tabs">
          <button 
            className={activeTab === 'general' ? 'active' : ''} 
            onClick={() => setActiveTab('general')}
          >
            General Settings
          </button>
          <button 
            className={activeTab === 'pipejoints' ? 'active' : ''} 
            onClick={() => setActiveTab('pipejoints')}
          >
            🔗 Pipe Joint Settings
          </button>
        </div>
        <button className="btn-save" onClick={onSave}>💾 Save Settings</button>
      </div>

      {activeTab === 'general' && (
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
      )}

      {activeTab === 'pipejoints' && (
        <PipeJointSettingsPanel />
      )}
    </div>
  );
}

// Pipe Joint Settings Panel - Admin configuration for pipe sizes
function PipeJointSettingsPanel() {
  // Load settings from localStorage
  const [pipeSettings, setPipeSettings] = useState<PipeJointSettings>(() => {
    try {
      const stored = localStorage.getItem('pipeJointSettings');
      return stored ? JSON.parse(stored) : { presets: [] };
    } catch {
      return { presets: [] };
    }
  });

  const [selectedNPS, setSelectedNPS] = useState<string>('2"');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('SCH 40');
  const [editingPreset, setEditingPreset] = useState<PipeJointPreset | null>(null);

  const allNPSSizes = getAllNPSSizes();
  const availableSchedules = getSchedulesForNPS(selectedNPS);

  // Get or create preset for selected pipe
  const getPreset = (nps: string, schedule: string): PipeJointPreset | null => {
    const existing = pipeSettings.presets.find(p => p.nps === nps && p.schedule === schedule);
    if (existing) return existing;
    
    const dims = getPipeDimensions(nps, schedule);
    if (!dims) return null;
    
    return {
      nps,
      schedule,
      od: dims.od,
      wallThickness: dims.wallThickness,
      ...DEFAULT_PIPE_JOINT_PRESET,
    };
  };

  const currentPreset = getPreset(selectedNPS, selectedSchedule);
  const isConfigured = pipeSettings.presets.some(
    p => p.nps === selectedNPS && p.schedule === selectedSchedule
  );

  // Save preset
  const savePreset = (preset: PipeJointPreset) => {
    const newPresets = pipeSettings.presets.filter(
      p => !(p.nps === preset.nps && p.schedule === preset.schedule)
    );
    newPresets.push(preset);
    
    const newSettings = { presets: newPresets };
    setPipeSettings(newSettings);
    localStorage.setItem('pipeJointSettings', JSON.stringify(newSettings));
    setEditingPreset(null);
    
    // Dispatch storage event so other components update
    window.dispatchEvent(new Event('storage'));
  };

  // Delete preset
  const deletePreset = (nps: string, schedule: string) => {
    const newPresets = pipeSettings.presets.filter(
      p => !(p.nps === nps && p.schedule === schedule)
    );
    const newSettings = { presets: newPresets };
    setPipeSettings(newSettings);
    localStorage.setItem('pipeJointSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new Event('storage'));
  };

  // Start editing
  const startEdit = () => {
    if (currentPreset) {
      setEditingPreset({ ...currentPreset });
    }
  };

  // Update editing preset
  const updateEditingPreset = (field: keyof PipeJointPreset, value: number | string | boolean) => {
    if (!editingPreset) return;
    setEditingPreset({ ...editingPreset, [field]: value });
  };

  return (
    <div className="pipe-settings-panel">
      <div className="pipe-settings-intro">
        <h3>🔗 Pipe Joint Presets</h3>
        <p>Configure weld parameters for each pipe size. These become the default values when users select a pipe size.</p>
      </div>

      <div className="pipe-settings-layout">
        {/* Left: Pipe selector and configured list */}
        <div className="pipe-selector-section">
          <div className="pipe-selector">
            <h4>Select Pipe Size</h4>
            <div className="selector-row">
              <div className="selector-group">
                <label>NPS</label>
                <select 
                  value={selectedNPS} 
                  onChange={(e) => {
                    setSelectedNPS(e.target.value);
                    const schedules = getSchedulesForNPS(e.target.value);
                    if (!schedules.includes(selectedSchedule)) {
                      setSelectedSchedule(schedules[0]);
                    }
                    setEditingPreset(null);
                  }}
                >
                  {allNPSSizes.map(nps => (
                    <option key={nps} value={nps}>{nps}</option>
                  ))}
                </select>
              </div>
              <div className="selector-group">
                <label>Schedule</label>
                <select 
                  value={selectedSchedule} 
                  onChange={(e) => {
                    setSelectedSchedule(e.target.value);
                    setEditingPreset(null);
                  }}
                >
                  {availableSchedules.map(sch => (
                    <option key={sch} value={sch}>{sch}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {currentPreset && (
              <div className="pipe-dims-info">
                <span>OD: {currentPreset.od.toFixed(1)}mm</span>
                <span>Wall: {currentPreset.wallThickness.toFixed(2)}mm</span>
                <span className={isConfigured ? 'configured' : 'not-configured'}>
                  {isConfigured ? '✓ Configured' : '○ Not configured'}
                </span>
              </div>
            )}
          </div>

          <div className="configured-list">
            <h4>Configured Sizes ({pipeSettings.presets.length})</h4>
            <div className="configured-items">
              {pipeSettings.presets.length === 0 ? (
                <p className="empty-message">No pipe sizes configured yet. Select a size above and click "Configure".</p>
              ) : (
                pipeSettings.presets.map(preset => (
                  <div 
                    key={`${preset.nps}-${preset.schedule}`} 
                    className={`configured-item ${preset.nps === selectedNPS && preset.schedule === selectedSchedule ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedNPS(preset.nps);
                      setSelectedSchedule(preset.schedule);
                      setEditingPreset(null);
                    }}
                  >
                    <span className="item-size">{preset.nps} {preset.schedule}</span>
                    <span className="item-dims">{preset.od.toFixed(0)}×{preset.wallThickness.toFixed(1)}</span>
                    <button 
                      className="btn-delete-preset"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePreset(preset.nps, preset.schedule);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Configuration editor */}
        <div className="pipe-config-section">
          {editingPreset ? (
            <div className="preset-editor">
              <h4>Editing: {editingPreset.nps} {editingPreset.schedule}</h4>
              
              <div className="editor-section">
                <h5>Weld Geometry</h5>
                <div className="editor-row">
                  <div className="editor-field">
                    <label>Root Gap (mm)</label>
                    <NumberInput 
                      value={editingPreset.rootGap} 
                      step={0.5} 
                      min={0}
                      onChange={(v) => updateEditingPreset('rootGap', v)} 
                    />
                  </div>
                  <div className="editor-field">
                    <label>Root Face (mm)</label>
                    <NumberInput 
                      value={editingPreset.rootFace} 
                      step={0.5} 
                      min={0}
                      onChange={(v) => updateEditingPreset('rootFace', v)} 
                    />
                  </div>
                  <div className="editor-field">
                    <label>Bevel Angle (°)</label>
                    <NumberInput 
                      value={editingPreset.bevelAngle} 
                      step={2.5} 
                      min={0}
                      max={45}
                      onChange={(v) => updateEditingPreset('bevelAngle', v)} 
                    />
                  </div>
                </div>
              </div>

              <div className="editor-section">
                <h5>Weld Processes</h5>
                <div className="editor-row">
                  <div className="editor-field">
                    <label>Root Pass</label>
                    <select 
                      value={editingPreset.rootProcess} 
                      onChange={(e) => updateEditingPreset('rootProcess', e.target.value as WeldProcess)}
                    >
                      {PROCESSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="editor-field">
                    <label>Fill Passes</label>
                    <select 
                      value={editingPreset.fillProcess} 
                      onChange={(e) => updateEditingPreset('fillProcess', e.target.value as WeldProcess)}
                    >
                      {PROCESSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="editor-field">
                    <label>Cap Pass</label>
                    <select 
                      value={editingPreset.capProcess} 
                      onChange={(e) => updateEditingPreset('capProcess', e.target.value as WeldProcess)}
                    >
                      {PROCESSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="editor-section">
                <h5>Activity Times (hours per joint)</h5>
                <div className="editor-row">
                  <div className="editor-field">
                    <label>Fit-up Time</label>
                    <NumberInput 
                      value={editingPreset.fitUpTime} 
                      step={0.25} 
                      min={0}
                      onChange={(v) => updateEditingPreset('fitUpTime', v)} 
                    />
                  </div>
                  <div className="editor-field">
                    <label>Preheat Time</label>
                    <NumberInput 
                      value={editingPreset.preheatTime} 
                      step={0.25} 
                      min={0}
                      onChange={(v) => updateEditingPreset('preheatTime', v)} 
                    />
                  </div>
                  <div className="editor-field">
                    <label>NDE Time</label>
                    <NumberInput 
                      value={editingPreset.ndeTime} 
                      step={0.25} 
                      min={0}
                      onChange={(v) => updateEditingPreset('ndeTime', v)} 
                    />
                  </div>
                </div>
              </div>

              <div className="editor-section">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={editingPreset.enabled} 
                    onChange={(e) => updateEditingPreset('enabled', e.target.checked)}
                  />
                  Enabled (show in user dropdown)
                </label>
              </div>

              <div className="editor-actions">
                <button className="btn-cancel" onClick={() => setEditingPreset(null)}>Cancel</button>
                <button className="btn-save-preset" onClick={() => savePreset(editingPreset)}>Save Preset</button>
              </div>
            </div>
          ) : (
            <div className="preset-view">
              {currentPreset ? (
                <>
                  <h4>{selectedNPS} {selectedSchedule}</h4>
                  <div className="preset-details">
                    <div className="detail-group">
                      <h5>Pipe Dimensions</h5>
                      <div className="detail-row"><span>OD:</span><span>{currentPreset.od.toFixed(1)} mm</span></div>
                      <div className="detail-row"><span>Wall:</span><span>{currentPreset.wallThickness.toFixed(2)} mm</span></div>
                      <div className="detail-row"><span>Circumference:</span><span>{(Math.PI * currentPreset.od).toFixed(0)} mm</span></div>
                    </div>
                    <div className="detail-group">
                      <h5>Weld Geometry</h5>
                      <div className="detail-row"><span>Root Gap:</span><span>{currentPreset.rootGap} mm</span></div>
                      <div className="detail-row"><span>Root Face:</span><span>{currentPreset.rootFace} mm</span></div>
                      <div className="detail-row"><span>Bevel Angle:</span><span>{currentPreset.bevelAngle}°</span></div>
                    </div>
                    <div className="detail-group">
                      <h5>Processes</h5>
                      <div className="detail-row"><span>Root:</span><span>{currentPreset.rootProcess}</span></div>
                      <div className="detail-row"><span>Fill:</span><span>{currentPreset.fillProcess}</span></div>
                      <div className="detail-row"><span>Cap:</span><span>{currentPreset.capProcess}</span></div>
                    </div>
                    <div className="detail-group">
                      <h5>Activity Times</h5>
                      <div className="detail-row"><span>Fit-up:</span><span>{currentPreset.fitUpTime}h</span></div>
                      <div className="detail-row"><span>Preheat:</span><span>{currentPreset.preheatTime}h</span></div>
                      <div className="detail-row"><span>NDE:</span><span>{currentPreset.ndeTime}h</span></div>
                    </div>
                  </div>
                  <button className="btn-configure" onClick={startEdit}>
                    {isConfigured ? '✏️ Edit Configuration' : '+ Configure This Size'}
                  </button>
                </>
              ) : (
                <p>Select a valid pipe size to configure.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

