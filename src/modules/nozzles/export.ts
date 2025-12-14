import type { NozzleItem, NozzleActivityCodes } from './types';

/**
 * Export nozzles to CSV for Excel
 */
export function exportNozzlesToCSV(nozzles: NozzleItem[], jobNumber: string): void {
  const headers = ['Tag', 'Qty', 'Nozzle OD', 'Shell Thk', 'Joint Type', 'CUTNOZZ', 'FNOZZ', 'PREHEAT', 'WNOZZ', 'BACGRI', 'MATCUT', 'NDE', 'Total/Nozzle', 'Total (Qty)'];

  const rows = nozzles.map((nozzle) => {
    const codes = nozzle.activityCodes || getEmptyActivityCodes();
    const totalPerNozzle = Object.values(codes).reduce((sum, val) => sum + val, 0);
    const totalWithQty = totalPerNozzle * nozzle.quantity;

    return [
      nozzle.tag,
      nozzle.quantity,
      nozzle.geometry.nozzleOD,
      nozzle.geometry.shellThick,
      nozzle.geometry.jointType === 'doublebevel' ? 'Double' : 'Single',
      codes.CUTNOZZ.toFixed(2),
      codes.FNOZZ.toFixed(2),
      codes.PREHEAT.toFixed(2),
      codes.WNOZZ.toFixed(2),
      codes.BACGRI.toFixed(2),
      codes.MATCUT.toFixed(2),
      codes.NDE.toFixed(2),
      totalPerNozzle.toFixed(2),
      totalWithQty.toFixed(2),
    ];
  });

  // Calculate totals
  const totals = [
    'TOTALS',
    nozzles.reduce((sum, n) => sum + n.quantity, 0),
    '',
    '',
    '',
    nozzles.reduce((sum, n) => sum + (n.activityCodes?.CUTNOZZ || 0) * n.quantity, 0).toFixed(2),
    nozzles.reduce((sum, n) => sum + (n.activityCodes?.FNOZZ || 0) * n.quantity, 0).toFixed(2),
    nozzles.reduce((sum, n) => sum + (n.activityCodes?.PREHEAT || 0) * n.quantity, 0).toFixed(2),
    nozzles.reduce((sum, n) => sum + (n.activityCodes?.WNOZZ || 0) * n.quantity, 0).toFixed(2),
    nozzles.reduce((sum, n) => sum + (n.activityCodes?.BACGRI || 0) * n.quantity, 0).toFixed(2),
    nozzles.reduce((sum, n) => sum + (n.activityCodes?.MATCUT || 0) * n.quantity, 0).toFixed(2),
    nozzles.reduce((sum, n) => sum + (n.activityCodes?.NDE || 0) * n.quantity, 0).toFixed(2),
    '',
    nozzles.reduce((sum, n) => {
      const codes = n.activityCodes || getEmptyActivityCodes();
      const total = Object.values(codes).reduce((s, v) => s + v, 0);
      return sum + total * n.quantity;
    }, 0).toFixed(2),
  ];

  // Build CSV
  const csvRows = [
    `Job: ${jobNumber}`,
    `Exported: ${new Date().toLocaleString()}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(',')),
    '',
    totals.join(','),
  ];

  const csvContent = csvRows.join('\n');

  // Download
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

function getEmptyActivityCodes(): NozzleActivityCodes {
  return { CUTNOZZ: 0, FNOZZ: 0, PREHEAT: 0, WNOZZ: 0, BACGRI: 0, MATCUT: 0, NDE: 0 };
}

