import type { WeldProcess } from '../../../shared/types';
import type { CircWeldGeometry, ProcessLayer } from '../types';

interface CircWeldDiagramProps {
  geometry: CircWeldGeometry;
  insideLayers: ProcessLayer[];
  outsideProcess: Exclude<WeldProcess, 'Skip'>;
}

const PROCESS_COLORS: Record<string, { fill: string; text: string }> = {
  GTAW: { fill: '#ff6b6b', text: '#c92a2a' },
  SMAW: { fill: '#ffd93d', text: '#e67700' },
  FCAW: { fill: '#4dabf7', text: '#1971c2' },
  GMAW: { fill: '#69db7c', text: '#2f9e44' },
  SAW: { fill: '#da77f2', text: '#9c36b5' },
};

interface LayerBoundary {
  process: string;
  startY: number;
  endY: number;
  heightMm: number;
}

export function CircWeldDiagram({ geometry, insideLayers, outsideProcess }: CircWeldDiagramProps) {
  const { 
    shellThickness, 
    jointType, 
    insideBevelAngle, 
    outsideBevelAngle, 
    rootGap, 
    rootFace,
    splitRatio 
  } = geometry;

  const isVeeJoint = true;
  const isDoubleSided = jointType === 'doublevee';

  // Calculate depths
  let insideDepth: number;
  let outsideDepth: number;

  if (isDoubleSided) {
    const splitDecimal = splitRatio / 100;
    insideDepth = Math.max(0, shellThickness * splitDecimal - rootFace / 2);
    outsideDepth = Math.max(0, shellThickness * (1 - splitDecimal) - rootFace / 2);
  } else {
    insideDepth = Math.max(0, shellThickness - rootFace);
    outsideDepth = 0;
  }

  const insideBevelWidth = insideDepth * Math.tan((insideBevelAngle * Math.PI) / 180);
  const outsideBevelWidth = outsideDepth * Math.tan((outsideBevelAngle * Math.PI) / 180);

  const insideTopWidth = isVeeJoint ? rootGap + 2 * insideBevelWidth : rootGap + insideBevelWidth;
  const outsideTopWidth = isVeeJoint ? rootGap + 2 * outsideBevelWidth : rootGap + outsideBevelWidth;

  const maxWidth = Math.max(insideTopWidth, outsideTopWidth);

  const capHeight = 3;

  const viewBoxWidth = 400;
  const viewBoxHeight = 300;
  const marginLeft = 80;
  const marginRight = 80;
  const marginTop = 60;
  const marginBottom = 60;

  const availableWidth = viewBoxWidth - marginLeft - marginRight;
  const availableHeight = viewBoxHeight - marginTop - marginBottom;

  const scaleX = availableWidth / maxWidth;
  const scaleY = availableHeight / shellThickness;
  const scale = Math.min(scaleX, scaleY);

  const centerX = viewBoxWidth / 2;
  const halfRootGap = (rootGap * scale) / 2;

  const topY = marginTop;
  const bottomY = topY + shellThickness * scale;

  const sortedLayers = [...insideLayers].sort((a, b) => a.minWidth - b.minWidth);

  const getDepthForWidth = (width: number, totalDepth: number, bevelWidth: number): number => {
    const effectiveWidth = isVeeJoint ? width / 2 : width;
    if (effectiveWidth <= rootGap / 2) return 0;
    if (bevelWidth <= 0) return totalDepth;
    const widthFromRoot = effectiveWidth - rootGap / 2;
    return Math.min(totalDepth, Math.max(0, widthFromRoot * totalDepth / bevelWidth));
  };

  const dimX = centerX + maxWidth * scale / 2 + 30;

  if (isDoubleSided) {
    const splitDecimal = splitRatio / 100;
    const meetY = topY + shellThickness * (1 - splitDecimal) * scale;
    const rootFaceScaled = rootFace * scale;
    const rootFaceTop = meetY - rootFaceScaled / 2;
    const rootFaceBottom = meetY + rootFaceScaled / 2;

    const outsideHalfWidth = isVeeJoint ? outsideBevelWidth * scale : outsideBevelWidth * scale / 2;
    const insideHalfWidth = isVeeJoint ? insideBevelWidth * scale : insideBevelWidth * scale / 2;

    const getInsideY = (depthMm: number) => rootFaceBottom + depthMm * scale;
    const getInsideLeftX = (y: number) => {
      if (y <= rootFaceBottom) return centerX - halfRootGap;
      const progress = (y - rootFaceBottom) / (bottomY - rootFaceBottom);
      return centerX - halfRootGap - progress * insideHalfWidth;
    };
    const getInsideRightX = (y: number) => {
      if (y <= rootFaceBottom) return centerX + halfRootGap;
      const progress = (y - rootFaceBottom) / (bottomY - rootFaceBottom);
      return centerX + halfRootGap + progress * insideHalfWidth;
    };

    const insideLayerBoundaries: LayerBoundary[] = [];
    for (let i = 0; i < sortedLayers.length; i++) {
      const layer = sortedLayers[i];
      const nextLayer = sortedLayers[i + 1];
      const startDepthMm = getDepthForWidth(layer.minWidth, insideDepth, insideBevelWidth);
      const endDepthMm = nextLayer ? getDepthForWidth(nextLayer.minWidth, insideDepth, insideBevelWidth) : insideDepth;
      const heightMm = endDepthMm - startDepthMm;
      if (heightMm > 0) {
        insideLayerBoundaries.push({
          process: layer.process,
          startY: getInsideY(startDepthMm),
          endY: getInsideY(endDepthMm),
          heightMm,
        });
      }
    }

    return (
      <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="weld-diagram" preserveAspectRatio="xMidYMid meet">
        <path 
          d={`
            M ${centerX - halfRootGap - outsideHalfWidth} ${topY}
            L ${centerX - halfRootGap} ${rootFaceTop}
            L ${centerX - halfRootGap} ${rootFaceBottom}
            L ${centerX - halfRootGap - insideHalfWidth} ${bottomY}
            L ${centerX + halfRootGap + insideHalfWidth} ${bottomY}
            L ${centerX + halfRootGap} ${rootFaceBottom}
            L ${centerX + halfRootGap} ${rootFaceTop}
            L ${centerX + halfRootGap + outsideHalfWidth} ${topY}
            Z
          `}
          fill="#ffccbc" fillOpacity="0.2" stroke="#ff5722" strokeWidth="1"
        />

        {outsideDepth > 0 && (
          <g>
            <path 
              d={`
                M ${centerX - halfRootGap - outsideHalfWidth} ${topY}
                L ${centerX - halfRootGap} ${rootFaceTop}
                L ${centerX + halfRootGap} ${rootFaceTop}
                L ${centerX + halfRootGap + outsideHalfWidth} ${topY}
                Z
              `}
              fill={PROCESS_COLORS[outsideProcess]?.fill || '#ccc'} fillOpacity="0.4"
            />
            <text x={marginLeft - 5} y={(topY + rootFaceTop) / 2 + 3} fill={PROCESS_COLORS[outsideProcess]?.text} fontWeight="bold" fontSize="9" textAnchor="end">{outsideProcess}</text>
            {/* Height dimension for outside weld */}
            <line x1={dimX} y1={topY} x2={dimX} y2={rootFaceTop} stroke={PROCESS_COLORS[outsideProcess]?.text || '#666'} strokeWidth="0.5" />
            <line x1={dimX-3} y1={topY} x2={dimX+3} y2={topY} stroke={PROCESS_COLORS[outsideProcess]?.text || '#666'} strokeWidth="0.5" />
            <line x1={dimX-3} y1={rootFaceTop} x2={dimX+3} y2={rootFaceTop} stroke={PROCESS_COLORS[outsideProcess]?.text || '#666'} strokeWidth="0.5" />
            <text x={dimX+5} y={(topY + rootFaceTop) / 2 + 3} fill={PROCESS_COLORS[outsideProcess]?.text || '#666'} fontSize="8">{outsideDepth.toFixed(1)}</text>
          </g>
        )}

        {outsideDepth > 0 && (
          <g>
            <path 
              d={`
                M ${centerX - halfRootGap - outsideHalfWidth} ${topY}
                Q ${centerX} ${topY - capHeight * scale * 1.5} ${centerX + halfRootGap + outsideHalfWidth} ${topY}
                Z
              `}
              fill={PROCESS_COLORS[outsideProcess]?.fill || '#ccc'} fillOpacity="0.5"
              stroke={PROCESS_COLORS[outsideProcess]?.text || '#666'} strokeWidth="1"
            />
          </g>
        )}

        {rootFace > 0 && sortedLayers.length > 0 && (
          <path 
            d={`
              M ${centerX - halfRootGap} ${rootFaceTop}
              L ${centerX + halfRootGap} ${rootFaceTop}
              L ${centerX + halfRootGap} ${rootFaceBottom}
              L ${centerX - halfRootGap} ${rootFaceBottom}
              Z
            `}
            fill={PROCESS_COLORS[sortedLayers[0].process]?.fill || '#ccc'} fillOpacity="0.4"
          />
        )}

        {insideLayerBoundaries.map((layer, i) => {
          const colors = PROCESS_COLORS[layer.process] || { fill: '#ccc', text: '#666' };
          return (
            <g key={i}>
              <path 
                d={`
                  M ${getInsideLeftX(layer.startY)} ${layer.startY}
                  L ${getInsideRightX(layer.startY)} ${layer.startY}
                  L ${getInsideRightX(layer.endY)} ${layer.endY}
                  L ${getInsideLeftX(layer.endY)} ${layer.endY}
                  Z
                `}
                fill={colors.fill} fillOpacity="0.4"
              />
              <text x={marginLeft - 5} y={(layer.startY + layer.endY) / 2 + 3} fill={colors.text} fontWeight="bold" fontSize="9" textAnchor="end">{layer.process}</text>
              <line x1={dimX} y1={layer.startY} x2={dimX} y2={layer.endY} stroke={colors.text} strokeWidth="0.5" />
              <line x1={dimX-3} y1={layer.startY} x2={dimX+3} y2={layer.startY} stroke={colors.text} strokeWidth="0.5" />
              <line x1={dimX-3} y1={layer.endY} x2={dimX+3} y2={layer.endY} stroke={colors.text} strokeWidth="0.5" />
              <text x={dimX+5} y={(layer.startY + layer.endY) / 2 + 3} fill={colors.text} fontSize="8">{layer.heightMm.toFixed(1)}</text>
            </g>
          );
        })}

        {sortedLayers.length > 0 && (() => {
          const lastProcess = sortedLayers[sortedLayers.length - 1].process;
          const colors = PROCESS_COLORS[lastProcess] || { fill: '#ccc', text: '#666' };
          return (
            <g>
              <path 
                d={`
                  M ${centerX - halfRootGap - insideHalfWidth} ${bottomY}
                  Q ${centerX} ${bottomY + capHeight * scale * 1.5} ${centerX + halfRootGap + insideHalfWidth} ${bottomY}
                  Z
                `}
                fill={colors.fill} fillOpacity="0.5"
                stroke={colors.text} strokeWidth="1"
              />
            </g>
          );
        })()}

        <line x1={centerX - halfRootGap - outsideHalfWidth} y1={topY} x2={centerX - halfRootGap} y2={rootFaceTop} stroke="#37474f" strokeWidth="1.5" />
        <line x1={centerX + halfRootGap + outsideHalfWidth} y1={topY} x2={centerX + halfRootGap} y2={rootFaceTop} stroke="#37474f" strokeWidth="1.5" />
        <line x1={centerX - halfRootGap} y1={rootFaceBottom} x2={centerX - halfRootGap - insideHalfWidth} y2={bottomY} stroke="#37474f" strokeWidth="1.5" />
        <line x1={centerX + halfRootGap} y1={rootFaceBottom} x2={centerX + halfRootGap + insideHalfWidth} y2={bottomY} stroke="#37474f" strokeWidth="1.5" />
        
        {rootFace > 0 && (
          <>
            <line x1={centerX - halfRootGap} y1={rootFaceTop} x2={centerX - halfRootGap} y2={rootFaceBottom} stroke="#37474f" strokeWidth="2" />
            <line x1={centerX + halfRootGap} y1={rootFaceTop} x2={centerX + halfRootGap} y2={rootFaceBottom} stroke="#37474f" strokeWidth="2" />
          </>
        )}

        <line x1={centerX - halfRootGap - 10} y1={meetY} x2={centerX + halfRootGap + 10} y2={meetY} stroke="#f57c00" strokeWidth="0.75" strokeDasharray="3,2" />
        <text x={centerX + halfRootGap + 15} y={meetY + 3} fill="#f57c00" fontWeight="bold" fontSize="8">{splitRatio}%</text>

        <line x1={centerX - halfRootGap - outsideHalfWidth} y1={topY - 35} x2={centerX + halfRootGap + outsideHalfWidth} y2={topY - 35} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={centerX - halfRootGap - outsideHalfWidth} y1={topY - 38} x2={centerX - halfRootGap - outsideHalfWidth} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={centerX + halfRootGap + outsideHalfWidth} y1={topY - 38} x2={centerX + halfRootGap + outsideHalfWidth} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
        <text x={centerX} y={topY - 40} fill="#2196F3" fontWeight="bold" fontSize="8" textAnchor="middle">{outsideTopWidth.toFixed(1)}mm</text>

        <line x1={centerX - halfRootGap - insideHalfWidth} y1={bottomY + 30} x2={centerX + halfRootGap + insideHalfWidth} y2={bottomY + 30} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={centerX - halfRootGap - insideHalfWidth} y1={bottomY + 27} x2={centerX - halfRootGap - insideHalfWidth} y2={bottomY + 33} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={centerX + halfRootGap + insideHalfWidth} y1={bottomY + 27} x2={centerX + halfRootGap + insideHalfWidth} y2={bottomY + 33} stroke="#2196F3" strokeWidth="0.75" />
        <text x={centerX} y={bottomY + 43} fill="#2196F3" fontWeight="bold" fontSize="8" textAnchor="middle">{insideTopWidth.toFixed(1)}mm</text>

        <line x1={marginLeft - 45} y1={topY} x2={marginLeft - 45} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
        <line x1={marginLeft - 48} y1={topY} x2={marginLeft - 42} y2={topY} stroke="#FF6B6B" strokeWidth="0.75" />
        <line x1={marginLeft - 48} y1={bottomY} x2={marginLeft - 42} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
        <text x={marginLeft - 50} y={(topY + bottomY) / 2 - 5} fill="#FF6B6B" fontWeight="bold" fontSize="8" textAnchor="end">Plate</text>
        <text x={marginLeft - 50} y={(topY + bottomY) / 2 + 7} fill="#FF6B6B" fontWeight="bold" fontSize="9" textAnchor="end">{shellThickness}mm</text>

        <text x={centerX} y={(topY + rootFaceTop) / 2 + 3} fill="#9C27B0" fontWeight="bold" fontSize="8" textAnchor="middle">{outsideBevelAngle}°</text>
        <text x={centerX} y={(rootFaceBottom + bottomY) / 2 + 3} fill="#9C27B0" fontWeight="bold" fontSize="8" textAnchor="middle">{insideBevelAngle}°</text>

        {/* Side labels - positioned at far right */}
        <text x={viewBoxWidth - 10} y={topY + 15} fill="#64b5f6" fontWeight="bold" fontSize="9" textAnchor="end">2ND SIDE</text>
        <text x={viewBoxWidth - 10} y={bottomY - 5} fill="#4ade80" fontWeight="bold" fontSize="9" textAnchor="end">1ST SIDE</text>
      </svg>
    );
  } else {
    const bevelHalfWidth = insideBevelWidth * scale;
    const rootFaceScaled = rootFace * scale;
    const rootFaceY = bottomY - rootFaceScaled;

    const getInsideY = (depthMm: number) => rootFaceY - depthMm * scale;
    
    const getInsideLeftX = (y: number) => {
      if (y >= rootFaceY) return centerX - halfRootGap;
      if (y <= topY) return centerX - halfRootGap - bevelHalfWidth;
      const progress = (rootFaceY - y) / (rootFaceY - topY);
      return centerX - halfRootGap - progress * bevelHalfWidth;
    };
    const getInsideRightX = (y: number) => {
      if (y >= rootFaceY) return centerX + halfRootGap;
      if (y <= topY) return centerX + halfRootGap + bevelHalfWidth;
      const progress = (rootFaceY - y) / (rootFaceY - topY);
      return centerX + halfRootGap + progress * bevelHalfWidth;
    };

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

    return (
      <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="weld-diagram" preserveAspectRatio="xMidYMid meet">
        <path 
          d={`
            M ${centerX - halfRootGap - bevelHalfWidth} ${topY}
            L ${centerX - halfRootGap} ${rootFaceY}
            L ${centerX - halfRootGap} ${bottomY}
            L ${centerX + halfRootGap} ${bottomY}
            L ${centerX + halfRootGap} ${rootFaceY}
            L ${centerX + halfRootGap + bevelHalfWidth} ${topY}
            Z
          `}
          fill="#ffccbc" fillOpacity="0.2" stroke="#ff5722" strokeWidth="1"
        />

        {rootFace > 0 && sortedLayers.length > 0 && (
          <path 
            d={`
              M ${centerX - halfRootGap} ${rootFaceY}
              L ${centerX + halfRootGap} ${rootFaceY}
              L ${centerX + halfRootGap} ${bottomY}
              L ${centerX - halfRootGap} ${bottomY}
              Z
            `}
            fill={PROCESS_COLORS[sortedLayers[0].process]?.fill || '#ccc'} fillOpacity="0.4"
          />
        )}

        {layerBoundaries.map((layer, i) => {
          const colors = PROCESS_COLORS[layer.process] || { fill: '#ccc', text: '#666' };
          const upperY = Math.min(layer.startY, layer.endY);
          const lowerY = Math.max(layer.startY, layer.endY);
          return (
            <g key={i}>
              <path 
                d={`
                  M ${getInsideLeftX(upperY)} ${upperY}
                  L ${getInsideRightX(upperY)} ${upperY}
                  L ${getInsideRightX(lowerY)} ${lowerY}
                  L ${getInsideLeftX(lowerY)} ${lowerY}
                  Z
                `}
                fill={colors.fill} fillOpacity="0.4"
              />
              <text x={marginLeft - 5} y={(upperY + lowerY) / 2 + 3} fill={colors.text} fontWeight="bold" fontSize="9" textAnchor="end">{layer.process}</text>
              <line x1={dimX} y1={upperY} x2={dimX} y2={lowerY} stroke={colors.text} strokeWidth="0.5" />
              <line x1={dimX-3} y1={upperY} x2={dimX+3} y2={upperY} stroke={colors.text} strokeWidth="0.5" />
              <line x1={dimX-3} y1={lowerY} x2={dimX+3} y2={lowerY} stroke={colors.text} strokeWidth="0.5" />
              <text x={dimX+5} y={(upperY + lowerY) / 2 + 3} fill={colors.text} fontSize="8">{layer.heightMm.toFixed(1)}</text>
            </g>
          );
        })}

        {sortedLayers.length > 0 && (() => {
          const lastProcess = sortedLayers[sortedLayers.length - 1].process;
          const colors = PROCESS_COLORS[lastProcess] || { fill: '#ccc', text: '#666' };
          return (
            <g>
              <path 
                d={`
                  M ${centerX - halfRootGap - bevelHalfWidth} ${topY}
                  Q ${centerX} ${topY - capHeight * scale * 1.5} ${centerX + halfRootGap + bevelHalfWidth} ${topY}
                  Z
                `}
                fill={colors.fill} fillOpacity="0.5"
                stroke={colors.text} strokeWidth="1"
              />
            </g>
          );
        })()}

        {sortedLayers.length > 0 && (() => {
          const firstProcess = sortedLayers[0].process;
          const colors = PROCESS_COLORS[firstProcess] || { fill: '#ccc', text: '#666' };
          const backWeldHalfWidth = halfRootGap + 5 * scale;
          return (
            <g>
              <path 
                d={`
                  M ${centerX - backWeldHalfWidth} ${bottomY}
                  Q ${centerX} ${bottomY + capHeight * scale * 1.2} ${centerX + backWeldHalfWidth} ${bottomY}
                  Z
                `}
                fill={colors.fill} fillOpacity="0.5"
                stroke={colors.text} strokeWidth="1"
              />
            </g>
          );
        })()}

        <line x1={centerX - halfRootGap - bevelHalfWidth} y1={topY} x2={centerX - halfRootGap} y2={rootFaceY} stroke="#37474f" strokeWidth="1.5" />
        <line x1={centerX + halfRootGap + bevelHalfWidth} y1={topY} x2={centerX + halfRootGap} y2={rootFaceY} stroke="#37474f" strokeWidth="1.5" />
        
        {rootFace > 0 && (
          <>
            <line x1={centerX - halfRootGap} y1={rootFaceY} x2={centerX - halfRootGap} y2={bottomY} stroke="#37474f" strokeWidth="2" />
            <line x1={centerX + halfRootGap} y1={rootFaceY} x2={centerX + halfRootGap} y2={bottomY} stroke="#37474f" strokeWidth="2" />
          </>
        )}

        <line x1={centerX - halfRootGap - bevelHalfWidth} y1={topY - 35} x2={centerX + halfRootGap + bevelHalfWidth} y2={topY - 35} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={centerX - halfRootGap - bevelHalfWidth} y1={topY - 38} x2={centerX - halfRootGap - bevelHalfWidth} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
        <line x1={centerX + halfRootGap + bevelHalfWidth} y1={topY - 38} x2={centerX + halfRootGap + bevelHalfWidth} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
        <text x={centerX} y={topY - 40} fill="#2196F3" fontWeight="bold" fontSize="8" textAnchor="middle">{insideTopWidth.toFixed(1)}mm</text>

        <line x1={marginLeft - 45} y1={topY} x2={marginLeft - 45} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
        <line x1={marginLeft - 48} y1={topY} x2={marginLeft - 42} y2={topY} stroke="#FF6B6B" strokeWidth="0.75" />
        <line x1={marginLeft - 48} y1={bottomY} x2={marginLeft - 42} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
        <text x={marginLeft - 50} y={(topY + bottomY) / 2 - 5} fill="#FF6B6B" fontWeight="bold" fontSize="8" textAnchor="end">Plate</text>
        <text x={marginLeft - 50} y={(topY + bottomY) / 2 + 7} fill="#FF6B6B" fontWeight="bold" fontSize="9" textAnchor="end">{shellThickness}mm</text>

        <text x={centerX} y={(topY + rootFaceY) / 2 + 3} fill="#9C27B0" fontWeight="bold" fontSize="8" textAnchor="middle">{insideBevelAngle}°</text>

        {/* Side labels - positioned at far right */}
        <text x={viewBoxWidth} y={topY + 15} fill="#4ade80" fontWeight="bold" fontSize="9" textAnchor="end">1ST SIDE</text>
        <text x={viewBoxWidth} y={bottomY - 5} fill="#64b5f6" fontWeight="bold" fontSize="9" textAnchor="end">2ND SIDE</text>
      </svg>
    );
  }
}

