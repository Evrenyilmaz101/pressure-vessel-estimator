import { useProject } from '../../project';
import { MODULES } from '../../project/types';
import { exportSummaryToCSV } from './export';
import './SummaryModule.css';

export function SummaryModule() {
  const { currentProject } = useProject();

  const handleExport = () => {
    if (currentProject) {
      exportSummaryToCSV(currentProject);
    }
  };

  // Calculate totals from all module summaries
  const totals = {
    itemCount: 0,
    totalHours: 0,
    activityBreakdown: {} as Record<string, number>,
  };

  if (currentProject) {
    MODULES.forEach(mod => {
      const summary = currentProject.summaries[mod.id];
      if (summary) {
        totals.itemCount += summary.itemCount;
        totals.totalHours += summary.totalHours;
        Object.entries(summary.activityBreakdown).forEach(([code, hours]) => {
          totals.activityBreakdown[code] = (totals.activityBreakdown[code] || 0) + hours;
        });
      }
    });
  }

  return (
    <div className="summary-module">
      <div className="summary-header">
        <div className="vessel-info">
          <h2>{currentProject?.vesselName || 'Untitled Vessel'}</h2>
          <p className="job-number">Job: {currentProject?.jobNumber || '—'}</p>
        </div>
        <button className="btn-export" onClick={handleExport} disabled={!currentProject}>
          📥 Export to CSV
        </button>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Items</h3>
          <div className="big-number">{totals.itemCount}</div>
        </div>
        <div className="summary-card primary">
          <h3>Grand Total</h3>
          <div className="big-number">{totals.totalHours.toFixed(1)}</div>
          <div className="unit">hours</div>
        </div>
      </div>

      <div className="modules-breakdown">
        <h3>Module Breakdown</h3>
        <div className="module-cards">
          {MODULES.map(mod => {
            const summary = currentProject?.summaries[mod.id];
            return (
              <div key={mod.id} className={`module-card ${summary ? 'has-data' : ''}`}>
                <div className="module-icon">{mod.icon}</div>
                <div className="module-info">
                  <h4>{mod.name}</h4>
                  {summary ? (
                    <>
                      <p className="item-count">{summary.itemCount} items</p>
                      <p className="hours">{summary.totalHours.toFixed(1)} hrs</p>
                    </>
                  ) : (
                    <p className="no-data">No data</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {Object.keys(totals.activityBreakdown).length > 0 && (
        <div className="activity-breakdown">
          <h3>Activity Code Totals</h3>
          <div className="activity-bars">
            {Object.entries(totals.activityBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([code, hours]) => (
                <div key={code} className="activity-bar-row">
                  <span className="code-name">{code}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ width: `${Math.min(100, (hours / totals.totalHours) * 100)}%` }}
                    />
                  </div>
                  <span className="hours">{hours.toFixed(1)} hrs</span>
                  <span className="pct">{((hours / totals.totalHours) * 100).toFixed(0)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

