import { useState, useMemo, useCallback, useEffect } from 'react';
import type { WeldProcess } from '../../shared/types';
import { NumberInput } from '../../shared/components';
import { useProject } from '../../project';
import type { 
  LongWeldItem, 
  LongWeldGeometry, 
  LongWeldActivityTimes,
  LongWeldsModuleData,
  LongWeldActivityCodes,
} from './types';
import { 
  DEFAULT_LONG_WELD_GEOMETRY, 
  DEFAULT_LONG_WELD_ACTIVITY_TIMES,
  DEFAULT_LONG_WELD_LAYERS,
} from './types';
import { calculateLongWeld, calculateLongWeldActivityCodes } from './engine';
import { LongWeldDiagram } from './components/LongWeldDiagram';
import './LongWeldsModule.css';

const PROCESSES: Exclude<WeldProcess, 'Skip'>[] = ['GTAW', 'SMAW', 'FCAW', 'GMAW', 'SAW'];

type TabType = 'list' | 'editor';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function createNewLongWeld(tag: string): LongWeldItem {
  return {
    id: generateId(),
    tag,
    quantity: 1,
    geometry: { ...DEFAULT_LONG_WELD_GEOMETRY },
    insideLayers: [...DEFAULT_LONG_WELD_LAYERS],
    outsideProcess: 'SAW',
    activityTimes: { ...DEFAULT_LONG_WELD_ACTIVITY_TIMES },
  };
}

// Ensure weld has all required activity time fields (migration for older data)
function migrateWeld(weld: LongWeldItem): LongWeldItem {
  return {
    ...weld,
    activityTimes: {
      ...DEFAULT_LONG_WELD_ACTIVITY_TIMES,
      ...weld.activityTimes,
    },
  };
}

export function LongWeldsModule() {
  const { getModuleData, setModuleData, updateModuleSummary, settings } = useProject();
  
  // Load module data from project and migrate if needed
  const moduleData = getModuleData<LongWeldsModuleData>('longwelds');
  const welds = (moduleData?.welds || []).map(migrateWeld);

  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [selectedWeldId, setSelectedWeldId] = useState<string | null>(welds[0]?.id || null);

  // Initialize with one weld if empty
  useEffect(() => {
    if (welds.length === 0) {
      const initialWeld = createNewLongWeld('Shell 1 Long');
      setModuleData<LongWeldsModuleData>('longwelds', { welds: [initialWeld] });
      setSelectedWeldId(initialWeld.id);
    }
  }, []);

  // Update welds helper
  const updateWelds = useCallback((updater: (prev: LongWeldItem[]) => LongWeldItem[]) => {
    const newWelds = updater(welds);
    setModuleData<LongWeldsModuleData>('longwelds', { welds: newWelds });
  }, [welds, setModuleData]);

  // Calculate results for all welds
  const weldsWithResults = useMemo(() => {
    return welds.map(weld => {
      const results = calculateLongWeld(weld, settings);
      const activityCodes = calculateLongWeldActivityCodes(
        weld.activityTimes, 
        results, 
        weld.outsideProcess,
        weld.geometry.shellThickness
      );
      return { ...weld, results, activityCodes };
    });
  }, [welds, settings]);

  // Update module summary whenever results change
  useEffect(() => {
    const itemCount = weldsWithResults.reduce((sum, w) => sum + w.quantity, 0);
    const totalHours = weldsWithResults.reduce((sum, w) => {
      const codes = w.activityCodes;
      return sum + (Object.values(codes).reduce((s, v) => s + v, 0) * w.quantity);
    }, 0);
    
    // Build activity breakdown
    const activityBreakdown: Record<string, number> = {};
    weldsWithResults.forEach(w => {
      const qty = w.quantity;
      Object.entries(w.activityCodes).forEach(([code, hours]) => {
        activityBreakdown[code] = (activityBreakdown[code] || 0) + hours * qty;
      });
    });
    
    updateModuleSummary('longwelds', { 
      moduleId: 'longwelds',
      moduleName: 'Long Welds',
      itemCount, 
      totalHours,
      activityBreakdown,
    });
  }, [weldsWithResults, updateModuleSummary]);

  // Get current weld
  const currentWeld = useMemo(() => 
    weldsWithResults.find(w => w.id === selectedWeldId) || weldsWithResults[0],
    [weldsWithResults, selectedWeldId]
  );

  // Calculate totals
  const moduleTotals = useMemo(() => {
    const totals: LongWeldActivityCodes = { MATCUT: 0, CRANE: 0, ROLL: 0, FLON: 0, PREHEAT: 0, WELON: 0, BACMIL: 0, SUBLON: 0, MANLON: 0, NDE: 0 };
    let totalWelds = 0;
    let grandTotal = 0;

    weldsWithResults.forEach(weld => {
      const qty = weld.quantity;
      totalWelds += qty;
      if (weld.activityCodes) {
        Object.keys(totals).forEach(key => {
          const k = key as keyof LongWeldActivityCodes;
          totals[k] += weld.activityCodes![k] * qty;
        });
        grandTotal += Object.values(weld.activityCodes).reduce((sum, v) => sum + v, 0) * qty;
      }
    });

    return { totals, totalWelds, grandTotal };
  }, [weldsWithResults]);

  // Update single weld
  const updateWeld = useCallback((id: string, updates: Partial<LongWeldItem>) => {
    updateWelds(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, [updateWelds]);

  // Update geometry
  const updateGeometry = (field: keyof LongWeldGeometry, value: number | string) => {
    if (!currentWeld) return;
    updateWeld(currentWeld.id, {
      geometry: { ...currentWeld.geometry, [field]: value }
    });
  };

  // Update activity time
  const updateActivity = (field: keyof LongWeldActivityTimes, value: number) => {
    if (!currentWeld) return;
    updateWeld(currentWeld.id, {
      activityTimes: { ...currentWeld.activityTimes, [field]: value }
    });
  };

  // Update inside layer
  const updateInsideLayer = (index: number, field: 'process' | 'minWidth', value: string | number) => {
    if (!currentWeld) return;
    const newLayers = [...currentWeld.insideLayers];
    if (field === 'process') {
      newLayers[index] = { ...newLayers[index], process: value as Exclude<WeldProcess, 'Skip'> };
    } else {
      newLayers[index] = { ...newLayers[index], minWidth: value as number };
    }
    updateWeld(currentWeld.id, { insideLayers: newLayers });
  };

  const addInsideLayer = () => {
    if (!currentWeld) return;
    const lastLayer = currentWeld.insideLayers[currentWeld.insideLayers.length - 1];
    const newMinWidth = lastLayer ? lastLayer.minWidth + 10 : 0;
    updateWeld(currentWeld.id, {
      insideLayers: [...currentWeld.insideLayers, { process: 'SAW', minWidth: newMinWidth }]
    });
  };

  const removeInsideLayer = (index: number) => {
    if (!currentWeld || currentWeld.insideLayers.length <= 1) return;
    const newLayers = currentWeld.insideLayers.filter((_, i) => i !== index);
    // If we removed the first layer, reset the new first layer's minWidth to 0
    if (index === 0 && newLayers.length > 0) {
      newLayers[0] = { ...newLayers[0], minWidth: 0 };
    }
    updateWeld(currentWeld.id, { insideLayers: newLayers });
  };

  // Add new weld
  const addWeld = () => {
    const newTag = `Shell ${welds.length + 1} Long`;
    const newWeld = createNewLongWeld(newTag);
    updateWelds(prev => [...prev, newWeld]);
    setSelectedWeldId(newWeld.id);
    setActiveTab('list');
    setTimeout(() => {
      const input = document.querySelector(`input[data-id="${newWeld.id}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  };

  // Duplicate weld
  const duplicateWeld = (weld: LongWeldItem) => {
    const newWeld: LongWeldItem = {
      ...weld,
      id: generateId(),
      tag: `${weld.tag}-copy`,
      geometry: { ...weld.geometry },
      insideLayers: [...weld.insideLayers],
      activityTimes: { ...weld.activityTimes },
    };
    updateWelds(prev => [...prev, newWeld]);
  };

  // Delete weld
  const deleteWeld = (id: string) => {
    if (welds.length <= 1) return;
    updateWelds(prev => prev.filter(w => w.id !== id));
    if (selectedWeldId === id) {
      setSelectedWeldId(welds.find(w => w.id !== id)?.id || null);
    }
  };

  // Calculate groove info for display
  const grooveInfo = useMemo(() => {
    if (!currentWeld) return { rootWidth: 0, topWidth: 0 };
    const { geometry } = currentWeld;
    const depth = geometry.jointType.includes('double') 
      ? geometry.shellThickness * (geometry.splitRatio / 100) - geometry.rootFace / 2
      : geometry.shellThickness - geometry.rootFace;
    const bevelWidth = depth * Math.tan((geometry.insideBevelAngle * Math.PI) / 180);
    const isVee = geometry.jointType.includes('vee');
    const topWidth = isVee ? geometry.rootGap + 2 * bevelWidth : geometry.rootGap + bevelWidth;
    return { rootWidth: geometry.rootGap, topWidth };
  }, [currentWeld]);

  return (
    <div className="longwelds-module">
      <div className="module-toolbar">
        <div className="toolbar-left">
          <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>
            List
          </button>
          <button className={activeTab === 'editor' ? 'active' : ''} onClick={() => setActiveTab('editor')} disabled={!currentWeld}>
            Editor
          </button>
        </div>
        <div className="toolbar-center">
          <button className="btn-add" onClick={addWeld}>+ Add Long Weld</button>
        </div>
        <div className="toolbar-right">
          <span className="stats">{moduleTotals.totalWelds} welds • {moduleTotals.grandTotal.toFixed(1)} hrs</span>
        </div>
      </div>

      {/* LIST TAB */}
      {activeTab === 'list' && (
        <div className="weld-table-container">
          <table className="weld-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Qty</th>
                  <th>Thk</th>
                  <th>Length</th>
                  <th>Type</th>
                  <th>MATCUT</th>
                  <th>CRANE</th>
                  <th>ROLL</th>
                  <th>FLON</th>
                  <th>PREHEAT</th>
                  <th>WELON</th>
                  <th>BACMIL</th>
                  <th>SUBLON</th>
                  <th>MANLON</th>
                  <th>NDE</th>
                  <th>Total/ea</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {weldsWithResults.map((weld) => {
                  const codes = weld.activityCodes!;
                  const totalPer = Object.values(codes).reduce((s, v) => s + v, 0);
                  const totalQty = totalPer * weld.quantity;
                  return (
                    <tr key={weld.id} className={weld.id === selectedWeldId ? 'selected' : ''}>
                      <td>
                        <input
                          type="text"
                          className="tag-input"
                          value={weld.tag}
                          onChange={(e) => updateWeld(weld.id, { tag: e.target.value })}
                          data-id={weld.id}
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={weld.quantity}
                          onChange={(val) => updateWeld(weld.id, { quantity: val })}
                          min={1}
                          className="qty-input"
                        />
                      </td>
                      <td>{weld.geometry.shellThickness}</td>
                      <td>{weld.geometry.weldLength}</td>
                      <td>{weld.geometry.jointType === 'doublevee' ? 'DV' : 'SV'}</td>
                      <td>{codes.MATCUT.toFixed(2)}</td>
                      <td>{codes.CRANE.toFixed(2)}</td>
                      <td>{codes.ROLL.toFixed(2)}</td>
                      <td>{codes.FLON.toFixed(2)}</td>
                      <td>{codes.PREHEAT.toFixed(2)}</td>
                      <td className="weld-time">{codes.WELON.toFixed(2)}</td>
                      <td>{codes.BACMIL.toFixed(2)}</td>
                      <td className="weld-time">{codes.SUBLON > 0 ? codes.SUBLON.toFixed(2) : '-'}</td>
                      <td className="weld-time">{codes.MANLON > 0 ? codes.MANLON.toFixed(2) : '-'}</td>
                      <td>{codes.NDE.toFixed(2)}</td>
                      <td className="total-cell">{totalPer.toFixed(2)}</td>
                      <td className="total-cell">{totalQty.toFixed(2)}</td>
                      <td className="actions-cell">
                        <button className="btn-action" onClick={() => { setSelectedWeldId(weld.id); setActiveTab('editor'); }}>Edit</button>
                        <button className="btn-action" onClick={() => duplicateWeld(weld)}>Duplicate</button>
                        <button className="btn-action btn-delete" onClick={() => deleteWeld(weld.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td><strong>TOTALS</strong></td>
                  <td><strong>{moduleTotals.totalWelds}</strong></td>
                  <td colSpan={3}></td>
                  <td><strong>{moduleTotals.totals.MATCUT.toFixed(2)}</strong></td>
                  <td><strong>{moduleTotals.totals.CRANE.toFixed(2)}</strong></td>
                  <td><strong>{moduleTotals.totals.ROLL.toFixed(2)}</strong></td>
                  <td><strong>{moduleTotals.totals.FLON.toFixed(2)}</strong></td>
                  <td><strong>{moduleTotals.totals.PREHEAT.toFixed(2)}</strong></td>
                  <td className="weld-time"><strong>{moduleTotals.totals.WELON.toFixed(2)}</strong></td>
                  <td><strong>{moduleTotals.totals.BACMIL.toFixed(2)}</strong></td>
                  <td className="weld-time"><strong>{moduleTotals.totals.SUBLON.toFixed(2)}</strong></td>
                  <td className="weld-time"><strong>{moduleTotals.totals.MANLON.toFixed(2)}</strong></td>
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
      {activeTab === 'editor' && currentWeld && (
        <div className="editor-grid">
          <div className="editor-panel">
            <div className="weld-selector">
              <select value={selectedWeldId || ''} onChange={(e) => setSelectedWeldId(e.target.value)}>
                {welds.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.tag} ({w.geometry.shellThickness}×{w.geometry.weldLength})
                  </option>
                ))}
              </select>
            </div>

            <section className="section">
              <h3>📏 Dimensions</h3>
              <div className="input-row">
                <div className="input-group">
                  <label>Shell Thk (mm)</label>
                  <NumberInput value={currentWeld.geometry.shellThickness} onChange={(val) => updateGeometry('shellThickness', val)} />
                </div>
                <div className="input-group">
                  <label>Weld Length (mm)</label>
                  <NumberInput value={currentWeld.geometry.weldLength} onChange={(val) => updateGeometry('weldLength', val)} />
                </div>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Root Gap</label>
                  <NumberInput value={currentWeld.geometry.rootGap} step={0.5} onChange={(val) => updateGeometry('rootGap', val)} />
                </div>
                <div className="input-group">
                  <label>Root Face</label>
                  <NumberInput value={currentWeld.geometry.rootFace} step={0.5} onChange={(val) => updateGeometry('rootFace', val)} />
                </div>
              </div>
            </section>

            <section className="section">
              <h3>🔧 Joint Configuration</h3>
              <div className="input-group">
                <label>Joint Type</label>
                <select value={currentWeld.geometry.jointType} onChange={(e) => updateGeometry('jointType', e.target.value)}>
                  <option value="singlevee">Single Vee</option>
                  <option value="doublevee">Double Vee</option>
                </select>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>1st Side Angle (°)</label>
                  <NumberInput value={currentWeld.geometry.insideBevelAngle} onChange={(val) => updateGeometry('insideBevelAngle', val)} />
                </div>
                {currentWeld.geometry.jointType.includes('double') && (
                  <div className="input-group">
                    <label>2nd Side Angle (°)</label>
                    <NumberInput value={currentWeld.geometry.outsideBevelAngle} onChange={(val) => updateGeometry('outsideBevelAngle', val)} />
                  </div>
                )}
              </div>
              {currentWeld.geometry.jointType.includes('double') && (
                <div className="input-group">
                  <label>1st Side Split (%)</label>
                  <NumberInput value={currentWeld.geometry.splitRatio} min={40} max={80} step={5} onChange={(val) => updateGeometry('splitRatio', val)} />
                </div>
              )}
            </section>

            <section className="section">
              <h3>🔥 1st Side Weld Processes</h3>
              <div className="groove-info">Root: {grooveInfo.rootWidth.toFixed(0)}mm → Top: {grooveInfo.topWidth.toFixed(0)}mm</div>
              <div className="layers-header"><span>Process</span><span>Switch @</span><span></span></div>
              {currentWeld.insideLayers.map((layer, index) => (
                <div key={index} className="layer-row">
                  <select value={layer.process} onChange={(e) => updateInsideLayer(index, 'process', e.target.value)}>
                    {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="width-input">
                    <NumberInput value={layer.minWidth} min={0} step={1} onChange={(val) => updateInsideLayer(index, 'minWidth', val)} disabled={index === 0} />
                    <span className="unit-label">mm</span>
                  </div>
                  <button className="btn-remove" onClick={() => removeInsideLayer(index)} disabled={currentWeld.insideLayers.length <= 1}>×</button>
                </div>
              ))}
              <button className="btn-add-layer" onClick={addInsideLayer}>+ Add Process</button>
            </section>

            <section className="section">
              <h3>🔄 2nd Side Weld</h3>
              <div className="input-group">
                <label>2nd Side Process</label>
                <select value={currentWeld.outsideProcess} onChange={(e) => updateWeld(currentWeld.id, { outsideProcess: e.target.value as Exclude<WeldProcess, 'Skip'> })}>
                  {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <p className="side-note">
                {currentWeld.geometry.jointType === 'doublevee' 
                  ? 'Full weld after back-gouge' 
                  : 'Back weld / sealing pass after back-gouge'}
              </p>
            </section>
          </div>

          <div className="editor-panel center">
            <LongWeldDiagram 
              geometry={currentWeld.geometry} 
              insideLayers={currentWeld.insideLayers} 
              outsideProcess={currentWeld.outsideProcess} 
            />
            <p className="diagram-caption">
              Weld Length: {currentWeld.geometry.weldLength}mm
            </p>
          </div>

          <div className="editor-panel">
            <div className="result-card">
              <h3>TOTAL TIME</h3>
              <div className="value">
                {currentWeld.activityCodes 
                  ? Object.values(currentWeld.activityCodes).reduce((s, v) => s + v, 0).toFixed(1) 
                  : '0'}
              </div>
              <div className="unit">hours/weld</div>
            </div>

            <div className="results-summary">
              <div className="result-row">
                <span>1st Side Volume</span>
                <span>{((currentWeld.results?.insideVolume || 0) / 1000).toFixed(0)} cm³</span>
              </div>
              <div className="result-row">
                <span>2nd Side Volume</span>
                <span>{((currentWeld.results?.outsideVolume || 0) / 1000).toFixed(0)} cm³</span>
              </div>
              <div className="result-row">
                <span>Total Passes</span>
                <span>{currentWeld.results?.totalPasses || 0}</span>
              </div>
              <div className="result-row highlight">
                <span>Weld Time</span>
                <span>{currentWeld.results?.times.totalWeldTime.toFixed(2) || 0} hrs</span>
              </div>
            </div>

            <section className="section">
              <h3>⏱️ Activity Times</h3>
              <div className="activity-list">
                <div className="act-row">
                  <label>Cut Plate</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.cutPlate} onChange={(v) => updateActivity('cutPlate', v)} />
                </div>
                <div className="act-row">
                  <label>Clean Plate</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.cleanPlate} onChange={(v) => updateActivity('cleanPlate', v)} />
                </div>
                <div className="act-row">
                  <label>Move to Roll</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.moveToRoll} onChange={(v) => updateActivity('moveToRoll', v)} />
                </div>
                <div className="act-row">
                  <label>Roll</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.roll} onChange={(v) => updateActivity('roll', v)} />
                </div>
                <div className="act-row">
                  <label>Fit Long Weld</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.fitUp} onChange={(v) => updateActivity('fitUp', v)} />
                </div>
                <div className="act-row">
                  <label>Move to Weld Station</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.moveToWeld1} onChange={(v) => updateActivity('moveToWeld1', v)} />
                </div>
                <div className="act-row">
                  <label>Pre-heat 1st Side</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.preheat1stSide} onChange={(v) => updateActivity('preheat1stSide', v)} />
                </div>
                <div className="act-row calc">
                  <label>Weld 1st Side</label>
                  <span>{currentWeld.results?.times.insideTotalTime.toFixed(2) || 0}h</span>
                </div>
                <div className="act-row">
                  <label>Move to Mill</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.moveToMill} onChange={(v) => updateActivity('moveToMill', v)} />
                </div>
                <div className="act-row">
                  <label>Backmill</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.backMill} onChange={(v) => updateActivity('backMill', v)} />
                </div>
                <div className="act-row">
                  <label>Move to Weld Station</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.moveToWeld2} onChange={(v) => updateActivity('moveToWeld2', v)} />
                </div>
                <div className="act-row">
                  <label>Pre-heat 2nd Side</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.preheat2ndSide} onChange={(v) => updateActivity('preheat2ndSide', v)} />
                </div>
                <div className="act-row calc">
                  <label>Weld 2nd Side</label>
                  <span>{currentWeld.results?.times.outsideTotalTime.toFixed(2) || 0}h</span>
                </div>
                <div className="act-row">
                  <label>Move to Roll</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.moveToReRoll} onChange={(v) => updateActivity('moveToReRoll', v)} />
                </div>
                <div className="act-row">
                  <label>Re-Roll</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.reRoll} onChange={(v) => updateActivity('reRoll', v)} />
                </div>
                <div className="act-row">
                  <label>NDE</label>
                  <NumberInput step={0.25} value={currentWeld.activityTimes.nde} onChange={(v) => updateActivity('nde', v)} />
                </div>
              </div>
            </section>

            <section className="section">
              <h3>Activity Codes</h3>
              {currentWeld.activityCodes && (
                <div className="codes-grid">
                  <div className="code-box"><span className="code">MATCUT</span><span>{currentWeld.activityCodes.MATCUT.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">CRANE</span><span>{currentWeld.activityCodes.CRANE.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">ROLL</span><span>{currentWeld.activityCodes.ROLL.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">FLON</span><span>{currentWeld.activityCodes.FLON.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">PREHEAT</span><span>{currentWeld.activityCodes.PREHEAT.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">WELON</span><span>{currentWeld.activityCodes.WELON.toFixed(2)}h</span></div>
                  <div className="code-box"><span className="code">BACMIL</span><span>{currentWeld.activityCodes.BACMIL.toFixed(2)}h</span></div>
                  {currentWeld.activityCodes.SUBLON > 0 && (
                    <div className="code-box"><span className="code">SUBLON</span><span>{currentWeld.activityCodes.SUBLON.toFixed(2)}h</span></div>
                  )}
                  {currentWeld.activityCodes.MANLON > 0 && (
                    <div className="code-box"><span className="code">MANLON</span><span>{currentWeld.activityCodes.MANLON.toFixed(2)}h</span></div>
                  )}
                  <div className="code-box"><span className="code">NDE</span><span>{currentWeld.activityCodes.NDE.toFixed(2)}h</span></div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

