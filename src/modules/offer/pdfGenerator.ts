/**
 * PDF Generator for Offer Sheet
 * 
 * Generates a printable HTML document that can be saved as PDF
 */

import type { OfferData, OfferNDEItem } from './types';

export function generateOfferPDF(offerData: OfferData, _project?: unknown) {
  void _project; // Unused for now, may use for additional data in future
  const { projectDetails, engineering, qualityAssurance, designCodes, materials, nde, heatTreatment, pressureTesting, surfaceProtection, transport, milestones, warranty, validity, notes, pricing } = offerData;

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Checkbox helper
  const checkbox = (checked: boolean) => checked ? '☑' : '☐';

  // Generate HTML content
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Offer Sheet - ${projectDetails.ourReference}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #333;
      padding: 20mm;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    @media print {
      body {
        padding: 15mm;
      }
      .page-break {
        page-break-before: always;
      }
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1a1a2e;
    }
    
    .header h1 {
      font-size: 18pt;
      color: #1a1a2e;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .project-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    
    .project-info div {
      display: flex;
    }
    
    .project-info .label {
      font-weight: bold;
      min-width: 100px;
      color: #555;
    }
    
    .cover-letter {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .cover-letter p {
      margin-bottom: 15px;
    }
    
    .signature {
      margin-top: 30px;
    }
    
    .section {
      margin: 25px 0;
    }
    
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #1a1a2e;
      padding: 8px 12px;
      background: linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%);
      border-left: 4px solid #2d5a27;
      margin-bottom: 15px;
    }
    
    .checklist {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    
    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 10pt;
    }
    
    .checklist-item .check {
      font-size: 12pt;
      line-height: 1;
    }
    
    .checklist-item.included .check {
      color: #2d5a27;
    }
    
    .checklist-item.excluded .check {
      color: #999;
    }
    
    .subsection {
      margin: 15px 0;
    }
    
    .subsection-title {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 8px;
      color: #555;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 10pt;
    }
    
    th, td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #555;
    }
    
    .amount {
      text-align: right;
      font-family: 'Consolas', monospace;
    }
    
    .total-row {
      font-weight: bold;
      font-size: 11pt;
      background: #e8f5e9;
    }
    
    .total-row td {
      border-top: 2px solid #2d5a27;
    }
    
    .notes-section {
      margin: 20px 0;
    }
    
    .notes-section h4 {
      font-size: 10pt;
      color: #555;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .notes-section ul {
      list-style: none;
      padding-left: 0;
    }
    
    .notes-section li {
      padding: 5px 0;
      padding-left: 20px;
      position: relative;
      font-size: 10pt;
    }
    
    .notes-section li::before {
      content: '•';
      position: absolute;
      left: 5px;
      color: #2d5a27;
    }
    
    .materials-table td:first-child {
      font-weight: 500;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }
    
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #2d5a27;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .print-btn:hover {
      background: #1e3d1a;
    }
    
    @media print {
      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="header">
    <h1>Vessel Shop Quotation – Scope of Works</h1>
  </div>

  <div class="project-info">
    <div><span class="label">Project:</span> ${projectDetails.projectName || '—'}</div>
    <div><span class="label">Our Reference:</span> ${projectDetails.ourReference || '—'}</div>
    <div><span class="label">Client:</span> ${projectDetails.client || '—'}</div>
    <div><span class="label">Revision:</span> ${projectDetails.revision || '0'}</div>
    <div><span class="label">Attention:</span> ${projectDetails.attention || '—'}</div>
    <div><span class="label">Date:</span> ${formatDate(projectDetails.date)}</div>
  </div>

  <div class="cover-letter">
    <p>Dear ${projectDetails.attention || 'Sir/Madam'},</p>
    <p>Please find enclosed our offer for the ${projectDetails.projectName || 'project'}.</p>
    <p>Thank you for the opportunity to support ${projectDetails.client || 'your company'}. Should you have any questions or clarifications with the information contained within, please don't hesitate to call.</p>
    <div class="signature">
      <p>Sincerely,</p>
      <p style="margin-top: 30px; font-weight: bold;">_______________________</p>
      <p>Proposals Manager</p>
    </div>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <div class="section-title">Section 1 – Specification Compliance</div>
    
    <div class="subsection">
      <div class="subsection-title">Engineering</div>
      <div class="checklist">
        <div class="checklist-item ${engineering.mechanicalDesign ? 'included' : 'excluded'}">
          <span class="check">${checkbox(engineering.mechanicalDesign)}</span>
          <span>Mechanical design</span>
        </div>
        <div class="checklist-item ${engineering.thermalDesign ? 'included' : 'excluded'}">
          <span class="check">${checkbox(engineering.thermalDesign)}</span>
          <span>Thermal design</span>
        </div>
        <div class="checklist-item ${engineering.feaAnalysis ? 'included' : 'excluded'}">
          <span class="check">${checkbox(engineering.feaAnalysis)}</span>
          <span>FEA/FEM analysis</span>
        </div>
        <div class="checklist-item ${engineering.vibrationAnalysis ? 'included' : 'excluded'}">
          <span class="check">${checkbox(engineering.vibrationAnalysis)}</span>
          <span>Vibration analysis</span>
        </div>
        <div class="checklist-item ${engineering.thirdPartyVerification ? 'included' : 'excluded'}">
          <span class="check">${checkbox(engineering.thirdPartyVerification)}</span>
          <span>3rd Party verification of mechanical design</span>
        </div>
        <div class="checklist-item ${engineering.designRegistration ? 'included' : 'excluded'}">
          <span class="check">${checkbox(engineering.designRegistration)}</span>
          <span>Design registration</span>
        </div>
        <div class="checklist-item ${engineering.detailDrawings ? 'included' : 'excluded'}">
          <span class="check">${checkbox(engineering.detailDrawings)}</span>
          <span>Detail drawings</span>
        </div>
        <div class="checklist-item ${engineering.siteSurvey ? 'included' : 'excluded'}">
          <span class="check">${checkbox(engineering.siteSurvey)}</span>
          <span>Site survey or measurement</span>
        </div>
      </div>
    </div>

    <div class="subsection">
      <div class="subsection-title">Quality Assurance</div>
      <div class="checklist">
        <div class="checklist-item ${qualityAssurance.qaMdcDocs ? 'included' : 'excluded'}">
          <span class="check">${checkbox(qualityAssurance.qaMdcDocs)}</span>
          <span>QA Manual, ITP, weld procedures, MDR etc.</span>
        </div>
        <div class="checklist-item ${qualityAssurance.asmeUStamp ? 'included' : 'excluded'}">
          <span class="check">${checkbox(qualityAssurance.asmeUStamp)}</span>
          <span>ASME U Stamp</span>
        </div>
        <div class="checklist-item ${qualityAssurance.asmeU2Stamp ? 'included' : 'excluded'}">
          <span class="check">${checkbox(qualityAssurance.asmeU2Stamp)}</span>
          <span>ASME U2 Stamp</span>
        </div>
        <div class="checklist-item ${qualityAssurance.thirdPartyInspection ? 'included' : 'excluded'}">
          <span class="check">${checkbox(qualityAssurance.thirdPartyInspection)}</span>
          <span>3rd Party Inspection</span>
        </div>
      </div>
    </div>

    <div class="subsection">
      <div class="subsection-title">Design Codes</div>
      <div class="checklist">
        <div class="checklist-item ${designCodes.as1210 ? 'included' : 'excluded'}">
          <span class="check">${checkbox(designCodes.as1210)}</span>
          <span>AS1210-2010${designCodes.temaClass !== 'none' ? `, TEMA ${designCodes.temaClass}` : ''}</span>
        </div>
        <div class="checklist-item ${designCodes.asmeVIIIDiv1 ? 'included' : 'excluded'}">
          <span class="check">${checkbox(designCodes.asmeVIIIDiv1)}</span>
          <span>ASME Sect VIII Div 1</span>
        </div>
        <div class="checklist-item ${designCodes.asmeVIIIDiv2 ? 'included' : 'excluded'}">
          <span class="check">${checkbox(designCodes.asmeVIIIDiv2)}</span>
          <span>ASME Sect VIII Div 2</span>
        </div>
        <div class="checklist-item ${designCodes.asmePVHO1 ? 'included' : 'excluded'}">
          <span class="check">${checkbox(designCodes.asmePVHO1)}</span>
          <span>ASME PVHO-1</span>
        </div>
        <div class="checklist-item ${designCodes.pd5500 ? 'included' : 'excluded'}">
          <span class="check">${checkbox(designCodes.pd5500)}</span>
          <span>PD5500</span>
        </div>
      </div>
    </div>

    ${materials.items.length > 0 ? `
    <div class="subsection">
      <div class="subsection-title">Materials</div>
      <table class="materials-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>Specification</th>
            <th>Origin</th>
          </tr>
        </thead>
        <tbody>
          ${materials.items.map(item => `
            <tr>
              <td>${item.component}</td>
              <td>${item.specification}</td>
              <td>${item.origin}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="font-size: 9pt; color: #666; margin-top: 8px;">
        Material certification: ${materials.certType === 'EN10204_3.1' ? 'EN10204 3.1' : 'EN10204 3.2'}
        ${materials.countryExclusions.length > 0 ? `<br><strong>No materials to be sourced from ${materials.countryExclusions.join(', ')}</strong>` : ''}
      </p>
    </div>
    ` : ''}

    <div class="subsection">
      <div class="subsection-title">Non-Destructive Testing</div>
      <table>
        <thead>
          <tr>
            <th>Inspection Type</th>
            <th style="width: 100px;">Coverage</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(nde).map(([, item]) => {
            const ndeItem = item as OfferNDEItem;
            if (ndeItem.coverage === 0) return '';
            return `
              <tr>
                <td>${ndeItem.description}</td>
                <td>${checkbox(true)} ${ndeItem.coverage}%</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="subsection">
      <div class="subsection-title">Heat Treatment</div>
      <div class="checklist">
        <div class="checklist-item ${heatTreatment.pwhtShellside ? 'included' : 'excluded'}">
          <span class="check">${checkbox(heatTreatment.pwhtShellside)}</span>
          <span>PWHT - Shellside</span>
        </div>
        <div class="checklist-item ${heatTreatment.pwhtTubeside ? 'included' : 'excluded'}">
          <span class="check">${checkbox(heatTreatment.pwhtTubeside)}</span>
          <span>PWHT - Tubeside</span>
        </div>
      </div>
      ${heatTreatment.pwhtOther ? `<p style="margin-top: 8px; font-size: 10pt;">${heatTreatment.pwhtOther}</p>` : ''}
    </div>

    <div class="subsection">
      <div class="subsection-title">Pressure Testing</div>
      <div class="checklist">
        <div class="checklist-item ${pressureTesting.hydroShellside ? 'included' : 'excluded'}">
          <span class="check">${checkbox(pressureTesting.hydroShellside)}</span>
          <span>Hydro-test of shellside</span>
        </div>
        <div class="checklist-item ${pressureTesting.hydroTubeside ? 'included' : 'excluded'}">
          <span class="check">${checkbox(pressureTesting.hydroTubeside)}</span>
          <span>Hydro-test of tubeside</span>
        </div>
        <div class="checklist-item ${pressureTesting.airTestShellside ? 'included' : 'excluded'}">
          <span class="check">${checkbox(pressureTesting.airTestShellside)}</span>
          <span>Air test of shellside</span>
        </div>
        <div class="checklist-item ${pressureTesting.airTestTubeside ? 'included' : 'excluded'}">
          <span class="check">${checkbox(pressureTesting.airTestTubeside)}</span>
          <span>Air test of tubeside</span>
        </div>
      </div>
    </div>

    <div class="subsection">
      <div class="subsection-title">Surface Protection</div>
      <p style="font-size: 10pt;">
        <strong>Blasting:</strong> ${surfaceProtection.blastStandard} (${surfaceProtection.blastMedia} blast)<br>
        <strong>Paint:</strong> ${surfaceProtection.paintSpec}
        ${surfaceProtection.internalProtection ? `<br><strong>Internal:</strong> ${surfaceProtection.internalProtection}` : ''}
      </p>
    </div>

    <div class="subsection">
      <div class="subsection-title">Transport</div>
      <div class="checklist">
        <div class="checklist-item ${transport.includedInPrice ? 'included' : 'excluded'}">
          <span class="check">${checkbox(transport.includedInPrice)}</span>
          <span>Transport included in price</span>
        </div>
        <div class="checklist-item ${transport.vesselSaddles ? 'included' : 'excluded'}">
          <span class="check">${checkbox(transport.vesselSaddles)}</span>
          <span>Vessel saddles</span>
        </div>
        <div class="checklist-item ${transport.timberSupports ? 'included' : 'excluded'}">
          <span class="check">${checkbox(transport.timberSupports)}</span>
          <span>Timber supports</span>
        </div>
        <div class="checklist-item ${transport.tarpaulin ? 'included' : 'excluded'}">
          <span class="check">${checkbox(transport.tarpaulin)}</span>
          <span>Tarpaulin</span>
        </div>
      </div>
      ${transport.dimensions || transport.weight ? `
        <p style="margin-top: 8px; font-size: 10pt;">
          ${transport.dimensions ? `<strong>Dimensions:</strong> ${transport.dimensions}` : ''}
          ${transport.weight ? `<br><strong>Weight:</strong> ${transport.weight}` : ''}
          ${transport.destination ? `<br><strong>Destination:</strong> ${transport.destination}` : ''}
        </p>
      ` : ''}
    </div>
  </div>

  <div class="page-break"></div>

  ${notes.filter(n => n.included).length > 0 ? `
  <div class="section">
    <div class="section-title">Section 2 – Notes</div>
    
    ${notes.filter(n => n.included && n.category === 'offer').length > 0 ? `
    <div class="notes-section">
      <h4>Offer Notes</h4>
      <ul>
        ${notes.filter(n => n.included && n.category === 'offer').map(n => `<li>${n.text}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${notes.filter(n => n.included && n.category === 'project').length > 0 ? `
    <div class="notes-section">
      <h4>Project Notes</h4>
      <ul>
        ${notes.filter(n => n.included && n.category === 'project').map(n => `<li>${n.text}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${notes.filter(n => n.included && n.category === 'standard').length > 0 ? `
    <div class="notes-section">
      <h4>Standard Notes</h4>
      <ul>
        ${notes.filter(n => n.included && n.category === 'standard').map(n => `<li>${n.text}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Section 3 – Pricing and Lead Time</div>
    
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="width: 60px;">Qty</th>
          <th style="width: 100px;" class="amount">Unit Price</th>
          <th style="width: 100px;" class="amount">Total</th>
        </tr>
      </thead>
      <tbody>
        ${pricing.items.filter(i => i.included).map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td class="amount">$${item.unitPrice.toLocaleString()}</td>
            <td class="amount">$${item.total.toLocaleString()}</td>
          </tr>
        `).join('')}
        ${pricing.discount > 0 ? `
          <tr>
            <td colspan="3">${pricing.discountDescription || 'Discount'}</td>
            <td class="amount">-$${pricing.discount.toLocaleString()}</td>
          </tr>
        ` : ''}
        <tr class="total-row">
          <td colspan="3"><strong>Total (${pricing.currency} Ex GST):</strong></td>
          <td class="amount"><strong>$${pricing.total.toLocaleString()}</strong></td>
        </tr>
      </tbody>
    </table>
    
    ${pricing.leadTime ? `<p style="margin-top: 15px;"><strong>Lead Time:</strong> ${pricing.leadTime}</p>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Section 4 – Terms</div>
    
    <div class="subsection">
      <div class="subsection-title">Payment Milestones</div>
      <table>
        <thead>
          <tr>
            <th>Milestone</th>
            <th style="width: 80px;" class="amount">%</th>
          </tr>
        </thead>
        <tbody>
          ${milestones.milestones.filter(m => m.included).map(m => `
            <tr>
              <td>${m.description}</td>
              <td class="amount">${m.percentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="subsection">
      <p><strong>Payment Terms:</strong> ${milestones.paymentTerms}</p>
    </div>
    
    <div class="subsection">
      <p><strong>Warranty:</strong> ${
        warranty.standard === '18/12' ? '18 months from delivery, 12 months from start-up whichever occurs first.' :
        warranty.standard === '24/18' ? '24 months from delivery, 18 months from start-up whichever occurs first.' :
        warranty.customTerms
      }</p>
    </div>
    
    <div class="subsection">
      <p><strong>Quotation Validity:</strong> ${validity.days} days from the date of the offer${validity.budgetOnly ? ' (Budget only)' : ''}.</p>
    </div>
  </div>

  <div class="footer">
    <p>${projectDetails.ourReference} | Generated ${new Date().toLocaleDateString('en-AU')}</p>
  </div>
</body>
</html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

