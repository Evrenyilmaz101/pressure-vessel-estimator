import { useState, useMemo, useCallback, useEffect } from 'react';
import type {
  GeometryInput,
  ProcessStrategy,
  BeadSizes,
  TravelSpeedsByThickness,
  OperatorFactorsByThickness,
  ZoneDistribution,
  WeldProcess,
  ActivityTimes,
  NozzleItem,
  ActivityCodeBreakdown,
} from './types/weld.types';
import {
  DEFAULT_GEOMETRY,
  DEFAULT_BEAD_SIZES,
  DEFAULT_TRAVEL_SPEEDS,
  DEFAULT_OPERATOR_FACTORS,
  DEFAULT_PROCESS_LAYERS,
  DEFAULT_ACTIVITY_TIMES,
} from './utils/constants';
import { calculateWeld } from './engine';
import { WeldDiagram } from './components/WeldDiagram';
import { NumberInput } from './components/NumberInput';
import { exportToCSV, calculateActivityCodes } from './utils/exportExcel';
import { getProjects, saveProject, deleteProject, loadSettings, saveSettings, type SavedProject } from './utils/storage';
import './App.css';

const PROCESSES: Exclude<WeldProcess, 'Skip'>[] = ['GTAW', 'SMAW', 'FCAW', 'GMAW', 'SAW'];

type TabType = 'nozzles' | 'editor' | 'summary' | 'settings';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function createNewNozzle(tag: string): NozzleItem {
  return {
    id: generateId(),
    tag,
    quantity: 1,
    geometry: { ...DEFAULT_GEOMETRY },
    insideLayers: [...DEFAULT_PROCESS_LAYERS],
    outsideProcess: 'FCAW',
    filletProcess: 'FCAW',
    activityTimes: { ...DEFAULT_ACTIVITY_TIMES },
  };
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('nozzles');
  const [jobNumber, setJobNumber] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  // Project management
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Nozzle list state
  const [nozzles, setNozzles] = useState<NozzleItem[]>([createNewNozzle('N1')]);
  const [selectedNozzleId, setSelectedNozzleId] = useState<string | null>(nozzles[0]?.id || null);

  // Settings state (shared across all nozzles)
  const [beadSizes, setBeadSizes] = useState<BeadSizes>(DEFAULT_BEAD_SIZES);
  const [travelSpeeds, setTravelSpeeds] = useState<TravelSpeedsByThickness>(DEFAULT_TRAVEL_SPEEDS);
  const [operatorFactors, setOperatorFactors] = useState<OperatorFactorsByThickness>(DEFAULT_OPERATOR_FACTORS);

  // Load saved projects and settings on mount
  useEffect(() => {
    setSavedProjects(getProjects());
    const settings = loadSettings();
    if (settings) {
      setBeadSizes(settings.beadSizes);
      setTravelSpeeds(settings.travelSpeeds);
      setOperatorFactors(settings.operatorFactors);
    }
  }, []);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [nozzles, jobNumber, jobDescription]);

  // Save current project
  const handleSaveProject = useCallback(() => {
    const saved = saveProject({
      id: currentProjectId || undefined,
      jobNumber,
      description: jobDescription,
      nozzles,
    });
    setCurrentProjectId(saved.id);
    setSavedProjects(getProjects());
    setHasUnsavedChanges(false);
    setShowProjectMenu(false);
  }, [currentProjectId, jobNumber, jobDescription, nozzles]);

  // Load a project
  const handleLoadProject = useCallback((project: SavedProject) => {
    setCurrentProjectId(project.id);
    setJobNumber(project.jobNumber);
    setJobDescription(project.description);
    setNozzles(project.nozzles);
    setSelectedNozzleId(project.nozzles[0]?.id || null);
    setHasUnsavedChanges(false);
    setShowProjectMenu(false);
  }, []);

  // Start new project
  const handleNewProject = useCallback(() => {
    setCurrentProjectId(null);
    setJobNumber('');
    setJobDescription('');
    setNozzles([createNewNozzle('N1')]);
    setSelectedNozzleId(null);
    setHasUnsavedChanges(false);
    setShowProjectMenu(false);
  }, []);

  // Delete a project
  const handleDeleteProject = useCallback((id: string) => {
    if (confirm('Delete this project permanently?')) {
      deleteProject(id);
      setSavedProjects(getProjects());
      if (currentProjectId === id) {
        handleNewProject();
      }
    }
  }, [currentProjectId, handleNewProject]);

  // Save settings
  const handleSaveSettings = useCallback(() => {
    saveSettings({ beadSizes, travelSpeeds, operatorFactors });
  }, [beadSizes, travelSpeeds, operatorFactors]);

  // Calculate results for a nozzle
  const calculateNozzleResults = useCallback((nozzle: NozzleItem) => {
    const { geometry, insideLayers, outsideProcess, filletProcess } = nozzle;
    
    // Calculate groove info
    const insideDepth = geometry.jointType === 'doublebevel'
      ? geometry.shellThick * (geometry.splitRatio / 100) - geometry.rootFace / 2
      : geometry.shellThick - geometry.rootFace;
    const bevelAngle = geometry.jointType === 'doublebevel' ? geometry.insideBevelAngle : geometry.singleBevelAngle;
    const maxBevelWidth = insideDepth * Math.tan((bevelAngle * Math.PI) / 180);
    const rootWidth = geometry.rootGap;

    // Convert layers to zone distribution
    const sortedLayers = [...insideLayers].sort((a, b) => a.minWidth - b.minWidth);
    const getDepthPctForWidth = (width: number): number => {
      if (width <= rootWidth) return 0;
      if (maxBevelWidth <= 0) return 100;
      const depth = (width - rootWidth) * insideDepth / maxBevelWidth;
      return Math.min(100, Math.max(0, (depth / insideDepth) * 100));
    };

    let zone1Pct = 0, zone2Pct = 0;
    const proc1: WeldProcess = sortedLayers[0]?.process || 'GTAW';
    const proc2: WeldProcess = sortedLayers[1]?.process || 'SMAW';

    if (sortedLayers.length >= 2) {
      zone1Pct = getDepthPctForWidth(sortedLayers[1].minWidth);
      zone2Pct = 100 - zone1Pct;
    } else {
      zone1Pct = 100;
    }

    const zoneDistribution: ZoneDistribution = { zone1Pct, zone2Pct, zone3Pct: 0 };
    const processStrategy: ProcessStrategy = { proc1, proc2, proc3: outsideProcess, procFillet: filletProcess };

    return calculateWeld(geometry, processStrategy, beadSizes, travelSpeeds, operatorFactors, zoneDistribution);
  }, [beadSizes, travelSpeeds, operatorFactors]);

  // Calculate all nozzles with results and activity codes
  const nozzlesWithResults = useMemo(() => {
    return nozzles.map(nozzle => {
      const results = calculateNozzleResults(nozzle);
      const activityCodes = calculateActivityCodes(nozzle.activityTimes, results.times);
      return { ...nozzle, results, activityCodes };
    });
  }, [nozzles, calculateNozzleResults]);

  // Get current nozzle with results
  const currentNozzle = useMemo(() => 
    nozzlesWithResults.find(n => n.id === selectedNozzleId) || nozzlesWithResults[0],
    [nozzlesWithResults, selectedNozzleId]
  );

  // Calculate job totals
  const jobTotals = useMemo(() => {
    const totals: ActivityCodeBreakdown = { CUTNOZZ: 0, FNOZZ: 0, PREHEAT: 0, WNOZZ: 0, BACGRI: 0, MATCUT: 0, NDE: 0 };
    let totalNozzles = 0;
    let grandTotal = 0;

    nozzlesWithResults.forEach(nozzle => {
      const qty = nozzle.quantity;
      totalNozzles += qty;
      if (nozzle.activityCodes) {
        Object.keys(totals).forEach(key => {
          const k = key as keyof ActivityCodeBreakdown;
          totals[k] += nozzle.activityCodes![k] * qty;
        });
        grandTotal += Object.values(nozzle.activityCodes).reduce((sum, v) => sum + v, 0) * qty;
      }
    });

    return { totals, totalNozzles, grandTotal };
  }, [nozzlesWithResults]);

  // Update nozzle helper
  const updateNozzle = useCallback((id: string, updates: Partial<NozzleItem>) => {
    setNozzles(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  // Update geometry for current nozzle
  const updateGeometry = (field: keyof GeometryInput, value: number | string) => {
    if (!currentNozzle) return;
    updateNozzle(currentNozzle.id, {
      geometry: { ...currentNozzle.geometry, [field]: value }
    });
  };

  // Update activity time for current nozzle
  const updateActivity = (field: keyof ActivityTimes, value: number) => {
    if (!currentNozzle) return;
    updateNozzle(currentNozzle.id, {
      activityTimes: { ...currentNozzle.activityTimes, [field]: value }
    });
  };

  // Update inside layer for current nozzle
  const updateInsideLayer = (index: number, field: 'process' | 'minWidth', value: string | number) => {
    if (!currentNozzle) return;
    const newLayers = [...currentNozzle.insideLayers];
    if (field === 'process') {
      newLayers[index] = { ...newLayers[index], process: value as Exclude<WeldProcess, 'Skip'> };
    } else {
      newLayers[index] = { ...newLayers[index], minWidth: value as number };
    }
    updateNozzle(currentNozzle.id, { insideLayers: newLayers });
  };

  const addInsideLayer = () => {
    if (!currentNozzle) return;
    const lastLayer = currentNozzle.insideLayers[currentNozzle.insideLayers.length - 1];
    const newMinWidth = lastLayer ? lastLayer.minWidth + 10 : 0;
    updateNozzle(currentNozzle.id, {
      insideLayers: [...currentNozzle.insideLayers, { process: 'FCAW', minWidth: newMinWidth }]
    });
  };

  const removeInsideLayer = (index: number) => {
    if (!currentNozzle || currentNozzle.insideLayers.length <= 1) return;
    updateNozzle(currentNozzle.id, {
      insideLayers: currentNozzle.insideLayers.filter((_, i) => i !== index)
    });
  };

  // Add new nozzle
  const addNozzle = () => {
    const newTag = `N${nozzles.length + 1}`;
    const newNozzle = createNewNozzle(newTag);
    setNozzles(prev => [...prev, newNozzle]);
    setSelectedNozzleId(newNozzle.id);
    // Stay on nozzles tab so user can edit the tag immediately
    setActiveTab('nozzles');
    // Focus the new tag input after render
    setTimeout(() => {
      const input = document.querySelector(`input.tag-input[data-id="${newNozzle.id}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  };

  // Duplicate nozzle
  const duplicateNozzle = (nozzle: NozzleItem) => {
    const newNozzle: NozzleItem = {
      ...nozzle,
      id: generateId(),
      tag: `${nozzle.tag}-copy`,
      geometry: { ...nozzle.geometry },
      insideLayers: [...nozzle.insideLayers],
      activityTimes: { ...nozzle.activityTimes },
    };
    setNozzles(prev => [...prev, newNozzle]);
  };

  // Delete nozzle
  const deleteNozzle = (id: string) => {
    if (nozzles.length <= 1) return;
    setNozzles(prev => prev.filter(n => n.id !== id));
    if (selectedNozzleId === id) {
      setSelectedNozzleId(nozzles.find(n => n.id !== id)?.id || null);
    }
  };

  // Export to Excel
  const handleExport = () => {
    exportToCSV(nozzlesWithResults, jobNumber || 'estimate');
  };

  // Calculate groove info for current nozzle
  const grooveInfo = useMemo(() => {
    if (!currentNozzle) return { rootWidth: 0, topWidth: 0 };
    const { geometry } = currentNozzle;
    const insideDepth = geometry.jointType === 'doublebevel'
      ? geometry.shellThick * (geometry.splitRatio / 100) - geometry.rootFace / 2
      : geometry.shellThick - geometry.rootFace;
    const bevelAngle = geometry.jointType === 'doublebevel' ? geometry.insideBevelAngle : geometry.singleBevelAngle;
    const maxBevelWidth = insideDepth * Math.tan((bevelAngle * Math.PI) / 180);
    return { rootWidth: geometry.rootGap, topWidth: geometry.rootGap + maxBevelWidth };
  }, [currentNozzle]);

  return (
    <div className="app">
      <header className="header">
        <h1>⚙️ Nozzle Weld Estimator</h1>
        
        <div className="project-controls">
          <div className="job-input">
            <label>Job #:</label>
            <input type="text" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} placeholder="Enter job number" />
          </div>
          
          <div className="project-buttons">
            <button className="btn-save" onClick={handleSaveProject} title="Save Project">
              💾 {currentProjectId ? 'Save' : 'Save New'}
              {hasUnsavedChanges && <span className="unsaved-dot">●</span>}
            </button>
            <div className="project-menu-container">
              <button className="btn-menu" onClick={() => setShowProjectMenu(!showProjectMenu)}>
                📁 Projects ▾
              </button>
              {showProjectMenu && (
                <div className="project-menu">
                  <button className="menu-item new" onClick={handleNewProject}>+ New Project</button>
                  <div className="menu-divider"></div>
                  {savedProjects.length === 0 ? (
                    <div className="menu-empty">No saved projects</div>
                  ) : (
                    savedProjects.map(project => (
                      <div key={project.id} className={`menu-item project ${project.id === currentProjectId ? 'current' : ''}`}>
                        <span className="project-info" onClick={() => handleLoadProject(project)}>
                          <strong>{project.jobNumber || '(No job #)'}</strong>
                          <small>{new Date(project.modifiedAt).toLocaleDateString()}</small>
                        </span>
                        <button className="btn-delete-small" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>🗑️</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tabs">
          <button className={activeTab === 'nozzles' ? 'active' : ''} onClick={() => setActiveTab('nozzles')}>Nozzles</button>
          <button className={activeTab === 'editor' ? 'active' : ''} onClick={() => setActiveTab('editor')}>Editor</button>
          <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>Summary</button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>
      </header>

      {/* NOZZLES TAB - List of all nozzles */}
      {activeTab === 'nozzles' && (
        <main className="nozzles-grid">
          <div className="nozzles-toolbar">
            <button className="btn-primary" onClick={addNozzle}>+ Add Nozzle</button>
            <button className="btn-export" onClick={handleExport} disabled={nozzles.length === 0}>📥 Export to Excel</button>
            <div className="job-stats">
              <span>{jobTotals.totalNozzles} nozzles</span>
              <span className="divider">|</span>
              <span className="total-hours">{jobTotals.grandTotal.toFixed(1)} hrs total</span>
            </div>
          </div>

          <div className="nozzle-table-container">
            <table className="nozzle-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Qty</th>
                  <th>OD</th>
                  <th>Thk</th>
                  <th>Type</th>
                  <th>CUTNOZZ</th>
                  <th>FNOZZ</th>
                  <th>PREHEAT</th>
                  <th>WNOZZ</th>
                  <th>BACGRI</th>
                  <th>MATCUT</th>
                  <th>NDE</th>
                  <th>Total/ea</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nozzlesWithResults.map((nozzle) => {
                  const codes = nozzle.activityCodes!;
                  const totalPer = Object.values(codes).reduce((s, v) => s + v, 0);
                  const totalQty = totalPer * nozzle.quantity;
                  return (
                    <tr key={nozzle.id} className={nozzle.id === selectedNozzleId ? 'selected' : ''}>
                      <td>
                        <input
                          type="text"
                          className="tag-input"
                          data-id={nozzle.id}
                          value={nozzle.tag}
                          onChange={(e) => updateNozzle(nozzle.id, { tag: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="qty-input"
                          min="1"
                          value={nozzle.quantity}
                          onChange={(e) => updateNozzle(nozzle.id, { quantity: parseInt(e.target.value) || 1 })}
                        />
                      </td>
                      <td>{nozzle.geometry.nozzleOD}</td>
                      <td>{nozzle.geometry.shellThick}</td>
                      <td>{nozzle.geometry.jointType === 'doublebevel' ? 'DB' : 'SB'}</td>
                      <td>{codes.CUTNOZZ.toFixed(2)}</td>
                      <td>{codes.FNOZZ.toFixed(2)}</td>
                      <td>{codes.PREHEAT.toFixed(2)}</td>
                      <td className="weld-time">{codes.WNOZZ.toFixed(2)}</td>
                      <td>{codes.BACGRI.toFixed(2)}</td>
                      <td>{codes.MATCUT.toFixed(2)}</td>
                      <td>{codes.NDE.toFixed(2)}</td>
                      <td className="total-cell">{totalPer.toFixed(2)}</td>
                      <td className="total-cell">{totalQty.toFixed(2)}</td>
                      <td className="actions-cell">
                        <button className="btn-icon" onClick={() => { setSelectedNozzleId(nozzle.id); setActiveTab('editor'); }} title="Edit">✏️</button>
                        <button className="btn-icon" onClick={() => duplicateNozzle(nozzle)} title="Duplicate">📋</button>
                        <button className="btn-icon btn-delete" onClick={() => deleteNozzle(nozzle.id)} disabled={nozzles.length <= 1} title="Delete">🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td><strong>TOTALS</strong></td>
                  <td><strong>{jobTotals.totalNozzles}</strong></td>
                  <td colSpan={3}></td>
                  <td><strong>{jobTotals.totals.CUTNOZZ.toFixed(2)}</strong></td>
                  <td><strong>{jobTotals.totals.FNOZZ.toFixed(2)}</strong></td>
                  <td><strong>{jobTotals.totals.PREHEAT.toFixed(2)}</strong></td>
                  <td className="weld-time"><strong>{jobTotals.totals.WNOZZ.toFixed(2)}</strong></td>
                  <td><strong>{jobTotals.totals.BACGRI.toFixed(2)}</strong></td>
                  <td><strong>{jobTotals.totals.MATCUT.toFixed(2)}</strong></td>
                  <td><strong>{jobTotals.totals.NDE.toFixed(2)}</strong></td>
                  <td></td>
                  <td className="grand-total"><strong>{jobTotals.grandTotal.toFixed(2)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </main>
      )}

      {/* EDITOR TAB - Edit selected nozzle */}
      {activeTab === 'editor' && currentNozzle && (
        <main className="main-grid">
          <div className="panel left-panel">
            <div className="nozzle-selector">
              <select value={selectedNozzleId || ''} onChange={(e) => setSelectedNozzleId(e.target.value)}>
                {nozzles.map(n => <option key={n.id} value={n.id}>{n.tag} ({n.geometry.nozzleOD}×{n.geometry.shellThick})</option>)}
              </select>
            </div>

            <section className="section">
              <h2 className="section-title">📏 Dimensions</h2>
              <div className="input-row">
                <div className="input-group">
                  <label>Nozzle OD</label>
                  <NumberInput value={currentNozzle.geometry.nozzleOD} onChange={(v) => updateGeometry('nozzleOD', v)} />
                </div>
                <div className="input-group">
                  <label>Shell Thk</label>
                  <NumberInput value={currentNozzle.geometry.shellThick} onChange={(v) => updateGeometry('shellThick', v)} />
                </div>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Root Gap</label>
                  <NumberInput value={currentNozzle.geometry.rootGap} step={0.5} onChange={(v) => updateGeometry('rootGap', v)} />
                </div>
                <div className="input-group">
                  <label>Root Face</label>
                  <NumberInput value={currentNozzle.geometry.rootFace} step={0.5} onChange={(v) => updateGeometry('rootFace', v)} />
                </div>
              </div>
              <div className="input-group">
                <label>Fillet Throat</label>
                <NumberInput value={currentNozzle.geometry.filletThroat} step={0.5} onChange={(v) => updateGeometry('filletThroat', v)} />
              </div>
            </section>

            <section className="section">
              <h2 className="section-title">🔧 Bevel</h2>
              <div className="input-group">
                <label>Joint Type</label>
                <select value={currentNozzle.geometry.jointType} onChange={(e) => updateGeometry('jointType', e.target.value)}>
                  <option value="singlebevel">Single Bevel</option>
                  <option value="doublebevel">Double Bevel</option>
                </select>
              </div>
              {currentNozzle.geometry.jointType === 'singlebevel' ? (
                <div className="input-group">
                  <label>Bevel Angle (°)</label>
                  <NumberInput value={currentNozzle.geometry.singleBevelAngle} onChange={(v) => updateGeometry('singleBevelAngle', v)} />
                </div>
              ) : (
                <>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Inside (°)</label>
                      <NumberInput value={currentNozzle.geometry.insideBevelAngle} onChange={(v) => updateGeometry('insideBevelAngle', v)} />
                    </div>
                    <div className="input-group">
                      <label>Outside (°)</label>
                      <NumberInput value={currentNozzle.geometry.outsideBevelAngle} onChange={(v) => updateGeometry('outsideBevelAngle', v)} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Inside Split (%)</label>
                    <NumberInput value={currentNozzle.geometry.splitRatio} min={40} max={80} step={5} onChange={(v) => updateGeometry('splitRatio', v)} />
                  </div>
                </>
              )}
            </section>

            <section className="section">
              <h2 className="section-title">🔥 Inside Weld</h2>
              <div className="groove-info">Root: {grooveInfo.rootWidth.toFixed(0)}mm → Top: {grooveInfo.topWidth.toFixed(0)}mm</div>
              <div className="layers-header"><span>Process</span><span>Switch @</span><span></span></div>
              {currentNozzle.insideLayers.map((layer, index) => (
                <div key={index} className="layer-row">
                  <select value={layer.process} onChange={(e) => updateInsideLayer(index, 'process', e.target.value)}>
                    {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="width-input">
                    <NumberInput value={layer.minWidth} min={0} step={1} onChange={(v) => updateInsideLayer(index, 'minWidth', v)} disabled={index === 0} />
                    <span className="unit-label">mm</span>
                  </div>
                  <button className="remove-btn" onClick={() => removeInsideLayer(index)} disabled={currentNozzle.insideLayers.length <= 1}>×</button>
                </div>
              ))}
              <button className="add-layer-btn" onClick={addInsideLayer}>+ Add Process</button>
            </section>

            <section className="section">
              <h2 className="section-title">🔄 Outside & Fillet</h2>
              {currentNozzle.geometry.jointType === 'doublebevel' && (
                <div className="input-group">
                  <label>Outside (after gouge)</label>
                  <select value={currentNozzle.outsideProcess} onChange={(e) => updateNozzle(currentNozzle.id, { outsideProcess: e.target.value as Exclude<WeldProcess, 'Skip'> })}>
                    {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
              <div className="input-group">
                <label>Fillet Weld</label>
                <select value={currentNozzle.filletProcess} onChange={(e) => updateNozzle(currentNozzle.id, { filletProcess: e.target.value as Exclude<WeldProcess, 'Skip'> })}>
                  {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </section>
          </div>

          <div className="panel middle-panel">
            <WeldDiagram geometry={currentNozzle.geometry} insideLayers={currentNozzle.insideLayers} outsideProcess={currentNozzle.outsideProcess} filletProcess={currentNozzle.filletProcess} />
            <p className="diagram-caption">Circumference: {currentNozzle.results?.circumference.toFixed(0) || 0}mm</p>
          </div>

          <div className="panel right-panel">
            <div className="result-card primary">
              <h3>TOTAL TIME</h3>
              <div className="value">{currentNozzle.activityCodes ? Object.values(currentNozzle.activityCodes).reduce((s, v) => s + v, 0).toFixed(1) : '0'}</div>
              <div className="unit">hours/nozzle</div>
            </div>

            <section className="section">
              <h2 className="section-title">⏱️ Activity Times</h2>
              <div className="activity-compact">
                <div className="act-row"><label>Mark & Cut</label><NumberInput step={0.25} value={currentNozzle.activityTimes.markPosition + currentNozzle.activityTimes.cutAndBevel} onChange={(v) => { updateActivity('markPosition', v * 0.2); updateActivity('cutAndBevel', v * 0.8); }} /></div>
                <div className="act-row"><label>Grind Bevel</label><NumberInput step={0.25} value={currentNozzle.activityTimes.grindBevelClean} onChange={(v) => updateActivity('grindBevelClean', v)} /></div>
                <div className="act-row"><label>Fit Nozzle</label><NumberInput step={0.25} value={currentNozzle.activityTimes.fitNozzle} onChange={(v) => updateActivity('fitNozzle', v)} /></div>
                <div className="act-row"><label>Pre-heat 1</label><NumberInput step={0.25} value={currentNozzle.activityTimes.preheat1} onChange={(v) => updateActivity('preheat1', v)} /></div>
                <div className="act-row calc"><label>Weld 1st</label><span>{currentNozzle.results?.times.insideTime.toFixed(2) || 0}h</span></div>
                <div className="act-row"><label>Grind 1st</label><NumberInput step={0.25} value={currentNozzle.activityTimes.grind1stSide} onChange={(v) => updateActivity('grind1stSide', v)} /></div>
                <div className="act-row"><label>Back-gouge</label><NumberInput step={0.25} value={currentNozzle.activityTimes.backGouge} onChange={(v) => updateActivity('backGouge', v)} /></div>
                <div className="act-row"><label>Pre-heat 2</label><NumberInput step={0.25} value={currentNozzle.activityTimes.preheat2} onChange={(v) => updateActivity('preheat2', v)} /></div>
                <div className="act-row calc"><label>Weld 2nd</label><span>{currentNozzle.results?.times.outsideTime.toFixed(2) || 0}h</span></div>
                <div className="act-row"><label>Grind 2nd</label><NumberInput step={0.25} value={currentNozzle.activityTimes.grind2ndSide} onChange={(v) => updateActivity('grind2ndSide', v)} /></div>
                <div className="act-row calc"><label>Fillet</label><span>{currentNozzle.results?.times.filletTime.toFixed(2) || 0}h</span></div>
                <div className="act-row"><label>NDE</label><NumberInput step={0.25} value={currentNozzle.activityTimes.nde} onChange={(v) => updateActivity('nde', v)} /></div>
              </div>
            </section>

            <section className="section">
              <h2 className="section-title">📊 Activity Codes</h2>
              {currentNozzle.activityCodes && (
                <div className="codes-grid">
                  <div className="code-box"><span className="code">CUTNOZZ</span><span>{currentNozzle.activityCodes.CUTNOZZ.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">FNOZZ</span><span>{currentNozzle.activityCodes.FNOZZ.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">PREHEAT</span><span>{currentNozzle.activityCodes.PREHEAT.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">WNOZZ</span><span>{currentNozzle.activityCodes.WNOZZ.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">BACGRI</span><span>{currentNozzle.activityCodes.BACGRI.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">MATCUT</span><span>{currentNozzle.activityCodes.MATCUT.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">NDE</span><span>{currentNozzle.activityCodes.NDE.toFixed(2)}h</span></div>
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* SUMMARY TAB - Activity codes summary */}
      {activeTab === 'summary' && (
        <main className="summary-grid">
          <div className="panel summary-panel">
            <div className="summary-header">
              <h2>Job Summary: {jobNumber || '(No job number)'}</h2>
              <button className="btn-export" onClick={handleExport}>📥 Export to Excel</button>
            </div>

            <div className="summary-cards">
              <div className="summary-card">
                <h3>Total Nozzles</h3>
                <div className="big-number">{jobTotals.totalNozzles}</div>
              </div>
              <div className="summary-card primary">
                <h3>Grand Total</h3>
                <div className="big-number">{jobTotals.grandTotal.toFixed(1)}</div>
                <div className="unit">hours</div>
              </div>
            </div>

            <h3 className="section-title">Activity Code Totals</h3>
            <div className="codes-summary">
              {Object.entries(jobTotals.totals).map(([code, hours]) => (
                <div key={code} className="code-summary-row">
                  <span className="code-name">{code}</span>
                  <div className="code-bar">
                    <div className="code-fill" style={{ width: `${Math.min(100, (hours / jobTotals.grandTotal) * 100)}%` }}></div>
                  </div>
                  <span className="code-hours">{hours.toFixed(2)} hrs</span>
                  <span className="code-pct">{((hours / jobTotals.grandTotal) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <main className="settings-grid">
          <div className="settings-header-bar">
            <p>These settings apply to all nozzle calculations.</p>
            <button className="btn-save" onClick={handleSaveSettings}>💾 Save Settings</button>
          </div>
          <div className="panel">
            <h2 className="section-title">🔧 Bead Sizes (mm)</h2>
            <div className="settings-table">
              <div className="settings-header"><span>Process</span><span>Height</span><span>Width</span></div>
              {PROCESSES.map((proc) => (
                <div key={proc} className="settings-row">
                  <span className="process-tag" data-process={proc}>{proc}</span>
                  <NumberInput step={0.1} value={beadSizes[proc].h} onChange={(v) => setBeadSizes(prev => ({ ...prev, [proc]: { ...prev[proc], h: v } }))} />
                  <NumberInput step={0.1} value={beadSizes[proc].w} onChange={(v) => setBeadSizes(prev => ({ ...prev, [proc]: { ...prev[proc], w: v } }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">⚡ Travel Speeds (mm/min)</h2>
            <div className="settings-table">
              <div className="settings-header"><span>Process</span><span>&lt;20mm</span><span>20-40mm</span><span>&gt;40mm</span></div>
              {PROCESSES.map((proc) => (
                <div key={proc} className="settings-row">
                  <span className="process-tag" data-process={proc}>{proc}</span>
                  <NumberInput step={5} value={travelSpeeds.thin[proc]} onChange={(v) => setTravelSpeeds(prev => ({ ...prev, thin: { ...prev.thin, [proc]: v } }))} />
                  <NumberInput step={5} value={travelSpeeds.medium[proc]} onChange={(v) => setTravelSpeeds(prev => ({ ...prev, medium: { ...prev.medium, [proc]: v } }))} />
                  <NumberInput step={5} value={travelSpeeds.thick[proc]} onChange={(v) => setTravelSpeeds(prev => ({ ...prev, thick: { ...prev.thick, [proc]: v } }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">👷 Operator Factors</h2>
            <p className="panel-description">Multiplier on arc time to account for setup, repositioning, etc.</p>
            <div className="settings-table">
              <div className="settings-header"><span>Thickness</span><span>Inside</span><span>Outside</span></div>
              {[
                { key: 'range1', label: '<12mm' },
                { key: 'range2', label: '12-18mm' },
                { key: 'range3', label: '18-25mm' },
                { key: 'range4', label: '25-35mm' },
                { key: 'range5', label: '35-50mm' },
                { key: 'range6', label: '>50mm' },
              ].map(({ key, label }) => (
                <div key={key} className="settings-row">
                  <span>{label}</span>
                  <NumberInput step={0.1} value={operatorFactors[key as keyof OperatorFactorsByThickness].inside} onChange={(v) => setOperatorFactors(prev => ({ ...prev, [key]: { ...prev[key as keyof OperatorFactorsByThickness], inside: v } }))} />
                  <NumberInput step={0.1} value={operatorFactors[key as keyof OperatorFactorsByThickness].outside} onChange={(v) => setOperatorFactors(prev => ({ ...prev, [key]: { ...prev[key as keyof OperatorFactorsByThickness], outside: v } }))} />
                </div>
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
