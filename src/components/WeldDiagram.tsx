import type { GeometryInput, ProcessLayer, WeldProcess } from '../types/weld.types';

interface WeldDiagramProps {
  geometry: GeometryInput;
  insideLayers: ProcessLayer[];
  outsideProcess: Exclude<WeldProcess, 'Skip'>;
  filletProcess: Exclude<WeldProcess, 'Skip'>;
}

// Process colors - consistent across all zones
const PROCESS_COLORS: Record<string, { fill: string; text: string }> = {
  GTAW: { fill: '#ff6b6b', text: '#c92a2a' },
  SMAW: { fill: '#ffd93d', text: '#e67700' },
  FCAW: { fill: '#4dabf7', text: '#1971c2' },
  GMAW: { fill: '#69db7c', text: '#2f9e44' },
  SAW: { fill: '#da77f2', text: '#9c36b5' },
};

// Layer boundary with calculated heights
interface LayerBoundary {
  process: string;
  startY: number;
  endY: number;
  heightMm: number;
}

export function WeldDiagram({ geometry, insideLayers, outsideProcess, filletProcess }: WeldDiagramProps) {
  const {
    shellThick,
    rootGap,
    rootFace,
    jointType,
    insideBevelAngle,
    outsideBevelAngle,
    splitRatio,
    singleBevelAngle,
    filletThroat,
  } = geometry;

  // Calculate bevel geometry in mm
  let outsideBevelWidth = 0;
  let insideBevelWidth = 0;
  let insideDepth = 0;
  let outsideDepth = 0;
  
  if (jointType === 'doublebevel') {
    const splitRatioDecimal = splitRatio / 100;
    outsideDepth = Math.max(0, shellThick * (1 - splitRatioDecimal) - rootFace / 2);
    insideDepth = Math.max(0, shellThick * splitRatioDecimal - rootFace / 2);
    outsideBevelWidth = outsideDepth * Math.tan((outsideBevelAngle * Math.PI) / 180);
    insideBevelWidth = insideDepth * Math.tan((insideBevelAngle * Math.PI) / 180);
  } else {
    insideDepth = Math.max(0, shellThick - rootFace);
    insideBevelWidth = insideDepth * Math.tan((singleBevelAngle * Math.PI) / 180);
  }

  const maxBevelWidth = Math.max(outsideBevelWidth, insideBevelWidth);
  const totalWidth = rootGap + maxBevelWidth;
  const filletLeg = filletThroat * Math.sqrt(2);

  // FIXED viewBox - always the same size for consistent display
  const viewBoxWidth = 400;
  const viewBoxHeight = 300;
  
  // Calculate scale to fit content within the fixed viewBox
  const marginLeft = 70;
  const marginRight = 90;
  const marginTop = 60;
  const marginBottom = 50;
  
  const availableWidth = viewBoxWidth - marginLeft - marginRight;
  const availableHeight = viewBoxHeight - marginTop - marginBottom;
  
  const scaleX = availableWidth / (totalWidth + filletLeg);
  const scaleY = availableHeight / (shellThick + filletLeg);
  const scale = Math.min(scaleX, scaleY);

  // Position of nozzle wall (left edge of weld)
  const nozzleX = marginLeft;
  const topY = marginTop + filletLeg * scale;
  const bottomY = topY + shellThick * scale;
  const shellEdgeX = nozzleX + rootGap * scale;

  // Sort layers by minWidth
  const sortedLayers = [...insideLayers].sort((a, b) => a.minWidth - b.minWidth);

  // Calculate depth for a given groove width
  const getDepthForWidth = (width: number, totalDepth: number, bevelWidth: number): number => {
    if (width <= rootGap) return 0;
    if (bevelWidth <= 0) return totalDepth;
    return Math.min(totalDepth, Math.max(0, (width - rootGap) * totalDepth / bevelWidth));
  };

  // Dimension X positions - moved further right
  const dimX2 = nozzleX + totalWidth * scale + 45;  // Layer heights
  const dimX1 = nozzleX + totalWidth * scale + 100;  // Shell thickness

  if (jointType === 'doublebevel') {
    const splitRatioDecimal = splitRatio / 100;
    const meetY = topY + shellThick * (1 - splitRatioDecimal) * scale;
    const rootFaceScaled = rootFace * scale;
    const rootFaceTop = meetY - rootFaceScaled / 2;
    const rootFaceBottom = meetY + rootFaceScaled / 2;
    const outsideStartX = shellEdgeX + outsideBevelWidth * scale;
    const insideStartX = shellEdgeX + insideBevelWidth * scale;

    const getInsideY = (depthMm: number) => rootFaceBottom + depthMm * scale;
    const getInsideX = (y: number) => {
      if (y <= rootFaceBottom) return shellEdgeX;
      const progress = (y - rootFaceBottom) / (bottomY - rootFaceBottom);
      return shellEdgeX + progress * insideBevelWidth * scale;
    };

    // Build inside layer boundaries
    const layerBoundaries: LayerBoundary[] = [];
    for (let i = 0; i < sortedLayers.length; i++) {
      const layer = sortedLayers[i];
      const nextLayer = sortedLayers[i + 1];
      const startDepthMm = getDepthForWidth(layer.minWidth, insideDepth, insideBevelWidth);
      const endDepthMm = nextLayer ? getDepthForWidth(nextLayer.minWidth, insideDepth, insideBevelWidth) : insideDepth;
      const heightMm = endDepthMm - startDepthMm;
      if (heightMm > 0) {
        layerBoundaries.push({
          process: layer.process,
          startY: getInsideY(startDepthMm),
          endY: getInsideY(endDepthMm),
          heightMm,
        });
      }
    }

    const outsideTotalWidth = rootGap + outsideBevelWidth;
    const insideTotalWidth = rootGap + insideBevelWidth;

    return (
      <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="weld-diagram" preserveAspectRatio="xMidYMid meet">
        {/* Shell plate reference lines (dashed) */}
        <line x1={nozzleX} y1={topY} x2={dimX1 + 20} y2={topY} stroke="#888" strokeWidth="0.5" strokeDasharray="4,3" />
        <line x1={nozzleX} y1={bottomY} x2={dimX1 + 20} y2={bottomY} stroke="#888" strokeWidth="0.5" strokeDasharray="4,3" />

        {/* Nozzle wall */}
        <line x1={nozzleX} y1={topY - filletLeg * scale - 10} x2={nozzleX} y2={bottomY + 15} stroke="#37474f" strokeWidth="2" />

        {/* Weld groove outline */}
        <path
          d={`M ${nozzleX} ${topY} L ${outsideStartX} ${topY} L ${shellEdgeX} ${rootFaceTop} L ${shellEdgeX} ${rootFaceBottom} L ${insideStartX} ${bottomY} L ${nozzleX} ${bottomY} Z`}
          fill="#ffccbc" fillOpacity="0.2" stroke="#ff5722" strokeWidth="1"
        />

        {/* Outside weld zone */}
        {outsideDepth > 0 && (
          <g>
            <path d={`M ${nozzleX} ${topY} L ${outsideStartX} ${topY} L ${shellEdgeX} ${rootFaceTop} L ${nozzleX} ${rootFaceTop} Z`}
              fill={PROCESS_COLORS[outsideProcess]?.fill || '#ccc'} fillOpacity="0.4" />
            <text x={nozzleX - 5} y={(topY + rootFaceTop) / 2 + 3} fill={PROCESS_COLORS[outsideProcess]?.text} fontWeight="bold" fontSize="9" textAnchor="end">{outsideProcess}</text>
            {/* Height dim with end lines */}
            <line x1={dimX2} y1={topY} x2={dimX2} y2={rootFaceTop} stroke={PROCESS_COLORS[outsideProcess]?.text} strokeWidth="0.5" />
            <line x1={dimX2-3} y1={topY} x2={dimX2+3} y2={topY} stroke={PROCESS_COLORS[outsideProcess]?.text} strokeWidth="0.5" />
            <line x1={dimX2-3} y1={rootFaceTop} x2={dimX2+3} y2={rootFaceTop} stroke={PROCESS_COLORS[outsideProcess]?.text} strokeWidth="0.5" />
            <text x={dimX2+5} y={(topY + rootFaceTop) / 2 + 3} fill={PROCESS_COLORS[outsideProcess]?.text} fontSize="8">{outsideDepth.toFixed(1)}</text>
          </g>
        )}

        {/* Root face */}
        {rootFace > 0 && sortedLayers.length > 0 && (
          <g>
            <path d={`M ${nozzleX} ${rootFaceTop} L ${shellEdgeX} ${rootFaceTop} L ${shellEdgeX} ${rootFaceBottom} L ${nozzleX} ${rootFaceBottom} Z`}
              fill={PROCESS_COLORS[sortedLayers[0].process]?.fill || '#ccc'} fillOpacity="0.4" />
            <line x1={dimX2} y1={rootFaceTop} x2={dimX2} y2={rootFaceBottom} stroke={PROCESS_COLORS[sortedLayers[0].process]?.text} strokeWidth="0.5" />
            <line x1={dimX2-3} y1={rootFaceTop} x2={dimX2+3} y2={rootFaceTop} stroke={PROCESS_COLORS[sortedLayers[0].process]?.text} strokeWidth="0.5" />
            <line x1={dimX2-3} y1={rootFaceBottom} x2={dimX2+3} y2={rootFaceBottom} stroke={PROCESS_COLORS[sortedLayers[0].process]?.text} strokeWidth="0.5" />
            <text x={dimX2+5} y={(rootFaceTop + rootFaceBottom) / 2 + 3} fill={PROCESS_COLORS[sortedLayers[0].process]?.text} fontSize="8">{rootFace.toFixed(1)}</text>
          </g>
        )}

        {/* Inside weld layers */}
        {layerBoundaries.map((layer, i) => {
          const colors = PROCESS_COLORS[layer.process] || { fill: '#ccc', text: '#666' };
          return (
            <g key={i}>
              <path d={`M ${nozzleX} ${layer.startY} L ${getInsideX(layer.startY)} ${layer.startY} L ${getInsideX(layer.endY)} ${layer.endY} L ${nozzleX} ${layer.endY} Z`}
                fill={colors.fill} fillOpacity="0.4" />
              <text x={nozzleX - 5} y={(layer.startY + layer.endY) / 2 + 3} fill={colors.text} fontWeight="bold" fontSize="9" textAnchor="end">{layer.process}</text>
              {/* Height dim with end lines */}
              <line x1={dimX2} y1={layer.startY} x2={dimX2} y2={layer.endY} stroke={colors.text} strokeWidth="0.5" />
              <line x1={dimX2-3} y1={layer.startY} x2={dimX2+3} y2={layer.startY} stroke={colors.text} strokeWidth="0.5" />
              <line x1={dimX2-3} y1={layer.endY} x2={dimX2+3} y2={layer.endY} stroke={colors.text} strokeWidth="0.5" />
              <text x={dimX2+5} y={(layer.startY + layer.endY) / 2 + 3} fill={colors.text} fontSize="8">{layer.heightMm.toFixed(1)}</text>
            </g>
          );
        })}

        {/* Bevel lines */}
        <line x1={outsideStartX} y1={topY} x2={shellEdgeX} y2={rootFaceTop} stroke="#37474f" strokeWidth="1.5" />
        {rootFace > 0 && <line x1={shellEdgeX} y1={rootFaceTop} x2={shellEdgeX} y2={rootFaceBottom} stroke="#37474f" strokeWidth="2" />}
        <line x1={shellEdgeX} y1={rootFaceBottom} x2={insideStartX} y2={bottomY} stroke="#37474f" strokeWidth="1.5" />

        {/* Split line - stops at nozzle wall */}
        <line x1={nozzleX} y1={meetY} x2={Math.max(outsideStartX, insideStartX) + 10} y2={meetY} stroke="#f57c00" strokeWidth="0.75" strokeDasharray="3,2" />
        <text x={Math.max(outsideStartX, insideStartX) + 12} y={meetY + 3} fill="#f57c00" fontWeight="bold" fontSize="8">{splitRatio}%</text>

        {/* Width dimensions with end lines - moved up */}
        <line x1={nozzleX} y1={topY - 35} x2={outsideStartX} y2={topY - 35} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={nozzleX} y1={topY - 38} x2={nozzleX} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={outsideStartX} y1={topY - 38} x2={outsideStartX} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
        <text x={(nozzleX + outsideStartX) / 2} y={topY - 40} fill="#2196F3" fontWeight="bold" fontSize="8" textAnchor="middle">{outsideTotalWidth.toFixed(1)}mm</text>
        
        <line x1={nozzleX} y1={bottomY + 12} x2={insideStartX} y2={bottomY + 12} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={nozzleX} y1={bottomY + 9} x2={nozzleX} y2={bottomY + 15} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={insideStartX} y1={bottomY + 9} x2={insideStartX} y2={bottomY + 15} stroke="#2196F3" strokeWidth="0.75" />
        <text x={(nozzleX + insideStartX) / 2} y={bottomY + 24} fill="#2196F3" fontWeight="bold" fontSize="8" textAnchor="middle">{insideTotalWidth.toFixed(1)}mm</text>

        {/* Shell thickness with end lines */}
        <line x1={dimX1} y1={topY} x2={dimX1} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
        <line x1={dimX1 - 3} y1={topY} x2={dimX1 + 3} y2={topY} stroke="#FF6B6B" strokeWidth="0.75" />
        <line x1={dimX1 - 3} y1={bottomY} x2={dimX1 + 3} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
        <text x={dimX1 + 5} y={(topY + bottomY) / 2 - 5} fill="#FF6B6B" fontWeight="bold" fontSize="8">Shell Thickness</text>
        <text x={dimX1 + 5} y={(topY + bottomY) / 2 + 7} fill="#FF6B6B" fontWeight="bold" fontSize="9">{shellThick}mm</text>

        {/* Angle labels */}
        <text x={outsideStartX + 4} y={topY + 10} fill="#9C27B0" fontWeight="bold" fontSize="8">{outsideBevelAngle}°</text>
        <text x={insideStartX + 4} y={bottomY - 4} fill="#9C27B0" fontWeight="bold" fontSize="8">{insideBevelAngle}°</text>

        {/* Fillet */}
        <path d={`M ${nozzleX} ${topY} L ${nozzleX} ${topY - filletLeg * scale} L ${nozzleX + filletLeg * scale} ${topY} Z`}
          fill="#4CAF50" fillOpacity="0.6" stroke="#2E7D32" strokeWidth="0.75" />
        {/* Fillet process label - inline with other process labels */}
        <text x={nozzleX - 5} y={topY - filletLeg * scale / 2 + 3} fill="#1B5E20" fontWeight="bold" fontSize="9" textAnchor="end">{filletProcess}</text>
        {/* Fillet height dimension */}
        <line x1={dimX2} y1={topY - filletLeg * scale} x2={dimX2} y2={topY} stroke="#1B5E20" strokeWidth="0.5" />
        <line x1={dimX2-3} y1={topY - filletLeg * scale} x2={dimX2+3} y2={topY - filletLeg * scale} stroke="#1B5E20" strokeWidth="0.5" />
        <line x1={dimX2-3} y1={topY} x2={dimX2+3} y2={topY} stroke="#1B5E20" strokeWidth="0.5" />
        <text x={dimX2+5} y={topY - filletLeg * scale / 2 + 3} fill="#1B5E20" fontSize="8">{filletThroat.toFixed(1)}</text>
      </svg>
    );
  } else {
    // Single bevel
    const bevelWidth = insideBevelWidth;
    const bevelDepth = insideDepth;
    const bevelStartX = shellEdgeX + bevelWidth * scale;
    const rootFaceScaled = rootFace * scale;
    const rootFaceY = bottomY - rootFaceScaled;

    const getBevelX = (y: number) => {
      if (y >= rootFaceY) return shellEdgeX;
      const progress = (y - topY) / (rootFaceY - topY);
      return bevelStartX - progress * bevelWidth * scale;
    };

    // Build layer boundaries for single bevel
    const layerBoundaries: LayerBoundary[] = [];
    for (let i = 0; i < sortedLayers.length; i++) {
      const layer = sortedLayers[i];
      const nextLayer = sortedLayers[i + 1];
      
      const getDepthFromTop = (width: number): number => {
        if (bevelWidth <= 0) return 0;
        if (width <= rootGap) return bevelDepth;
        if (width >= rootGap + bevelWidth) return 0;
        return bevelDepth - (width - rootGap) * bevelDepth / bevelWidth;
      };
      
      const startDepthFromTop = getDepthFromTop(nextLayer ? nextLayer.minWidth : rootGap + bevelWidth);
      const endDepthFromTop = getDepthFromTop(layer.minWidth);
      const heightMm = endDepthFromTop - startDepthFromTop;
      
      if (heightMm > 0.1) {
        layerBoundaries.push({
          process: layer.process,
          startY: topY + startDepthFromTop * scale,
          endY: topY + endDepthFromTop * scale,
          heightMm,
        });
      }
    }

    // Root face area
    if (rootFace > 0 && sortedLayers.length > 0) {
      layerBoundaries.push({
        process: sortedLayers[0].process,
        startY: rootFaceY,
        endY: bottomY,
        heightMm: rootFace,
      });
    }

    const totalWidthMm = rootGap + bevelWidth;

    return (
      <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="weld-diagram" preserveAspectRatio="xMidYMid meet">
        {/* Shell plate reference lines (dashed) */}
        <line x1={nozzleX} y1={topY} x2={dimX1 + 20} y2={topY} stroke="#888" strokeWidth="0.5" strokeDasharray="4,3" />
        <line x1={nozzleX} y1={bottomY} x2={dimX1 + 20} y2={bottomY} stroke="#888" strokeWidth="0.5" strokeDasharray="4,3" />

        {/* Nozzle wall */}
        <line x1={nozzleX} y1={topY - filletLeg * scale - 10} x2={nozzleX} y2={bottomY + 15} stroke="#37474f" strokeWidth="2" />

        {/* Weld groove outline */}
        <path d={`M ${nozzleX} ${topY} L ${bevelStartX} ${topY} L ${shellEdgeX} ${rootFaceY} L ${shellEdgeX} ${bottomY} L ${nozzleX} ${bottomY} Z`}
          fill="#ffccbc" fillOpacity="0.2" stroke="#ff5722" strokeWidth="1" />

        {/* Weld layers */}
        {layerBoundaries.map((layer, i) => {
          const colors = PROCESS_COLORS[layer.process] || { fill: '#ccc', text: '#666' };
          const isRootFace = layer.startY >= rootFaceY - 1;
          return (
            <g key={i}>
              <path d={isRootFace 
                ? `M ${nozzleX} ${layer.startY} L ${shellEdgeX} ${layer.startY} L ${shellEdgeX} ${layer.endY} L ${nozzleX} ${layer.endY} Z`
                : `M ${nozzleX} ${layer.startY} L ${getBevelX(layer.startY)} ${layer.startY} L ${getBevelX(layer.endY)} ${layer.endY} L ${nozzleX} ${layer.endY} Z`}
                fill={colors.fill} fillOpacity="0.4" />
              <text x={nozzleX - 5} y={(layer.startY + layer.endY) / 2 + 3} fill={colors.text} fontWeight="bold" fontSize="9" textAnchor="end">{layer.process}</text>
              {/* Height dim with end lines */}
              <line x1={dimX2} y1={layer.startY} x2={dimX2} y2={layer.endY} stroke={colors.text} strokeWidth="0.5" />
              <line x1={dimX2-3} y1={layer.startY} x2={dimX2+3} y2={layer.startY} stroke={colors.text} strokeWidth="0.5" />
              <line x1={dimX2-3} y1={layer.endY} x2={dimX2+3} y2={layer.endY} stroke={colors.text} strokeWidth="0.5" />
              <text x={dimX2+5} y={(layer.startY + layer.endY) / 2 + 3} fill={colors.text} fontSize="8">{layer.heightMm.toFixed(1)}</text>
            </g>
          );
        })}

        {/* Bevel line */}
        <line x1={bevelStartX} y1={topY} x2={shellEdgeX} y2={rootFaceY} stroke="#37474f" strokeWidth="1.5" />
        {rootFace > 0 && <line x1={shellEdgeX} y1={rootFaceY} x2={shellEdgeX} y2={bottomY} stroke="#37474f" strokeWidth="2" />}

        {/* Width dimension with end lines - moved up */}
        <line x1={nozzleX} y1={topY - 35} x2={bevelStartX} y2={topY - 35} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={nozzleX} y1={topY - 38} x2={nozzleX} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={bevelStartX} y1={topY - 38} x2={bevelStartX} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
        <text x={(nozzleX + bevelStartX) / 2} y={topY - 40} fill="#2196F3" fontWeight="bold" fontSize="8" textAnchor="middle">{totalWidthMm.toFixed(1)}mm</text>

        {/* Shell thickness with end lines */}
        <line x1={dimX1} y1={topY} x2={dimX1} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
        <line x1={dimX1 - 3} y1={topY} x2={dimX1 + 3} y2={topY} stroke="#FF6B6B" strokeWidth="0.75" />
        <line x1={dimX1 - 3} y1={bottomY} x2={dimX1 + 3} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
        <text x={dimX1 + 5} y={(topY + bottomY) / 2 - 5} fill="#FF6B6B" fontWeight="bold" fontSize="8">Shell Thickness</text>
        <text x={dimX1 + 5} y={(topY + bottomY) / 2 + 7} fill="#FF6B6B" fontWeight="bold" fontSize="9">{shellThick}mm</text>

        {/* Angle label */}
        <text x={bevelStartX + 4} y={topY + 10} fill="#9C27B0" fontWeight="bold" fontSize="8">{singleBevelAngle}°</text>

        {/* Fillet */}
        <path d={`M ${nozzleX} ${topY} L ${nozzleX} ${topY - filletLeg * scale} L ${nozzleX + filletLeg * scale} ${topY} Z`}
          fill="#4CAF50" fillOpacity="0.6" stroke="#2E7D32" strokeWidth="0.75" />
        {/* Fillet process label - inline with other process labels */}
        <text x={nozzleX - 5} y={topY - filletLeg * scale / 2 + 3} fill="#1B5E20" fontWeight="bold" fontSize="9" textAnchor="end">{filletProcess}</text>
        {/* Fillet height dimension */}
        <line x1={dimX2} y1={topY - filletLeg * scale} x2={dimX2} y2={topY} stroke="#1B5E20" strokeWidth="0.5" />
        <line x1={dimX2-3} y1={topY - filletLeg * scale} x2={dimX2+3} y2={topY - filletLeg * scale} stroke="#1B5E20" strokeWidth="0.5" />
        <line x1={dimX2-3} y1={topY} x2={dimX2+3} y2={topY} stroke="#1B5E20" strokeWidth="0.5" />
        <text x={dimX2+5} y={topY - filletLeg * scale / 2 + 3} fill="#1B5E20" fontSize="8">{filletThroat.toFixed(1)}</text>
      </svg>
    );
  }
}
