import { useState, useMemo, useCallback, useEffect } from 'react';
import { NumberInput } from '../../shared/components';
import { useProject } from '../../project';
import type { 
  PipeJointItem, 
  PipeJointsModuleData,
  PipeJointActivityCodes,
  PipeJointSettings,
} from './types';
import { createNewPipeJoint } from './types';
import { calculatePipeJoint, calculatePipeJointActivityCodes, getEffectiveSettings } from './engine';
import { getAllNPSSizes, getSchedulesForNPS, getPipeDimensions } from './pipeData';
import { PipeJointDiagram } from './components/PipeJointDiagram';
import './PipeJointsModule.css';

type TabType = 'list' | 'editor';

// Get pipe joint settings from localStorage (admin configured)
function getPipeJointSettings(): PipeJointSettings {
  try {
    const stored = localStorage.getItem('pipeJointSettings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return { presets: [] };
}

export function PipeJointsModule() {
  const { getModuleData, setModuleData, updateModuleSummary, settings } = useProject();
  
  // Load module data from project
  const moduleData = getModuleData<PipeJointsModuleData>('pipejoints');
  const joints = moduleData?.joints || [];
  
  // Load pipe joint settings (admin configured presets)
  const [pipeJointSettings, setPipeJointSettings] = useState<PipeJointSettings>(getPipeJointSettings);
  
  // Refresh settings when they might have changed
  useEffect(() => {
    const handleStorage = () => setPipeJointSettings(getPipeJointSettings());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [selectedJointId, setSelectedJointId] = useState<string | null>(joints[0]?.id || null);

  // Initialize with one joint if empty
  useEffect(() => {
    if (joints.length === 0) {
      const initialJoint = createNewPipeJoint('Pipe Joint 1');
      setModuleData<PipeJointsModuleData>('pipejoints', { joints: [initialJoint] });
      setSelectedJointId(initialJoint.id);
    }
  }, []);

  const updateJoints = useCallback((updater: (prev: PipeJointItem[]) => PipeJointItem[]) => {
    const newJoints = updater(joints);
    setModuleData<PipeJointsModuleData>('pipejoints', { joints: newJoints });
  }, [joints, setModuleData]);

  // Calculate results for all joints
  const jointsWithResults = useMemo(() => {
    return joints.map(joint => {
      const results = calculatePipeJoint(joint, pipeJointSettings, settings);
      const activityCodes = results 
        ? calculatePipeJointActivityCodes(joint, results, pipeJointSettings)
        : undefined;
      return { ...joint, results: results || undefined, activityCodes };
    });
  }, [joints, pipeJointSettings, settings]);

  // Update module summary
  useEffect(() => {
    const itemCount = jointsWithResults.reduce((sum, j) => sum + j.quantity, 0);
    const totalHours = jointsWithResults.reduce((sum, j) => {
      if (!j.activityCodes) return sum;
      const codes = j.activityCodes;
      return sum + (Object.values(codes).reduce((s, v) => s + v, 0) * j.quantity);
    }, 0);
    
    const activityBreakdown: Record<string, number> = {};
    jointsWithResults.forEach(j => {
      if (!j.activityCodes) return;
      const qty = j.quantity;
      Object.entries(j.activityCodes).forEach(([code, hours]) => {
        activityBreakdown[code] = (activityBreakdown[code] || 0) + hours * qty;
      });
    });
    
    updateModuleSummary('pipejoints', { 
      moduleId: 'pipejoints',
      moduleName: 'Pipe Joints',
      itemCount, 
      totalHours,
      activityBreakdown,
    });
  }, [jointsWithResults, updateModuleSummary]);

  const currentJoint = useMemo(() => 
    jointsWithResults.find(j => j.id === selectedJointId) || jointsWithResults[0],
    [jointsWithResults, selectedJointId]
  );

  // Module totals
  const moduleTotals = useMemo(() => {
    const totals: PipeJointActivityCodes = { FPIPE: 0, PREHEAT: 0, WPIPE: 0, NDE: 0 };
    let totalJoints = 0;
    let grandTotal = 0;

    jointsWithResults.forEach(joint => {
      const qty = joint.quantity;
      totalJoints += qty;
      if (joint.activityCodes) {
        Object.keys(totals).forEach(key => {
          const k = key as keyof PipeJointActivityCodes;
          totals[k] += joint.activityCodes![k] * qty;
        });
        grandTotal += Object.values(joint.activityCodes).reduce((sum, v) => sum + v, 0) * qty;
      }
    });

    return { totals, totalJoints, grandTotal };
  }, [jointsWithResults]);

  const updateJoint = useCallback((id: string, updates: Partial<PipeJointItem>) => {
    updateJoints(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  }, [updateJoints]);

  const addJoint = () => {
    const newTag = `Pipe Joint ${joints.length + 1}`;
    const newJoint = createNewPipeJoint(newTag);
    updateJoints(prev => [...prev, newJoint]);
    setSelectedJointId(newJoint.id);
    setActiveTab('list');
    setTimeout(() => {
      const input = document.querySelector(`input[data-id="${newJoint.id}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  };

  const duplicateJoint = (joint: PipeJointItem) => {
    const newJoint: PipeJointItem = {
      ...joint,
      id: Math.random().toString(36).substr(2, 9),
      tag: `${joint.tag}-copy`,
    };
    updateJoints(prev => [...prev, newJoint]);
  };

  const deleteJoint = (id: string) => {
    updateJoints(prev => prev.filter(j => j.id !== id));
    if (selectedJointId === id) {
      const remaining = joints.filter(j => j.id !== id);
      setSelectedJointId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Get available sizes
  const allNPSSizes = getAllNPSSizes();
  const availableSchedules = currentJoint ? getSchedulesForNPS(currentJoint.nps) : [];
  
  // Get current pipe dimensions
  const currentDims = currentJoint ? getPipeDimensions(currentJoint.nps, currentJoint.schedule) : null;
  
  // Check if preset exists for current selection
  const hasPreset = currentJoint && pipeJointSettings.presets.some(
    p => p.nps === currentJoint.nps && p.schedule === currentJoint.schedule && p.enabled
  );
  
  // Get effective settings for display
  const effectiveSettings = currentJoint ? getEffectiveSettings(currentJoint, pipeJointSettings) : null;

  return (
    <div className="pipejoints-module">
      <div className="module-toolbar">
        <div className="toolbar-left">
          <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>
            List
          </button>
          <button className={activeTab === 'editor' ? 'active' : ''} onClick={() => setActiveTab('editor')} disabled={!currentJoint}>
            Editor
          </button>
        </div>
        <div className="toolbar-center">
          <button className="btn-add" onClick={addJoint}>+ Add Pipe Joint</button>
        </div>
        <div className="toolbar-right">
          <span className="stats">{moduleTotals.totalJoints} joints • {moduleTotals.grandTotal.toFixed(1)} hrs</span>
        </div>
      </div>

      {/* LIST TAB */}
      {activeTab === 'list' && (
        <div className="joints-table-container">
          <table className="joints-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Qty</th>
                <th>Size</th>
                <th>Schedule</th>
                <th>OD</th>
                <th>Wall</th>
                <th>FPIPE</th>
                <th>PREHEAT</th>
                <th>WPIPE</th>
                <th>NDE</th>
                <th>Total/ea</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jointsWithResults.map((joint) => {
                const codes = joint.activityCodes;
                const dims = getPipeDimensions(joint.nps, joint.schedule);
                const totalPer = codes ? Object.values(codes).reduce((s, v) => s + v, 0) : 0;
                const totalQty = totalPer * joint.quantity;
                return (
                  <tr key={joint.id} className={joint.id === selectedJointId ? 'selected' : ''}>
                    <td>
                      <input
                        type="text"
                        className="tag-input"
                        value={joint.tag}
                        onChange={(e) => updateJoint(joint.id, { tag: e.target.value })}
                        data-id={joint.id}
                      />
                    </td>
                    <td>
                      <NumberInput
                        value={joint.quantity}
                        onChange={(val) => updateJoint(joint.id, { quantity: val })}
                        min={1}
                        className="qty-input"
                      />
                    </td>
                    <td>
                      <select
                        className="pipe-select"
                        value={joint.nps}
                        onChange={(e) => {
                          const newNps = e.target.value;
                          const schedules = getSchedulesForNPS(newNps);
                          const newSchedule = schedules.includes(joint.schedule) ? joint.schedule : schedules[0];
                          updateJoint(joint.id, { nps: newNps, schedule: newSchedule });
                        }}
                      >
                        {allNPSSizes.map(nps => (
                          <option key={nps} value={nps}>{nps}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="pipe-select"
                        value={joint.schedule}
                        onChange={(e) => updateJoint(joint.id, { schedule: e.target.value })}
                      >
                        {getSchedulesForNPS(joint.nps).map(sch => (
                          <option key={sch} value={sch}>{sch}</option>
                        ))}
                      </select>
                    </td>
                    <td>{dims?.od.toFixed(1) || '-'}</td>
                    <td>{dims?.wallThickness.toFixed(2) || '-'}</td>
                    <td>{codes?.FPIPE.toFixed(2) || '-'}</td>
                    <td>{codes?.PREHEAT.toFixed(2) || '-'}</td>
                    <td className="weld-time">{codes?.WPIPE.toFixed(2) || '-'}</td>
                    <td>{codes?.NDE.toFixed(2) || '-'}</td>
                    <td className="total-cell">{totalPer.toFixed(2)}</td>
                    <td className="total-cell">{totalQty.toFixed(2)}</td>
                    <td className="actions-cell">
                      <button className="btn-action" onClick={() => { setSelectedJointId(joint.id); setActiveTab('editor'); }}>Edit</button>
                      <button className="btn-action" onClick={() => duplicateJoint(joint)}>Duplicate</button>
                      <button className="btn-action btn-delete" onClick={() => deleteJoint(joint.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td><strong>TOTALS</strong></td>
                <td><strong>{moduleTotals.totalJoints}</strong></td>
                <td colSpan={4}></td>
                <td><strong>{moduleTotals.totals.FPIPE.toFixed(2)}</strong></td>
                <td><strong>{moduleTotals.totals.PREHEAT.toFixed(2)}</strong></td>
                <td className="weld-time"><strong>{moduleTotals.totals.WPIPE.toFixed(2)}</strong></td>
                <td><strong>{moduleTotals.totals.NDE.toFixed(2)}</strong></td>
                <td></td>
                <td className="grand-total"><strong>{moduleTotals.grandTotal.toFixed(2)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* EDITOR TAB */}
      {activeTab === 'editor' && currentJoint && (
        <div className="editor-grid">
          <div className="editor-panel">
            <div className="joint-selector">
              <select value={selectedJointId || ''} onChange={(e) => setSelectedJointId(e.target.value)}>
                {joints.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.tag} ({j.nps} {j.schedule})
                  </option>
                ))}
              </select>
            </div>

            <section className="section">
              <h3>🔧 Pipe Selection</h3>
              <div className="input-row">
                <div className="input-group">
                  <label>Pipe Size (NPS)</label>
                  <select 
                    value={currentJoint.nps} 
                    onChange={(e) => {
                      const newNps = e.target.value;
                      const schedules = getSchedulesForNPS(newNps);
                      const newSchedule = schedules.includes(currentJoint.schedule) ? currentJoint.schedule : schedules[0];
                      updateJoint(currentJoint.id, { nps: newNps, schedule: newSchedule });
                    }}
                  >
                    {allNPSSizes.map(nps => (
                      <option key={nps} value={nps}>{nps}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Schedule</label>
                  <select 
                    value={currentJoint.schedule} 
                    onChange={(e) => updateJoint(currentJoint.id, { schedule: e.target.value })}
                  >
                    {availableSchedules.map(sch => (
                      <option key={sch} value={sch}>{sch}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {currentDims && (
                <div className="pipe-dims-display">
                  <div className="dim-row">
                    <div className="dim-item">
                      <span className="dim-label">OD</span>
                      <span className="dim-value">{currentDims.od.toFixed(1)} mm</span>
                    </div>
                    <div className="dim-item">
                      <span className="dim-label">Wall</span>
                      <span className="dim-value">{currentDims.wallThickness.toFixed(2)} mm</span>
                    </div>
                    <div className="dim-item">
                      <span className="dim-label">Circ</span>
                      <span className="dim-value">{(Math.PI * currentDims.od).toFixed(0)} mm</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                {hasPreset ? (
                  <span className="preset-badge configured">✓ Configured</span>
                ) : (
                  <span className="preset-badge default">⚠ Using defaults</span>
                )}
              </div>
            </section>

            {effectiveSettings && (
              <section className="section">
                <h3>📐 Weld Configuration</h3>
                <div className="input-row">
                  <div className="input-group">
                    <label>Root Gap (mm)</label>
                    <input type="text" value={effectiveSettings.rootGap.toFixed(1)} disabled />
                  </div>
                  <div className="input-group">
                    <label>Root Face (mm)</label>
                    <input type="text" value={effectiveSettings.rootFace.toFixed(1)} disabled />
                  </div>
                </div>
                <div className="input-group">
                  <label>Bevel Angle (°)</label>
                  <input type="text" value={effectiveSettings.bevelAngle} disabled />
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Root Process</label>
                    <input type="text" value={effectiveSettings.rootProcess} disabled />
                  </div>
                  <div className="input-group">
                    <label>Fill Process</label>
                    <input type="text" value={effectiveSettings.fillProcess} disabled />
                  </div>
                </div>
                <div className="input-group">
                  <label>Cap Process</label>
                  <input type="text" value={effectiveSettings.capProcess} disabled />
                </div>
                <p style={{ fontSize: '10px', color: '#8892b0', textAlign: 'center', marginTop: '8px' }}>
                  Configure in Settings → Pipe Joint Settings
                </p>
              </section>
            )}
          </div>

          <div className="editor-panel center">
            {effectiveSettings && (
              <PipeJointDiagram
                od={effectiveSettings.od}
                wallThickness={effectiveSettings.wallThickness}
                rootGap={effectiveSettings.rootGap}
                rootFace={effectiveSettings.rootFace}
                bevelAngle={effectiveSettings.bevelAngle}
                rootProcess={effectiveSettings.rootProcess}
                fillProcess={effectiveSettings.fillProcess}
                capProcess={effectiveSettings.capProcess}
              />
            )}
            <p className="diagram-caption">
              {currentJoint.nps} {currentJoint.schedule} • OD: {currentDims?.od.toFixed(1)}mm
            </p>
          </div>

          <div className="editor-panel">
            <div className="result-card">
              <h3>TOTAL TIME</h3>
              <div className="value">
                {currentJoint.results?.totalTime.toFixed(1) || '0'}
              </div>
              <div className="unit">hours/joint</div>
            </div>

            <div className="results-summary">
              <div className="result-row">
                <span>Circumference</span>
                <span>{((currentJoint.results?.circumference || 0)).toFixed(0)} mm</span>
              </div>
              <div className="result-row">
                <span>Weld Volume</span>
                <span>{((currentJoint.results?.weldVolume || 0) / 1000).toFixed(1)} cm³</span>
              </div>
              <div className="result-row">
                <span>Total Passes</span>
                <span>{currentJoint.results?.totalPasses || 0}</span>
              </div>
              <div className="result-row highlight">
                <span>Weld Time</span>
                <span>{currentJoint.results?.totalWeldTime.toFixed(2) || 0} hrs</span>
              </div>
            </div>

            <section className="section">
              <h3>⏱️ Time Breakdown</h3>
              <div className="activity-list">
                <div className="act-row">
                  <label>Fit-up</label>
                  <span>{effectiveSettings?.fitUpTime.toFixed(2) || 0}h</span>
                </div>
                <div className="act-row">
                  <label>Preheat</label>
                  <span>{effectiveSettings?.preheatTime.toFixed(2) || 0}h</span>
                </div>
                <div className="act-row calc">
                  <label>Root Pass</label>
                  <span>{currentJoint.results?.rootTime.toFixed(2) || 0}h</span>
                </div>
                <div className="act-row calc">
                  <label>Fill Passes</label>
                  <span>{currentJoint.results?.fillTime.toFixed(2) || 0}h</span>
                </div>
                <div className="act-row calc">
                  <label>Cap Pass</label>
                  <span>{currentJoint.results?.capTime.toFixed(2) || 0}h</span>
                </div>
                <div className="act-row">
                  <label>NDE</label>
                  <span>{effectiveSettings?.ndeTime.toFixed(2) || 0}h</span>
                </div>
              </div>
            </section>

            <section className="section">
              <h3>Activity Codes</h3>
              {currentJoint.activityCodes && (
                <div className="codes-grid">
                  <div className="code-box"><span className="code">FPIPE</span><span>{currentJoint.activityCodes.FPIPE.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">PREHEAT</span><span>{currentJoint.activityCodes.PREHEAT.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">WPIPE</span><span>{currentJoint.activityCodes.WPIPE.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">NDE</span><span>{currentJoint.activityCodes.NDE.toFixed(2)}h</span></div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

