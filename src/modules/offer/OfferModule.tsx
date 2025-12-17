import { useState, useEffect } from 'react';
import { useProject } from '../../project';
import {
  type OfferData,
  type OfferNote,
  type OfferNDEItem,
  type OfferMaterialItem,
  type OfferMilestoneItem,
  type OfferPricingItem,
  createDefaultOfferData,
} from './types';
import { generateOfferPDF } from './pdfGenerator';
import './OfferModule.css';

type SectionId = 
  | 'project' 
  | 'equipment' 
  | 'engineering' 
  | 'qa' 
  | 'codes' 
  | 'materials' 
  | 'nde' 
  | 'heat' 
  | 'testing' 
  | 'surface' 
  | 'transport' 
  | 'notes' 
  | 'pricing' 
  | 'terms';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'project', label: 'Project Details' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'qa', label: 'Quality Assurance' },
  { id: 'codes', label: 'Design Codes' },
  { id: 'materials', label: 'Materials' },
  { id: 'nde', label: 'NDE / Inspection' },
  { id: 'heat', label: 'Heat Treatment' },
  { id: 'testing', label: 'Pressure Testing' },
  { id: 'surface', label: 'Surface Protection' },
  { id: 'transport', label: 'Transport' },
  { id: 'notes', label: 'Notes' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'terms', label: 'Terms' },
];

export function OfferModule() {
  const { currentProject, save } = useProject();
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(['project']));
  
  // Load offer data from project or create default
  const [offerData, setOfferData] = useState<OfferData>(() => {
    const stored = currentProject?.modules?.offer as OfferData | undefined;
    if (stored) return stored;
    
    // Create default and auto-populate from project
    const defaultData = createDefaultOfferData();
    if (currentProject) {
      defaultData.projectDetails.projectName = currentProject.vesselName || '';
      defaultData.projectDetails.ourReference = currentProject.jobNumber || '';
    }
    return defaultData;
  });

  // Auto-populate from estimate data
  useEffect(() => {
    if (!currentProject) return;

    // Auto-populate equipment from modules
    const equipment: { tag: string; module: string }[] = [];
    
    // Nozzles
    const nozzles = currentProject.modules?.nozzles as { tag: string }[] | undefined;
    if (nozzles?.length) {
      nozzles.forEach(n => equipment.push({ tag: n.tag, module: 'Nozzle' }));
    }
    
    // Long welds
    const longWelds = currentProject.modules?.longwelds as { tag: string }[] | undefined;
    if (longWelds?.length) {
      longWelds.forEach(w => equipment.push({ tag: w.tag, module: 'Long Weld' }));
    }
    
    // Circ welds
    const circWelds = currentProject.modules?.circwelds as { tag: string }[] | undefined;
    if (circWelds?.length) {
      circWelds.forEach(w => equipment.push({ tag: w.tag, module: 'Circ Weld' }));
    }
    
    // Pipe joints
    const pipeJoints = currentProject.modules?.pipejoints as { tag: string }[] | undefined;
    if (pipeJoints?.length) {
      pipeJoints.forEach(p => equipment.push({ tag: p.tag, module: 'Pipe Joint' }));
    }

    // Update offer data with auto-populated equipment
    setOfferData(prev => ({
      ...prev,
      projectDetails: {
        ...prev.projectDetails,
        projectName: prev.projectDetails.projectName || currentProject.vesselName || '',
        ourReference: prev.projectDetails.ourReference || currentProject.jobNumber || '',
      },
    }));
  }, [currentProject]);

  // Save offer data to project
  const saveOfferData = () => {
    if (!currentProject) return;
    currentProject.modules.offer = offerData;
    save();
  };

  // Toggle section expansion
  const toggleSection = (sectionId: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Update nested offer data
  const updateOfferData = <K extends keyof OfferData>(
    section: K,
    updates: Partial<OfferData[K]>
  ) => {
    setOfferData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
  };

  // Get equipment items from estimate
  const getEstimateEquipment = () => {
    if (!currentProject) return [];
    const items: { tag: string; module: string; count: number }[] = [];
    
    const nozzles = currentProject.modules?.nozzles as { tag: string; quantity?: number }[] | undefined;
    if (nozzles?.length) {
      items.push({ tag: 'Nozzles', module: 'nozzles', count: nozzles.length });
    }
    
    const longWelds = currentProject.modules?.longwelds as { tag: string }[] | undefined;
    if (longWelds?.length) {
      items.push({ tag: 'Long Welds', module: 'longwelds', count: longWelds.length });
    }
    
    const circWelds = currentProject.modules?.circwelds as { tag: string }[] | undefined;
    if (circWelds?.length) {
      items.push({ tag: 'Circ Welds', module: 'circwelds', count: circWelds.length });
    }
    
    const pipeJoints = currentProject.modules?.pipejoints as { tag: string }[] | undefined;
    if (pipeJoints?.length) {
      items.push({ tag: 'Pipe Joints', module: 'pipejoints', count: pipeJoints.length });
    }
    
    return items;
  };

  // Handle NDE coverage change
  const updateNDECoverage = (key: keyof typeof offerData.nde, coverage: '100%' | 'Spot' | 'None') => {
    setOfferData(prev => ({
      ...prev,
      nde: {
        ...prev.nde,
        [key]: { ...prev.nde[key], coverage },
      },
    }));
  };

  // Handle note toggle
  const toggleNote = (noteId: string) => {
    setOfferData(prev => ({
      ...prev,
      notes: prev.notes.map(n => 
        n.id === noteId ? { ...n, included: !n.included } : n
      ),
    }));
  };

  // Add custom note
  const [customNoteText, setCustomNoteText] = useState('');
  const addCustomNote = (category: 'offer' | 'project' | 'standard') => {
    if (!customNoteText.trim()) return;
    const newNote: OfferNote = {
      id: `custom-${Date.now()}`,
      category,
      text: customNoteText.trim(),
      included: true,
    };
    setOfferData(prev => ({
      ...prev,
      notes: [...prev.notes, newNote],
    }));
    setCustomNoteText('');
  };

  // Materials management
  const addMaterial = () => {
    const newItem: OfferMaterialItem = {
      component: '',
      specification: '',
      origin: 'Australian',
      included: true,
    };
    setOfferData(prev => ({
      ...prev,
      materials: {
        ...prev.materials,
        items: [...prev.materials.items, newItem],
      },
    }));
  };

  const updateMaterial = (index: number, updates: Partial<OfferMaterialItem>) => {
    setOfferData(prev => ({
      ...prev,
      materials: {
        ...prev.materials,
        items: prev.materials.items.map((item, i) => 
          i === index ? { ...item, ...updates } : item
        ),
      },
    }));
  };

  const removeMaterial = (index: number) => {
    setOfferData(prev => ({
      ...prev,
      materials: {
        ...prev.materials,
        items: prev.materials.items.filter((_, i) => i !== index),
      },
    }));
  };

  // Pricing management
  const addPricingItem = () => {
    const newItem: OfferPricingItem = {
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      included: true,
    };
    setOfferData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        items: [...prev.pricing.items, newItem],
      },
    }));
  };

  const updatePricingItem = (index: number, updates: Partial<OfferPricingItem>) => {
    setOfferData(prev => {
      const items = prev.pricing.items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...updates };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      });
      const subtotal = items.filter(i => i.included).reduce((sum, i) => sum + i.total, 0);
      const total = subtotal - prev.pricing.discount;
      return {
        ...prev,
        pricing: { ...prev.pricing, items, subtotal, total },
      };
    });
  };

  const removePricingItem = (index: number) => {
    setOfferData(prev => {
      const items = prev.pricing.items.filter((_, i) => i !== index);
      const subtotal = items.filter(i => i.included).reduce((sum, i) => sum + i.total, 0);
      const total = subtotal - prev.pricing.discount;
      return {
        ...prev,
        pricing: { ...prev.pricing, items, subtotal, total },
      };
    });
  };

  // Milestone management
  const updateMilestone = (index: number, updates: Partial<OfferMilestoneItem>) => {
    setOfferData(prev => ({
      ...prev,
      milestones: {
        ...prev.milestones,
        milestones: prev.milestones.milestones.map((m, i) =>
          i === index ? { ...m, ...updates } : m
        ),
      },
    }));
  };

  const estimateEquipment = getEstimateEquipment();

  // Render section content
  const renderSectionContent = (sectionId: SectionId) => {
    switch (sectionId) {
      case 'project':
        return (
          <div className="section-content">
            <div className="form-row">
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={offerData.projectDetails.projectName}
                  onChange={(e) => updateOfferData('projectDetails', { projectName: e.target.value })}
                  placeholder="e.g., NH3 Condenser"
                />
              </div>
              <div className="form-group">
                <label>Client</label>
                <input
                  type="text"
                  value={offerData.projectDetails.client}
                  onChange={(e) => updateOfferData('projectDetails', { client: e.target.value })}
                  placeholder="Client company name"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Attention</label>
                <input
                  type="text"
                  value={offerData.projectDetails.attention}
                  onChange={(e) => updateOfferData('projectDetails', { attention: e.target.value })}
                  placeholder="Contact person"
                />
              </div>
              <div className="form-group">
                <label>Our Reference</label>
                <input
                  type="text"
                  value={offerData.projectDetails.ourReference}
                  onChange={(e) => updateOfferData('projectDetails', { ourReference: e.target.value })}
                  placeholder="e.g., VS1792"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Revision</label>
                <input
                  type="text"
                  value={offerData.projectDetails.revision}
                  onChange={(e) => updateOfferData('projectDetails', { revision: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={offerData.projectDetails.date}
                  onChange={(e) => updateOfferData('projectDetails', { date: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 'equipment':
        return (
          <div className="section-content">
            {estimateEquipment.length > 0 && (
              <div className="equipment-auto-list">
                <h4>Auto-detected from Estimate</h4>
                <div className="equipment-chips">
                  {estimateEquipment.map((item, i) => (
                    <span key={i} className="equipment-chip">
                      {item.tag} ({item.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Equipment Description (for offer sheet)</label>
                <textarea
                  value={offerData.equipment.map(e => `${e.quantity}x ${e.tag} - ${e.description}`).join('\n')}
                  onChange={(e) => {
                    // Parse textarea into equipment items
                    const lines = e.target.value.split('\n').filter(l => l.trim());
                    const items = lines.map(line => ({
                      tag: line,
                      description: '',
                      quantity: 1,
                      included: true,
                    }));
                    setOfferData(prev => ({ ...prev, equipment: items }));
                  }}
                  placeholder="Enter equipment line items, one per line&#10;e.g., Quantity one [1], 4525-HE-2514"
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 'engineering':
        return (
          <div className="section-content">
            <div className="checkbox-grid">
              {[
                { key: 'mechanicalDesign', label: 'Mechanical design' },
                { key: 'thermalDesign', label: 'Thermal design' },
                { key: 'feaAnalysis', label: 'FEA/FEM analysis' },
                { key: 'vibrationAnalysis', label: 'Vibration analysis' },
                { key: 'thirdPartyVerification', label: '3rd Party verification of mechanical design' },
                { key: 'designRegistration', label: 'Design registration' },
                { key: 'detailDrawings', label: 'Detail drawings' },
                { key: 'siteSurvey', label: 'Site survey or measurement' },
              ].map(({ key, label }) => (
                <div 
                  key={key} 
                  className={`checkbox-item ${offerData.engineering[key as keyof typeof offerData.engineering] ? 'checked' : ''}`}
                  onClick={() => updateOfferData('engineering', { 
                    [key]: !offerData.engineering[key as keyof typeof offerData.engineering] 
                  })}
                >
                  <input
                    type="checkbox"
                    checked={offerData.engineering[key as keyof typeof offerData.engineering]}
                    onChange={() => {}}
                  />
                  <label>{label}</label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'qa':
        return (
          <div className="section-content">
            <div className="checkbox-grid">
              {[
                { key: 'qaMdcDocs', label: 'QA Manual, ITP, weld procedures, MDR etc.' },
                { key: 'asmeUStamp', label: 'ASME U Stamp' },
                { key: 'asmeU2Stamp', label: 'ASME U2 Stamp' },
                { key: 'thirdPartyInspection', label: '3rd Party Inspection' },
              ].map(({ key, label }) => (
                <div 
                  key={key} 
                  className={`checkbox-item ${offerData.qualityAssurance[key as keyof typeof offerData.qualityAssurance] ? 'checked' : ''}`}
                  onClick={() => updateOfferData('qualityAssurance', { 
                    [key]: !offerData.qualityAssurance[key as keyof typeof offerData.qualityAssurance] 
                  })}
                >
                  <input
                    type="checkbox"
                    checked={offerData.qualityAssurance[key as keyof typeof offerData.qualityAssurance]}
                    onChange={() => {}}
                  />
                  <label>{label}</label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'codes':
        return (
          <div className="section-content">
            <div className="checkbox-grid">
              {[
                { key: 'as1210', label: 'AS1210-2010' },
                { key: 'asmeVIIIDiv1', label: 'ASME Sect VIII Div 1' },
                { key: 'asmeVIIIDiv2', label: 'ASME Sect VIII Div 2' },
                { key: 'asmePVHO1', label: 'ASME PVHO-1' },
                { key: 'pd5500', label: 'PD5500' },
              ].map(({ key, label }) => (
                <div 
                  key={key} 
                  className={`checkbox-item ${offerData.designCodes[key as keyof typeof offerData.designCodes] ? 'checked' : ''}`}
                  onClick={() => updateOfferData('designCodes', { 
                    [key]: !offerData.designCodes[key as keyof typeof offerData.designCodes] 
                  })}
                >
                  <input
                    type="checkbox"
                    checked={offerData.designCodes[key as keyof typeof offerData.designCodes] as boolean}
                    onChange={() => {}}
                  />
                  <label>{label}</label>
                </div>
              ))}
            </div>
            <div className="form-row" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>TEMA Class</label>
                <select
                  value={offerData.designCodes.temaClass}
                  onChange={(e) => updateOfferData('designCodes', { temaClass: e.target.value as 'R' | 'C' | 'B' | 'none' })}
                >
                  <option value="none">Not applicable</option>
                  <option value="R">TEMA R</option>
                  <option value="C">TEMA C</option>
                  <option value="B">TEMA B</option>
                </select>
              </div>
              <div className="form-group">
                <label>Other Code</label>
                <input
                  type="text"
                  value={offerData.designCodes.otherCode}
                  onChange={(e) => updateOfferData('designCodes', { otherCode: e.target.value })}
                  placeholder="Specify other code"
                />
              </div>
            </div>
          </div>
        );

      case 'materials':
        return (
          <div className="section-content">
            <div className="subsection">
              <h4>Material Certification</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Certification Type</label>
                  <select
                    value={offerData.materials.certType}
                    onChange={(e) => updateOfferData('materials', { certType: e.target.value as 'EN10204_3.1' | 'EN10204_3.2' })}
                  >
                    <option value="EN10204_3.1">EN10204 3.1</option>
                    <option value="EN10204_3.2">EN10204 3.2</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Country Exclusions</label>
                  <input
                    type="text"
                    value={offerData.materials.countryExclusions.join(', ')}
                    onChange={(e) => updateOfferData('materials', { 
                      countryExclusions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="e.g., China, India"
                  />
                </div>
              </div>
            </div>

            <div className="subsection">
              <h4>Material Items</h4>
              <div className="materials-list">
                {offerData.materials.items.map((item, index) => (
                  <div key={index} className="material-item">
                    <input
                      type="text"
                      value={item.component}
                      onChange={(e) => updateMaterial(index, { component: e.target.value })}
                      placeholder="Component (e.g., Shell Plate)"
                    />
                    <input
                      type="text"
                      value={item.specification}
                      onChange={(e) => updateMaterial(index, { specification: e.target.value })}
                      placeholder="Specification (e.g., AS1548PT460NR)"
                    />
                    <select
                      value={item.origin}
                      onChange={(e) => updateMaterial(index, { origin: e.target.value })}
                    >
                      <option value="Australian">Australian</option>
                      <option value="Korean">Korean</option>
                      <option value="European">European</option>
                      <option value="USA">USA</option>
                      <option value="Australian stockist">Australian stockist</option>
                    </select>
                    <button className="btn-remove-material" onClick={() => removeMaterial(index)}>×</button>
                  </div>
                ))}
                <button className="btn-add-material" onClick={addMaterial}>+ Add Material</button>
              </div>
            </div>

            <div className="subsection">
              <div className="checkbox-item" onClick={() => updateOfferData('materials', { freeIssue: !offerData.materials.freeIssue })}>
                <input type="checkbox" checked={offerData.materials.freeIssue} onChange={() => {}} />
                <label>Free issue materials</label>
              </div>
              {offerData.materials.freeIssue && (
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <textarea
                    value={offerData.materials.freeIssueItems}
                    onChange={(e) => updateOfferData('materials', { freeIssueItems: e.target.value })}
                    placeholder="Describe free issue items..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'nde':
        return (
          <div className="section-content">
            <table className="nde-table">
              <thead>
                <tr>
                  <th>Inspection Type</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(offerData.nde).map(([key, item]) => (
                  <tr key={key}>
                    <td>{(item as OfferNDEItem).description}</td>
                    <td>
                      <select
                        className="coverage-select"
                        value={(item as OfferNDEItem).coverage}
                        onChange={(e) => updateNDECoverage(key as keyof typeof offerData.nde, e.target.value as '100%' | 'Spot' | 'None')}
                      >
                        <option value="100%">☑ 100%</option>
                        <option value="Spot">☑ Spot</option>
                        <option value="None">☐ Excluded</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'heat':
        return (
          <div className="section-content">
            <div className="checkbox-grid">
              <div 
                className={`checkbox-item ${offerData.heatTreatment.pwhtShellside ? 'checked' : ''}`}
                onClick={() => updateOfferData('heatTreatment', { pwhtShellside: !offerData.heatTreatment.pwhtShellside })}
              >
                <input type="checkbox" checked={offerData.heatTreatment.pwhtShellside} onChange={() => {}} />
                <label>PWHT - Shellside</label>
              </div>
              <div 
                className={`checkbox-item ${offerData.heatTreatment.pwhtTubeside ? 'checked' : ''}`}
                onClick={() => updateOfferData('heatTreatment', { pwhtTubeside: !offerData.heatTreatment.pwhtTubeside })}
              >
                <input type="checkbox" checked={offerData.heatTreatment.pwhtTubeside} onChange={() => {}} />
                <label>PWHT - Tubeside</label>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Other Heat Treatment</label>
              <input
                type="text"
                value={offerData.heatTreatment.pwhtOther}
                onChange={(e) => updateOfferData('heatTreatment', { pwhtOther: e.target.value })}
                placeholder="Specify other heat treatment requirements"
              />
            </div>
          </div>
        );

      case 'testing':
        return (
          <div className="section-content">
            <div className="checkbox-grid">
              <div 
                className={`checkbox-item ${offerData.pressureTesting.hydroShellside ? 'checked' : ''}`}
                onClick={() => updateOfferData('pressureTesting', { hydroShellside: !offerData.pressureTesting.hydroShellside })}
              >
                <input type="checkbox" checked={offerData.pressureTesting.hydroShellside} onChange={() => {}} />
                <label>Hydro-test of shellside</label>
              </div>
              <div 
                className={`checkbox-item ${offerData.pressureTesting.hydroTubeside ? 'checked' : ''}`}
                onClick={() => updateOfferData('pressureTesting', { hydroTubeside: !offerData.pressureTesting.hydroTubeside })}
              >
                <input type="checkbox" checked={offerData.pressureTesting.hydroTubeside} onChange={() => {}} />
                <label>Hydro-test of tubeside</label>
              </div>
              <div 
                className={`checkbox-item ${offerData.pressureTesting.airTestShellside ? 'checked' : ''}`}
                onClick={() => updateOfferData('pressureTesting', { airTestShellside: !offerData.pressureTesting.airTestShellside })}
              >
                <input type="checkbox" checked={offerData.pressureTesting.airTestShellside} onChange={() => {}} />
                <label>Air test of shellside</label>
              </div>
              <div 
                className={`checkbox-item ${offerData.pressureTesting.airTestTubeside ? 'checked' : ''}`}
                onClick={() => updateOfferData('pressureTesting', { airTestTubeside: !offerData.pressureTesting.airTestTubeside })}
              >
                <input type="checkbox" checked={offerData.pressureTesting.airTestTubeside} onChange={() => {}} />
                <label>Air test of tubeside</label>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Test Pressure</label>
                <input
                  type="text"
                  value={offerData.pressureTesting.testPressure}
                  onChange={(e) => updateOfferData('pressureTesting', { testPressure: e.target.value })}
                  placeholder="e.g., 1.5 x MAWP"
                />
              </div>
              <div className="form-group">
                <label>Test Medium</label>
                <input
                  type="text"
                  value={offerData.pressureTesting.testMedium}
                  onChange={(e) => updateOfferData('pressureTesting', { testMedium: e.target.value })}
                  placeholder="e.g., Water"
                />
              </div>
            </div>
          </div>
        );

      case 'surface':
        return (
          <div className="section-content">
            <div className="form-row">
              <div className="form-group">
                <label>Blast Standard</label>
                <input
                  type="text"
                  value={offerData.surfaceProtection.blastStandard}
                  onChange={(e) => updateOfferData('surfaceProtection', { blastStandard: e.target.value })}
                  placeholder="e.g., AS1627.4 class 2.5"
                />
              </div>
              <div className="form-group">
                <label>Blast Media</label>
                <select
                  value={offerData.surfaceProtection.blastMedia}
                  onChange={(e) => updateOfferData('surfaceProtection', { blastMedia: e.target.value as 'Garnet' | 'Grit' | 'Shot' | 'Other' })}
                >
                  <option value="Garnet">Garnet</option>
                  <option value="Grit">Grit</option>
                  <option value="Shot">Shot</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Paint Specification</label>
              <textarea
                value={offerData.surfaceProtection.paintSpec}
                onChange={(e) => updateOfferData('surfaceProtection', { paintSpec: e.target.value })}
                placeholder="e.g., 1 coat IOZ Primer to 75um DFT & 1 coat Epoxy to 125um DFT"
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>Internal Protection</label>
              <input
                type="text"
                value={offerData.surfaceProtection.internalProtection}
                onChange={(e) => updateOfferData('surfaceProtection', { internalProtection: e.target.value })}
                placeholder="Specify internal protection if required"
              />
            </div>
          </div>
        );

      case 'transport':
        return (
          <div className="section-content">
            <div className="checkbox-grid">
              <div 
                className={`checkbox-item ${offerData.transport.includedInPrice ? 'checked' : ''}`}
                onClick={() => updateOfferData('transport', { includedInPrice: !offerData.transport.includedInPrice })}
              >
                <input type="checkbox" checked={offerData.transport.includedInPrice} onChange={() => {}} />
                <label>Transport included in price</label>
              </div>
              <div 
                className={`checkbox-item ${offerData.transport.vesselSaddles ? 'checked' : ''}`}
                onClick={() => updateOfferData('transport', { vesselSaddles: !offerData.transport.vesselSaddles })}
              >
                <input type="checkbox" checked={offerData.transport.vesselSaddles} onChange={() => {}} />
                <label>Vessel saddles</label>
              </div>
              <div 
                className={`checkbox-item ${offerData.transport.timberSupports ? 'checked' : ''}`}
                onClick={() => updateOfferData('transport', { timberSupports: !offerData.transport.timberSupports })}
              >
                <input type="checkbox" checked={offerData.transport.timberSupports} onChange={() => {}} />
                <label>Timber supports</label>
              </div>
              <div 
                className={`checkbox-item ${offerData.transport.tarpaulin ? 'checked' : ''}`}
                onClick={() => updateOfferData('transport', { tarpaulin: !offerData.transport.tarpaulin })}
              >
                <input type="checkbox" checked={offerData.transport.tarpaulin} onChange={() => {}} />
                <label>Tarpaulin</label>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Dimensions (L × W × H)</label>
                <input
                  type="text"
                  value={offerData.transport.dimensions}
                  onChange={(e) => updateOfferData('transport', { dimensions: e.target.value })}
                  placeholder="e.g., 10.6m × 1.22m × 1.6m"
                />
              </div>
              <div className="form-group">
                <label>Weight</label>
                <input
                  type="text"
                  value={offerData.transport.weight}
                  onChange={(e) => updateOfferData('transport', { weight: e.target.value })}
                  placeholder="e.g., 21,250 kg"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Destination</label>
              <input
                type="text"
                value={offerData.transport.destination}
                onChange={(e) => updateOfferData('transport', { destination: e.target.value })}
                placeholder="Delivery destination"
              />
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="section-content">
            {['offer', 'project', 'standard'].map(category => (
              <div key={category} className="notes-category">
                <h4>{category === 'offer' ? 'Offer Notes' : category === 'project' ? 'Project Notes' : 'Standard Notes'}</h4>
                <div className="notes-list">
                  {offerData.notes
                    .filter(n => n.category === category)
                    .map(note => (
                      <div key={note.id} className={`note-item ${note.included ? 'included' : ''}`}>
                        <input
                          type="checkbox"
                          checked={note.included}
                          onChange={() => toggleNote(note.id)}
                        />
                        <span className="note-text">{note.text}</span>
                      </div>
                    ))}
                </div>
                <div className="custom-note-input">
                  <input
                    type="text"
                    value={customNoteText}
                    onChange={(e) => setCustomNoteText(e.target.value)}
                    placeholder={`Add custom ${category} note...`}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomNote(category as 'offer' | 'project' | 'standard')}
                  />
                  <button onClick={() => addCustomNote(category as 'offer' | 'project' | 'standard')}>Add</button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'pricing':
        return (
          <div className="section-content">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Description</th>
                  <th style={{ width: '10%' }}>Qty</th>
                  <th style={{ width: '20%' }}>Unit Price</th>
                  <th style={{ width: '20%' }}>Total</th>
                  <th style={{ width: '10%' }}></th>
                </tr>
              </thead>
              <tbody>
                {offerData.pricing.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updatePricingItem(index, { description: e.target.value })}
                        placeholder="Item description"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="amount-input"
                        value={item.quantity}
                        onChange={(e) => updatePricingItem(index, { quantity: Number(e.target.value) })}
                        min={1}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="amount-input"
                        value={item.unitPrice}
                        onChange={(e) => updatePricingItem(index, { unitPrice: Number(e.target.value) })}
                        step={100}
                      />
                    </td>
                    <td className="amount">${item.total.toLocaleString()}</td>
                    <td>
                      <button className="btn-remove-material" onClick={() => removePricingItem(index)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn-add-material" onClick={addPricingItem}>+ Add Line Item</button>

            <div className="pricing-totals">
              <div className="pricing-row">
                <span className="label">Subtotal:</span>
                <span className="value">${offerData.pricing.subtotal.toLocaleString()}</span>
              </div>
              <div className="pricing-row">
                <span className="label">
                  Discount:
                  <input
                    type="number"
                    style={{ width: '100px', marginLeft: '0.5rem', padding: '0.25rem' }}
                    value={offerData.pricing.discount}
                    onChange={(e) => {
                      const discount = Number(e.target.value);
                      setOfferData(prev => ({
                        ...prev,
                        pricing: {
                          ...prev.pricing,
                          discount,
                          total: prev.pricing.subtotal - discount,
                        },
                      }));
                    }}
                  />
                </span>
                <span className="value">-${offerData.pricing.discount.toLocaleString()}</span>
              </div>
              <div className="pricing-row total">
                <span className="label">Total ({offerData.pricing.currency} Ex GST):</span>
                <span className="value">${offerData.pricing.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Currency</label>
                <select
                  value={offerData.pricing.currency}
                  onChange={(e) => setOfferData(prev => ({
                    ...prev,
                    pricing: { ...prev.pricing, currency: e.target.value as 'AUD' | 'USD' | 'EUR' },
                  }))}
                >
                  <option value="AUD">AUD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="form-group">
                <label>Lead Time</label>
                <input
                  type="text"
                  value={offerData.pricing.leadTime}
                  onChange={(e) => setOfferData(prev => ({
                    ...prev,
                    pricing: { ...prev.pricing, leadTime: e.target.value },
                  }))}
                  placeholder="e.g., 16 weeks from order"
                />
              </div>
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="section-content">
            <div className="subsection">
              <h4>Payment Milestones</h4>
              <div className="milestones-list">
                {offerData.milestones.milestones.map((milestone, index) => (
                  <div key={index} className="milestone-item">
                    <input
                      type="checkbox"
                      checked={milestone.included}
                      onChange={() => updateMilestone(index, { included: !milestone.included })}
                    />
                    <span className="milestone-desc">{milestone.description}</span>
                    <div className="milestone-pct">
                      <input
                        type="number"
                        value={milestone.percentage}
                        onChange={(e) => updateMilestone(index, { percentage: Number(e.target.value) })}
                        min={0}
                        max={100}
                      />
                      <span>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="subsection">
              <h4>Payment Terms</h4>
              <div className="form-row">
                <div className="form-group">
                  <select
                    value={offerData.milestones.paymentTerms}
                    onChange={(e) => updateOfferData('milestones', { paymentTerms: e.target.value as '30 days' | '60 days' | 'Other' })}
                  >
                    <option value="30 days">30 days</option>
                    <option value="60 days">60 days</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="subsection">
              <h4>Warranty</h4>
              <div className="form-row">
                <div className="form-group">
                  <select
                    value={offerData.warranty.standard}
                    onChange={(e) => updateOfferData('warranty', { standard: e.target.value as '18/12' | '24/18' | 'Other' })}
                  >
                    <option value="18/12">18 months from delivery, 12 months from start-up</option>
                    <option value="24/18">24 months from delivery, 18 months from start-up</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="subsection">
              <h4>Quotation Validity</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Valid for (days)</label>
                  <input
                    type="number"
                    value={offerData.validity.days}
                    onChange={(e) => updateOfferData('validity', { days: Number(e.target.value) })}
                    min={1}
                  />
                </div>
                <div className="form-group">
                  <div className="checkbox-item" onClick={() => updateOfferData('validity', { budgetOnly: !offerData.validity.budgetOnly })}>
                    <input type="checkbox" checked={offerData.validity.budgetOnly} onChange={() => {}} />
                    <label>Budget only</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="offer-module">
      <div className="offer-header">
        <div>
          <h2>Generate Offer Sheet</h2>
          <p>Build your scope of works document from estimate data</p>
        </div>
        <div className="offer-actions">
          <button className="btn-preview" onClick={saveOfferData}>
            Save Draft
          </button>
          <button className="btn-generate" onClick={() => generateOfferPDF(offerData, currentProject)}>
            Generate PDF
          </button>
        </div>
      </div>

      <div className="offer-content">
        {SECTIONS.map(section => (
          <div key={section.id} className="offer-section">
            <div className="section-header" onClick={() => toggleSection(section.id)}>
              <h3>{section.label}</h3>
              <button className="section-toggle">
                {expandedSections.has(section.id) ? '−' : '+'}
              </button>
            </div>
            <div className={`section-content ${expandedSections.has(section.id) ? '' : 'collapsed'}`}>
              {renderSectionContent(section.id)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

