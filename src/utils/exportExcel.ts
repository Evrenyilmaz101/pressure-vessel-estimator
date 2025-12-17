import type { NozzleItem, ActivityCodeBreakdown } from '../types/weld.types';

interface ExportRow {
  Tag: string;
  Qty: number;
  'Nozzle OD': number;
  'Shell Thk': number;
  'Joint Type': string;
  CUTNOZZ: string;
  FNOZZ: string;
  PREHEAT: string;
  WNOZZ: string;
  BACGRI: string;
  MATCUT: string;
  NDE: string;
  'Total/Nozzle': string;
  'Total (Qty)': string;
}

/**
 * Convert nozzle items to CSV format for Excel
 */
export function exportToCSV(nozzles: NozzleItem[], jobNumber: string): void {
  const rows: ExportRow[] = nozzles.map((nozzle) => {
    const codes = nozzle.activityCodes || getEmptyActivityCodes();
    const totalPerNozzle = Object.values(codes).reduce((sum, val) => sum + val, 0);
    const totalWithQty = totalPerNozzle * nozzle.quantity;

    return {
      Tag: nozzle.tag,
      Qty: nozzle.quantity,
      'Nozzle OD': nozzle.geometry.nozzleOD,
      'Shell Thk': nozzle.geometry.shellThick,
      'Joint Type': nozzle.geometry.jointType === 'doublebevel' ? 'Double' : 'Single',
      CUTNOZZ: codes.CUTNOZZ.toFixed(2),
      FNOZZ: codes.FNOZZ.toFixed(2),
      PREHEAT: codes.PREHEAT.toFixed(2),
      WNOZZ: codes.WNOZZ.toFixed(2),
      BACGRI: codes.BACGRI.toFixed(2),
      MATCUT: codes.MATCUT.toFixed(2),
      NDE: codes.NDE.toFixed(2),
      'Total/Nozzle': totalPerNozzle.toFixed(2),
      'Total (Qty)': totalWithQty.toFixed(2),
    };
  });

  // Calculate totals row
  const totals = {
    Tag: 'TOTALS',
    Qty: nozzles.reduce((sum, n) => sum + n.quantity, 0),
    'Nozzle OD': '',
    'Shell Thk': '',
    'Joint Type': '',
    CUTNOZZ: nozzles.reduce((sum, n) => sum + (n.activityCodes?.CUTNOZZ || 0) * n.quantity, 0).toFixed(2),
    FNOZZ: nozzles.reduce((sum, n) => sum + (n.activityCodes?.FNOZZ || 0) * n.quantity, 0).toFixed(2),
    PREHEAT: nozzles.reduce((sum, n) => sum + (n.activityCodes?.PREHEAT || 0) * n.quantity, 0).toFixed(2),
    WNOZZ: nozzles.reduce((sum, n) => sum + (n.activityCodes?.WNOZZ || 0) * n.quantity, 0).toFixed(2),
    BACGRI: nozzles.reduce((sum, n) => sum + (n.activityCodes?.BACGRI || 0) * n.quantity, 0).toFixed(2),
    MATCUT: nozzles.reduce((sum, n) => sum + (n.activityCodes?.MATCUT || 0) * n.quantity, 0).toFixed(2),
    NDE: nozzles.reduce((sum, n) => sum + (n.activityCodes?.NDE || 0) * n.quantity, 0).toFixed(2),
    'Total/Nozzle': '',
    'Total (Qty)': nozzles.reduce((sum, n) => {
      const codes = n.activityCodes || getEmptyActivityCodes();
      const total = Object.values(codes).reduce((s, v) => s + v, 0);
      return sum + total * n.quantity;
    }, 0).toFixed(2),
  };

  // Build CSV content
  const headers = Object.keys(rows[0] || totals);
  const csvRows = [
    `Job: ${jobNumber}`,
    `Exported: ${new Date().toLocaleString()}`,
    '',
    headers.join(','),
    ...rows.map((row) => headers.map((h) => row[h as keyof ExportRow]).join(',')),
    '',
    headers.map((h) => totals[h as keyof typeof totals]).join(','),
  ];

  const csvContent = csvRows.join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${jobNumber || 'nozzle-estimate'}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getEmptyActivityCodes(): ActivityCodeBreakdown {
  return {
    CUTNOZZ: 0,
    FNOZZ: 0,
    PREHEAT: 0,
    WNOZZ: 0,
    BACGRI: 0,
    MATCUT: 0,
    NDE: 0,
  };
}

/**
 * Calculate activity codes from activity times and weld results
 */
export function calculateActivityCodes(
  activityTimes: {
    markPosition: number;
    cutAndBevel: number;
    grindBevelClean: number;
    fitNozzle: number;
    preheat1: number;
    grind1stSide: number;
    backGouge: number;
    preheat2: number;
    grind2ndSide: number;
    nde: number;
  },
  weldTimes: {
    insideTime: number;
    outsideTime: number;
    filletTime: number;
  }
): ActivityCodeBreakdown {
  return {
    CUTNOZZ: activityTimes.markPosition + activityTimes.cutAndBevel,
    FNOZZ: activityTimes.fitNozzle,
    PREHEAT: activityTimes.preheat1 + activityTimes.preheat2,
    WNOZZ: weldTimes.insideTime + weldTimes.outsideTime + weldTimes.filletTime,
    BACGRI: activityTimes.backGouge,
    MATCUT: activityTimes.grindBevelClean + activityTimes.grind1stSide + activityTimes.grind2ndSide,
    NDE: activityTimes.nde,
  };
}




