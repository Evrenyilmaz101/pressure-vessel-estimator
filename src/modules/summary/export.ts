import type { VesselProject } from '../../project/types';
import { MODULES } from '../../project/types';

/**
 * Export full project summary to CSV for Excel
 */
export function exportSummaryToCSV(project: VesselProject): void {
  const lines: string[] = [];
  
  // Header info
  lines.push(`Welding Estimate Summary`);
  lines.push(`Job Number: ${project.jobNumber || '—'}`);
  lines.push(`Vessel: ${project.vesselName || 'Untitled'}`);
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push('');

  // Calculate grand totals
  let grandTotalItems = 0;
  let grandTotalHours = 0;
  const allActivityCodes: Record<string, number> = {};

  MODULES.forEach(mod => {
    const summary = project.summaries[mod.id];
    if (summary) {
      grandTotalItems += summary.itemCount;
      grandTotalHours += summary.totalHours;
      Object.entries(summary.activityBreakdown).forEach(([code, hours]) => {
        allActivityCodes[code] = (allActivityCodes[code] || 0) + (hours as number);
      });
    }
  });

  // Module breakdown section
  lines.push('=== MODULE BREAKDOWN ===');
  lines.push('Module,Items,Hours');
  
  MODULES.forEach(mod => {
    const summary = project.summaries[mod.id];
    if (summary && summary.itemCount > 0) {
      lines.push(`${mod.name},${summary.itemCount},${summary.totalHours.toFixed(2)}`);
    }
  });
  
  lines.push(`TOTAL,${grandTotalItems},${grandTotalHours.toFixed(2)}`);
  lines.push('');

  // Activity code breakdown
  lines.push('=== ACTIVITY CODE TOTALS ===');
  lines.push('Code,Hours,Percentage');
  
  Object.entries(allActivityCodes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([code, hours]) => {
      const pct = grandTotalHours > 0 ? ((hours / grandTotalHours) * 100).toFixed(1) : '0';
      lines.push(`${code},${hours.toFixed(2)},${pct}%`);
    });
  
  lines.push(`TOTAL,${grandTotalHours.toFixed(2)},100%`);
  lines.push('');

  // Detailed module data
  // Nozzles
  const nozzlesData = project.modules.nozzles as { nozzles?: any[] } | undefined;
  if (nozzlesData?.nozzles && nozzlesData.nozzles.length > 0) {
    lines.push('=== NOZZLES DETAIL ===');
    lines.push('Tag,Qty,OD,Thk,Type,CUTNOZZ,FNOZZ,PREHEAT,WNOZZ,BACGRI,MATCUT,NDE,Total/ea,Total');
    
    nozzlesData.nozzles.forEach((n: any) => {
      const codes = n.activityCodes || {};
      const perItem = Object.values(codes).reduce((s: number, v: any) => s + (v || 0), 0) as number;
      lines.push([
        n.tag,
        n.quantity,
        n.geometry?.nozzleOD || '',
        n.geometry?.shellThick || '',
        n.geometry?.jointType === 'doublebevel' ? 'DB' : 'SB',
        (codes.CUTNOZZ || 0).toFixed(2),
        (codes.FNOZZ || 0).toFixed(2),
        (codes.PREHEAT || 0).toFixed(2),
        (codes.WNOZZ || 0).toFixed(2),
        (codes.BACGRI || 0).toFixed(2),
        (codes.MATCUT || 0).toFixed(2),
        (codes.NDE || 0).toFixed(2),
        perItem.toFixed(2),
        (perItem * n.quantity).toFixed(2),
      ].join(','));
    });
    lines.push('');
  }

  // Long Welds
  const longWeldsData = project.modules.longwelds as { welds?: any[] } | undefined;
  if (longWeldsData?.welds && longWeldsData.welds.length > 0) {
    lines.push('=== LONG WELDS DETAIL ===');
    lines.push('Tag,Qty,Thk,Length,Type,MATCUT,ROLL,FLON,WELON,BACMIL,SUBLON,MANLON,NDE,Total/ea,Total');
    
    longWeldsData.welds.forEach((w: any) => {
      const codes = w.activityCodes || {};
      const perItem = Object.values(codes).reduce((s: number, v: any) => s + (v || 0), 0) as number;
      lines.push([
        w.tag,
        w.quantity,
        w.geometry?.shellThickness || '',
        w.geometry?.weldLength || '',
        w.geometry?.jointType === 'doublevee' ? 'DV' : 'SV',
        (codes.MATCUT || 0).toFixed(2),
        (codes.ROLL || 0).toFixed(2),
        (codes.FLON || 0).toFixed(2),
        (codes.WELON || 0).toFixed(2),
        (codes.BACMIL || 0).toFixed(2),
        (codes.SUBLON || 0).toFixed(2),
        (codes.MANLON || 0).toFixed(2),
        (codes.NDE || 0).toFixed(2),
        perItem.toFixed(2),
        (perItem * w.quantity).toFixed(2),
      ].join(','));
    });
    lines.push('');
  }

  // Circ Welds
  const circWeldsData = project.modules.circwelds as { welds?: any[] } | undefined;
  if (circWeldsData?.welds && circWeldsData.welds.length > 0) {
    lines.push('=== CIRC WELDS DETAIL ===');
    lines.push('Tag,Qty,Thk,ID,Circ,Type,CRANE,FCIRC,PREHEAT,WECIRC,BACMIL,SUBCIRC,MANCIR,NDE,Total/ea,Total');
    
    circWeldsData.welds.forEach((w: any) => {
      const codes = w.activityCodes || {};
      const perItem = Object.values(codes).reduce((s: number, v: any) => s + (v || 0), 0) as number;
      const circ = Math.PI * (w.geometry?.insideDiameter || 0);
      lines.push([
        w.tag,
        w.quantity,
        w.geometry?.shellThickness || '',
        w.geometry?.insideDiameter || '',
        (circ / 1000).toFixed(1) + 'm',
        w.geometry?.jointType === 'doublevee' ? 'DV' : 'SV',
        (codes.CRANE || 0).toFixed(2),
        (codes.FCIRC || 0).toFixed(2),
        (codes.PREHEAT || 0).toFixed(2),
        (codes.WECIRC || 0).toFixed(2),
        (codes.BACMIL || 0).toFixed(2),
        (codes.SUBCIRC || 0).toFixed(2),
        (codes.MANCIR || 0).toFixed(2),
        (codes.NDE || 0).toFixed(2),
        perItem.toFixed(2),
        (perItem * w.quantity).toFixed(2),
      ].join(','));
    });
    lines.push('');
  }

  // Pipe Joints
  const pipeJointsData = project.modules.pipejoints as { joints?: any[] } | undefined;
  if (pipeJointsData?.joints && pipeJointsData.joints.length > 0) {
    lines.push('=== PIPE JOINTS DETAIL ===');
    lines.push('Tag,Qty,NPS,Schedule,OD,Wall,FPIPE,PREHEAT,WPIPE,NDE,Total/ea,Total');
    
    pipeJointsData.joints.forEach((j: any) => {
      const codes = j.activityCodes || {};
      const perItem = Object.values(codes).reduce((s: number, v: any) => s + (v || 0), 0) as number;
      // Get dimensions from results if available
      const od = j.results?.circumference ? (j.results.circumference / Math.PI).toFixed(1) : '';
      const wall = j.customSettings?.wallThickness || '';
      lines.push([
        j.tag,
        j.quantity,
        j.nps || '',
        j.schedule || '',
        od,
        wall,
        (codes.FPIPE || 0).toFixed(2),
        (codes.PREHEAT || 0).toFixed(2),
        (codes.WPIPE || 0).toFixed(2),
        (codes.NDE || 0).toFixed(2),
        perItem.toFixed(2),
        (perItem * j.quantity).toFixed(2),
      ].join(','));
    });
    lines.push('');
  }

  // Build and download CSV
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${project.jobNumber || 'estimate'}_summary_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

