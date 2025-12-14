import { useState, useMemo, useCallback, useEffect } from 'react';
import { useProject } from '../../project';
import { NumberInput } from '../../shared/components';
import type { WeldProcess } from '../../shared/types';
import type { NozzleItem, NozzlesModuleData, NozzleActivityCodes } from './types';
import { DEFAULT_NOZZLE_GEOMETRY, DEFAULT_NOZZLE_ACTIVITY_TIMES, DEFAULT_PROCESS_LAYERS } from './types';
import { WeldDiagram } from './components/WeldDiagram';
import { calculateNozzle, calculateActivityCodes } from './engine';
import './NozzlesModule.css';

const PROCESSES: Exclude<WeldProcess, 'Skip'>[] = ['GTAW', 'SMAW', 'FCAW', 'GMAW', 'SAW'];

type NozzleView = 'list' | 'editor';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function createNewNozzle(tag: string): NozzleItem {
  return {
    id: generateId(),
    tag,
    quantity: 1,
    geometry: { ...DEFAULT_NOZZLE_GEOMETRY },
    insideLayers: [...DEFAULT_PROCESS_LAYERS],
    outsideProcess: 'FCAW',
    filletProcess: 'FCAW',
    activityTimes: { ...DEFAULT_NOZZLE_ACTIVITY_TIMES },
  };
}

export function NozzlesModule() {
  const { getModuleData, setModuleData, updateModuleSummary, settings, currentProject } = useProject();
  
  const [view, setView] = useState<NozzleView>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load nozzles from project or initialize with empty
  const moduleData = getModuleData<NozzlesModuleData>('nozzles');
  const [nozzles, setNozzles] = useState<NozzleItem[]>(
    moduleData?.nozzles || [createNewNozzle('N1')]
  );

  // Sync with project when it changes
  useEffect(() => {
    const data = getModuleData<NozzlesModuleData>('nozzles');
    if (data?.nozzles) {
      setNozzles(data.nozzles);
      if (!selectedId && data.nozzles.length > 0) {
        setSelectedId(data.nozzles[0].id);
      }
    }
  }, [currentProject?.id]);

  // Save to project whenever nozzles change
  useEffect(() => {
    setModuleData<NozzlesModuleData>('nozzles', { nozzles });
  }, [nozzles, setModuleData]);

  // Calculate results for all nozzles
  const nozzlesWithResults = useMemo(() => {
    return nozzles.map(nozzle => {
      const results = calculateNozzle(nozzle, settings);
      const activityCodes = calculateActivityCodes(nozzle.activityTimes, results.times);
      return { ...nozzle, results, activityCodes };
    });
  }, [nozzles, settings]);

  // Update module summary
  useEffect(() => {
    const totalHours = nozzlesWithResults.reduce((sum, n) => {
      const codes = n.activityCodes || {} as NozzleActivityCodes;
      const perNozzle = Object.values(codes).reduce((s, v) => s + v, 0);
      return sum + perNozzle * n.quantity;
    }, 0);

    const activityBreakdown: Record<string, number> = {};
    nozzlesWithResults.forEach(n => {
      if (n.activityCodes) {
        Object.entries(n.activityCodes).forEach(([code, hours]) => {
          activityBreakdown[code] = (activityBreakdown[code] || 0) + hours * n.quantity;
        });
      }
    });

    updateModuleSummary('nozzles', {
      moduleId: 'nozzles',
      moduleName: 'Nozzles',
      itemCount: nozzles.reduce((sum, n) => sum + n.quantity, 0),
      totalHours,
      activityBreakdown,
    });
  }, [nozzlesWithResults, updateModuleSummary]);

  // Get selected nozzle
  const selectedNozzle = useMemo(() => 
    nozzlesWithResults.find(n => n.id === selectedId) || nozzlesWithResults[0],
    [nozzlesWithResults, selectedId]
  );

  // Calculate job totals
  const jobTotals = useMemo(() => {
    const totals: NozzleActivityCodes = { CUTNOZZ: 0, FNOZZ: 0, PREHEAT: 0, WNOZZ: 0, BACGRI: 0, MATCUT: 0, NDE: 0 };
    let totalNozzles = 0;
    let grandTotal = 0;

    nozzlesWithResults.forEach(nozzle => {
      const qty = nozzle.quantity;
      totalNozzles += qty;
      if (nozzle.activityCodes) {
        Object.keys(totals).forEach(key => {
          const k = key as keyof NozzleActivityCodes;
          totals[k] += nozzle.activityCodes![k] * qty;
        });
        grandTotal += Object.values(nozzle.activityCodes).reduce((sum, v) => sum + v, 0) * qty;
      }
    });

    return { totals, totalNozzles, grandTotal };
  }, [nozzlesWithResults]);

  // Update nozzle
  const updateNozzle = useCallback((id: string, updates: Partial<NozzleItem>) => {
    setNozzles(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  // Add nozzle
  const addNozzle = () => {
    const newTag = `N${nozzles.length + 1}`;
    const newNozzle = createNewNozzle(newTag);
    setNozzles(prev => [...prev, newNozzle]);
    setSelectedId(newNozzle.id);
    setTimeout(() => {
      const input = document.querySelector(`input.tag-input[data-id="${newNozzle.id}"]`) as HTMLInputElement;
      if (input) { input.focus(); input.select(); }
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
    if (selectedId === id) {
      setSelectedId(nozzles.find(n => n.id !== id)?.id || null);
    }
  };


  // Groove info for current nozzle
  const grooveInfo = useMemo(() => {
    if (!selectedNozzle) return { rootWidth: 0, topWidth: 0 };
    const { geometry } = selectedNozzle;
    const insideDepth = geometry.jointType === 'doublebevel'
      ? geometry.shellThick * (geometry.splitRatio / 100) - geometry.rootFace / 2
      : geometry.shellThick - geometry.rootFace;
    const bevelAngle = geometry.jointType === 'doublebevel' ? geometry.insideBevelAngle : geometry.singleBevelAngle;
    const maxBevelWidth = insideDepth * Math.tan((bevelAngle * Math.PI) / 180);
    return { rootWidth: geometry.rootGap, topWidth: geometry.rootGap + maxBevelWidth };
  }, [selectedNozzle]);

  // Update geometry
  const updateGeometry = (field: string, value: number | string) => {
    if (!selectedNozzle) return;
    updateNozzle(selectedNozzle.id, {
      geometry: { ...selectedNozzle.geometry, [field]: value }
    });
  };

  // Update activity
  const updateActivity = (field: string, value: number) => {
    if (!selectedNozzle) return;
    updateNozzle(selectedNozzle.id, {
      activityTimes: { ...selectedNozzle.activityTimes, [field]: value }
    });
  };

  // Update layer
  const updateInsideLayer = (index: number, field: 'process' | 'minWidth', value: string | number) => {
    if (!selectedNozzle) return;
    const newLayers = [...selectedNozzle.insideLayers];
    if (field === 'process') {
      newLayers[index] = { ...newLayers[index], process: value as Exclude<WeldProcess, 'Skip'> };
    } else {
      newLayers[index] = { ...newLayers[index], minWidth: value as number };
    }
    updateNozzle(selectedNozzle.id, { insideLayers: newLayers });
  };

  const addInsideLayer = () => {
    if (!selectedNozzle) return;
    const lastLayer = selectedNozzle.insideLayers[selectedNozzle.insideLayers.length - 1];
    const newMinWidth = lastLayer ? lastLayer.minWidth + 10 : 0;
    updateNozzle(selectedNozzle.id, {
      insideLayers: [...selectedNozzle.insideLayers, { process: 'FCAW', minWidth: newMinWidth }]
    });
  };

  const removeInsideLayer = (index: number) => {
    if (!selectedNozzle || selectedNozzle.insideLayers.length <= 1) return;
    const newLayers = selectedNozzle.insideLayers.filter((_, i) => i !== index);
    // If we removed the first layer, reset the new first layer's minWidth to 0
    if (index === 0 && newLayers.length > 0) {
      newLayers[0] = { ...newLayers[0], minWidth: 0 };
    }
    updateNozzle(selectedNozzle.id, { insideLayers: newLayers });
  };

  return (
    <div className="nozzles-module">
      <div className="module-toolbar">
        <div className="toolbar-left">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>📋 List</button>
          <button className={view === 'editor' ? 'active' : ''} onClick={() => setView('editor')}>✏️ Editor</button>
        </div>
        <div className="toolbar-center">
          <button className="btn-add" onClick={addNozzle}>+ Add Nozzle</button>
        </div>
        <div className="toolbar-right">
          <span className="stats">{jobTotals.totalNozzles} nozzles • {jobTotals.grandTotal.toFixed(1)} hrs</span>
        </div>
      </div>

      {view === 'list' && (
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
                  <tr key={nozzle.id} className={nozzle.id === selectedId ? 'selected' : ''}>
                    <td>
                      <input type="text" className="tag-input" data-id={nozzle.id} value={nozzle.tag} onChange={(e) => updateNozzle(nozzle.id, { tag: e.target.value })} />
                    </td>
                    <td>
                      <input type="number" className="qty-input" min="1" value={nozzle.quantity} onChange={(e) => updateNozzle(nozzle.id, { quantity: parseInt(e.target.value) || 1 })} />
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
                      <button onClick={() => { setSelectedId(nozzle.id); setView('editor'); }} title="Edit">✏️</button>
                      <button onClick={() => duplicateNozzle(nozzle)} title="Duplicate">📋</button>
                      <button onClick={() => deleteNozzle(nozzle.id)} disabled={nozzles.length <= 1} title="Delete">🗑️</button>
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
      )}

      {view === 'editor' && selectedNozzle && (
        <div className="editor-grid">
          <div className="editor-panel left">
            <div className="nozzle-selector">
              <select value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
                {nozzles.map(n => <option key={n.id} value={n.id}>{n.tag} ({n.geometry.nozzleOD}×{n.geometry.shellThick})</option>)}
              </select>
            </div>

            <section className="section">
              <h3>📏 Dimensions</h3>
              <div className="input-row">
                <div className="input-group"><label>Nozzle OD</label><NumberInput value={selectedNozzle.geometry.nozzleOD} onChange={(v) => updateGeometry('nozzleOD', v)} /></div>
                <div className="input-group"><label>Shell Thk</label><NumberInput value={selectedNozzle.geometry.shellThick} onChange={(v) => updateGeometry('shellThick', v)} /></div>
              </div>
              <div className="input-row">
                <div className="input-group"><label>Root Gap</label><NumberInput value={selectedNozzle.geometry.rootGap} step={0.5} onChange={(v) => updateGeometry('rootGap', v)} /></div>
                <div className="input-group"><label>Root Face</label><NumberInput value={selectedNozzle.geometry.rootFace} step={0.5} onChange={(v) => updateGeometry('rootFace', v)} /></div>
              </div>
              <div className="input-group"><label>Fillet Throat</label><NumberInput value={selectedNozzle.geometry.filletThroat} step={0.5} onChange={(v) => updateGeometry('filletThroat', v)} /></div>
            </section>

            <section className="section">
              <h3>🔧 Bevel</h3>
              <div className="input-group">
                <label>Joint Type</label>
                <select value={selectedNozzle.geometry.jointType} onChange={(e) => updateGeometry('jointType', e.target.value)}>
                  <option value="singlebevel">Single Bevel</option>
                  <option value="doublebevel">Double Bevel</option>
                </select>
              </div>
              {selectedNozzle.geometry.jointType === 'singlebevel' ? (
                <div className="input-group"><label>Bevel Angle (°)</label><NumberInput value={selectedNozzle.geometry.singleBevelAngle} onChange={(v) => updateGeometry('singleBevelAngle', v)} /></div>
              ) : (
                <>
                  <div className="input-row">
                    <div className="input-group"><label>1st Side (°)</label><NumberInput value={selectedNozzle.geometry.insideBevelAngle} onChange={(v) => updateGeometry('insideBevelAngle', v)} /></div>
                    <div className="input-group"><label>2nd Side (°)</label><NumberInput value={selectedNozzle.geometry.outsideBevelAngle} onChange={(v) => updateGeometry('outsideBevelAngle', v)} /></div>
                  </div>
                  <div className="input-group"><label>1st Side Split (%)</label><NumberInput value={selectedNozzle.geometry.splitRatio} min={40} max={80} step={5} onChange={(v) => updateGeometry('splitRatio', v)} /></div>
                </>
              )}
            </section>

            <section className="section">
              <h3>🔥 1st Side Weld</h3>
              <div className="groove-info">Root: {grooveInfo.rootWidth.toFixed(0)}mm → Top: {grooveInfo.topWidth.toFixed(0)}mm</div>
              <div className="layers-header"><span>Process</span><span>Switch @</span><span></span></div>
              {selectedNozzle.insideLayers.map((layer, index) => (
                <div key={index} className="layer-row">
                  <select value={layer.process} onChange={(e) => updateInsideLayer(index, 'process', e.target.value)}>
                    {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="width-input">
                    <NumberInput value={layer.minWidth} min={0} step={1} onChange={(v) => updateInsideLayer(index, 'minWidth', v)} disabled={index === 0} />
                    <span>mm</span>
                  </div>
                  <button className="btn-remove" onClick={() => removeInsideLayer(index)} disabled={selectedNozzle.insideLayers.length <= 1}>×</button>
                </div>
              ))}
              <button className="btn-add-layer" onClick={addInsideLayer}>+ Add Process</button>
            </section>

            <section className="section">
              <h3>🔄 2nd Side & Fillet</h3>
              {selectedNozzle.geometry.jointType === 'doublebevel' && (
                <div className="input-group">
                  <label>2nd Side (after gouge)</label>
                  <select value={selectedNozzle.outsideProcess} onChange={(e) => updateNozzle(selectedNozzle.id, { outsideProcess: e.target.value as Exclude<WeldProcess, 'Skip'> })}>
                    {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
              <div className="input-group">
                <label>Fillet Weld</label>
                <select value={selectedNozzle.filletProcess} onChange={(e) => updateNozzle(selectedNozzle.id, { filletProcess: e.target.value as Exclude<WeldProcess, 'Skip'> })}>
                  {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </section>
          </div>

          <div className="editor-panel center">
            <WeldDiagram geometry={selectedNozzle.geometry} insideLayers={selectedNozzle.insideLayers} outsideProcess={selectedNozzle.outsideProcess} filletProcess={selectedNozzle.filletProcess} />
            <p className="diagram-caption">Circumference: {selectedNozzle.results?.circumference.toFixed(0) || 0}mm</p>
          </div>

          <div className="editor-panel right">
            <div className="result-card">
              <h3>TOTAL TIME</h3>
              <div className="value">{selectedNozzle.activityCodes ? Object.values(selectedNozzle.activityCodes).reduce((s, v) => s + v, 0).toFixed(1) : '0'}</div>
              <div className="unit">hours/nozzle</div>
            </div>

            <section className="section">
              <h3>⏱️ Activity Times</h3>
              <div className="activity-list">
                <div className="act-row"><label>Mark Position</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.markPosition} onChange={(v) => updateActivity('markPosition', v)} /></div>
                <div className="act-row"><label>Cut & Bevel</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.cutAndBevel} onChange={(v) => updateActivity('cutAndBevel', v)} /></div>
                <div className="act-row"><label>Clean Bevel</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.grindBevelClean} onChange={(v) => updateActivity('grindBevelClean', v)} /></div>
                <div className="act-row"><label>Fit Nozzle</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.fitNozzle} onChange={(v) => updateActivity('fitNozzle', v)} /></div>
                <div className="act-row"><label>Pre-heat 1st Side</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.preheat1} onChange={(v) => updateActivity('preheat1', v)} /></div>
                <div className="act-row calc"><label>Weld 1st Side</label><span>{selectedNozzle.results?.times.insideTime.toFixed(2) || 0}h</span></div>
                <div className="act-row"><label>Grind 1st Side Flush</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.grind1stSide} onChange={(v) => updateActivity('grind1stSide', v)} /></div>
                <div className="act-row"><label>Backgrind</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.backGouge} onChange={(v) => updateActivity('backGouge', v)} /></div>
                <div className="act-row"><label>Pre-heat 2nd Side</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.preheat2} onChange={(v) => updateActivity('preheat2', v)} /></div>
                <div className="act-row calc"><label>Weld 2nd Side</label><span>{selectedNozzle.results?.times.outsideTime.toFixed(2) || 0}h</span></div>
                <div className="act-row"><label>Grind 2nd Side Flush</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.grind2ndSide} onChange={(v) => updateActivity('grind2ndSide', v)} /></div>
                <div className="act-row calc"><label>Fillet</label><span>{selectedNozzle.results?.times.filletTime.toFixed(2) || 0}h</span></div>
                <div className="act-row"><label>NDE</label><NumberInput step={0.25} value={selectedNozzle.activityTimes.nde} onChange={(v) => updateActivity('nde', v)} /></div>
              </div>
            </section>

            <section className="section">
              <h3>📊 Activity Codes</h3>
              {selectedNozzle.activityCodes && (
                <div className="codes-grid">
                  {Object.entries(selectedNozzle.activityCodes).map(([code, hours]) => (
                    <div key={code} className="code-box"><span className="code">{code}</span><span>{hours.toFixed(2)}h</span></div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

