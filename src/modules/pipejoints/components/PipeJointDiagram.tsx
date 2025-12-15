/**
 * Pipe Joint Diagram - SVG visualization of a pipe butt weld joint
 * Based on CircWeldDiagram single-vee but without cap on the narrow side (inside of pipe)
 */

interface PipeJointDiagramProps {
  od: number;           // Outside diameter (mm)
  wallThickness: number; // Wall thickness (mm)
  rootGap: number;      // Root gap (mm)
  rootFace: number;     // Root face/land (mm)
  bevelAngle: number;   // Bevel angle in degrees
  rootProcess?: string;
  fillProcess?: string;
  capProcess?: string;
}

const PROCESS_COLORS: Record<string, { fill: string; text: string }> = {
  GTAW: { fill: '#ff6b6b', text: '#c92a2a' },
  SMAW: { fill: '#ffd93d', text: '#e67700' },
  FCAW: { fill: '#4dabf7', text: '#1971c2' },
  GMAW: { fill: '#69db7c', text: '#2f9e44' },
  SAW: { fill: '#da77f2', text: '#9c36b5' },
};

export function PipeJointDiagram({ 
  wallThickness, 
  rootGap: rawRootGap, 
  rootFace: rawRootFace, 
  bevelAngle,
  rootProcess = 'GTAW',
  fillProcess = 'SMAW',
  capProcess = 'SMAW',
}: PipeJointDiagramProps) {
  // Clamp root gap and root face to sensible values based on wall thickness
  // For thin walls, root gap should not exceed wall thickness
  const rootGap = Math.min(rawRootGap, wallThickness * 0.8);
  const rootFace = Math.min(rawRootFace, wallThickness * 0.4);
  
  // Calculate bevel geometry
  const insideDepth = Math.max(0.5, wallThickness - rootFace);
  const insideBevelWidth = insideDepth * Math.tan((bevelAngle * Math.PI) / 180);
  const insideTopWidth = rootGap + 2 * insideBevelWidth;

  const capHeight = 2;

  const viewBoxWidth = 400;
  const viewBoxHeight = 300;
  const marginLeft = 80;
  const marginRight = 80;
  const marginTop = 60;
  const marginBottom = 60;

  const availableWidth = viewBoxWidth - marginLeft - marginRight;
  const availableHeight = viewBoxHeight - marginTop - marginBottom;

  // Use fixed aspect ratio to keep the groove looking proper
  // Scale based on wall thickness primarily, with a minimum visual height
  const minVisualHeight = 100; // Minimum pixel height for the groove
  const targetHeight = Math.max(minVisualHeight, availableHeight * 0.6);
  
  // Calculate scale based on height, then check if width fits
  const scaleY = targetHeight / wallThickness;
  const scaledWidth = insideTopWidth * scaleY;
  
  // If width would be too large, scale down
  const scale = scaledWidth > availableWidth 
    ? availableWidth / insideTopWidth 
    : scaleY;

  const centerX = viewBoxWidth / 2;
  const halfRootGap = (rootGap * scale) / 2;

  // Center vertically
  const grooveHeight = wallThickness * scale;
  const topY = marginTop + (availableHeight - grooveHeight) / 2;
  const bottomY = topY + grooveHeight;

  const bevelHalfWidth = insideBevelWidth * scale;
  const rootFaceScaled = Math.max(rootFace * scale, 2); // Minimum 2px for visibility
  const rootFaceY = bottomY - rootFaceScaled;

  // For pipe joint: wide side is OUTSIDE (top), narrow side is INSIDE (bottom)
  // Weld from outside, so layers go from top to bottom
  const dimX = centerX + Math.max(insideTopWidth * scale / 2, halfRootGap + bevelHalfWidth) + 30;

  // Define process layers - for pipe we typically have root, fill, cap
  // For thin walls, may only have root + cap (no fill)
  const rootDepthMm = Math.min(rootFace + 1, wallThickness * 0.35);
  const capDepthMm = Math.min(1.5, wallThickness * 0.25);
  const fillDepthMm = Math.max(0, wallThickness - rootDepthMm - capDepthMm);

  // Y positions for each layer (from bottom to top)
  const rootEndY = bottomY - rootDepthMm * scale;
  const fillEndY = fillDepthMm > 0.3 ? rootEndY - fillDepthMm * scale : rootEndY;
  // Cap goes from fillEndY to topY

  // Width calculations at each Y position
  const getLeftX = (y: number) => {
    if (y >= rootFaceY) return centerX - halfRootGap;
    if (y <= topY) return centerX - halfRootGap - bevelHalfWidth;
    const progress = (rootFaceY - y) / (rootFaceY - topY);
    return centerX - halfRootGap - progress * bevelHalfWidth;
  };
  const getRightX = (y: number) => {
    if (y >= rootFaceY) return centerX + halfRootGap;
    if (y <= topY) return centerX + halfRootGap + bevelHalfWidth;
    const progress = (rootFaceY - y) / (rootFaceY - topY);
    return centerX + halfRootGap + progress * bevelHalfWidth;
  };

  const rootColors = PROCESS_COLORS[rootProcess] || { fill: '#ccc', text: '#666' };
  const fillColors = PROCESS_COLORS[fillProcess] || { fill: '#ccc', text: '#666' };
  const capColors = PROCESS_COLORS[capProcess] || { fill: '#ccc', text: '#666' };

  return (
    <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="weld-diagram" preserveAspectRatio="xMidYMid meet">
      {/* Groove outline */}
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

      {/* Root face area (if exists) - filled with root process color */}
      {rootFace > 0 && (
        <path 
          d={`
            M ${centerX - halfRootGap} ${rootFaceY}
            L ${centerX + halfRootGap} ${rootFaceY}
            L ${centerX + halfRootGap} ${bottomY}
            L ${centerX - halfRootGap} ${bottomY}
            Z
          `}
          fill={rootColors.fill} fillOpacity="0.4"
        />
      )}

      {/* Root pass layer */}
      <g>
        <path 
          d={`
            M ${getLeftX(bottomY)} ${bottomY}
            L ${getRightX(bottomY)} ${bottomY}
            L ${getRightX(rootEndY)} ${rootEndY}
            L ${getLeftX(rootEndY)} ${rootEndY}
            Z
          `}
          fill={rootColors.fill} fillOpacity="0.4"
        />
        <text x={marginLeft - 5} y={(bottomY + rootEndY) / 2 + 3} fill={rootColors.text} fontWeight="bold" fontSize="9" textAnchor="end">{rootProcess}</text>
        <line x1={dimX} y1={bottomY} x2={dimX} y2={rootEndY} stroke={rootColors.text} strokeWidth="0.5" />
        <line x1={dimX-3} y1={bottomY} x2={dimX+3} y2={bottomY} stroke={rootColors.text} strokeWidth="0.5" />
        <line x1={dimX-3} y1={rootEndY} x2={dimX+3} y2={rootEndY} stroke={rootColors.text} strokeWidth="0.5" />
        <text x={dimX+5} y={(bottomY + rootEndY) / 2 + 3} fill={rootColors.text} fontSize="8">{rootDepthMm.toFixed(1)}</text>
      </g>

      {/* Fill pass layer - only show if there's meaningful fill depth */}
      {fillDepthMm > 0.5 && (
        <g>
          <path 
            d={`
              M ${getLeftX(rootEndY)} ${rootEndY}
              L ${getRightX(rootEndY)} ${rootEndY}
              L ${getRightX(fillEndY)} ${fillEndY}
              L ${getLeftX(fillEndY)} ${fillEndY}
              Z
            `}
            fill={fillColors.fill} fillOpacity="0.4"
          />
          <text x={marginLeft - 5} y={(rootEndY + fillEndY) / 2 + 3} fill={fillColors.text} fontWeight="bold" fontSize="9" textAnchor="end">{fillProcess}</text>
          <line x1={dimX} y1={rootEndY} x2={dimX} y2={fillEndY} stroke={fillColors.text} strokeWidth="0.5" />
          <line x1={dimX-3} y1={fillEndY} x2={dimX+3} y2={fillEndY} stroke={fillColors.text} strokeWidth="0.5" />
          <text x={dimX+5} y={(rootEndY + fillEndY) / 2 + 3} fill={fillColors.text} fontSize="8">{fillDepthMm.toFixed(1)}</text>
        </g>
      )}

      {/* Cap pass layer (at top/wide side only) */}
      <g>
        <path 
          d={`
            M ${getLeftX(fillEndY)} ${fillEndY}
            L ${getRightX(fillEndY)} ${fillEndY}
            L ${getRightX(topY)} ${topY}
            L ${getLeftX(topY)} ${topY}
            Z
          `}
          fill={capColors.fill} fillOpacity="0.4"
        />
        <text x={marginLeft - 5} y={(fillEndY + topY) / 2 + 3} fill={capColors.text} fontWeight="bold" fontSize="9" textAnchor="end">{capProcess}</text>
        <line x1={dimX} y1={fillEndY} x2={dimX} y2={topY} stroke={capColors.text} strokeWidth="0.5" />
        <line x1={dimX-3} y1={topY} x2={dimX+3} y2={topY} stroke={capColors.text} strokeWidth="0.5" />
        <text x={dimX+5} y={(fillEndY + topY) / 2 + 3} fill={capColors.text} fontSize="8">{capDepthMm.toFixed(1)}</text>
      </g>

      {/* Cap reinforcement on OUTSIDE only (top/wide side) */}
      <path 
        d={`
          M ${centerX - halfRootGap - bevelHalfWidth} ${topY}
          Q ${centerX} ${topY - capHeight * scale * 1.5} ${centerX + halfRootGap + bevelHalfWidth} ${topY}
          Z
        `}
        fill={capColors.fill} fillOpacity="0.5"
        stroke={capColors.text} strokeWidth="1"
      />

      {/* NO cap/reinforcement on inside (bottom/narrow side) - this is the key difference */}

      {/* Groove edges */}
      <line x1={centerX - halfRootGap - bevelHalfWidth} y1={topY} x2={centerX - halfRootGap} y2={rootFaceY} stroke="#37474f" strokeWidth="1.5" />
      <line x1={centerX + halfRootGap + bevelHalfWidth} y1={topY} x2={centerX + halfRootGap} y2={rootFaceY} stroke="#37474f" strokeWidth="1.5" />
      
      {rootFace > 0 && (
        <>
          <line x1={centerX - halfRootGap} y1={rootFaceY} x2={centerX - halfRootGap} y2={bottomY} stroke="#37474f" strokeWidth="2" />
          <line x1={centerX + halfRootGap} y1={rootFaceY} x2={centerX + halfRootGap} y2={bottomY} stroke="#37474f" strokeWidth="2" />
        </>
      )}

      {/* Top width dimension */}
      <line x1={centerX - halfRootGap - bevelHalfWidth} y1={topY - 35} x2={centerX + halfRootGap + bevelHalfWidth} y2={topY - 35} stroke="#2196F3" strokeWidth="0.75" />
      <line x1={centerX - halfRootGap - bevelHalfWidth} y1={topY - 38} x2={centerX - halfRootGap - bevelHalfWidth} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
      <line x1={centerX + halfRootGap + bevelHalfWidth} y1={topY - 38} x2={centerX + halfRootGap + bevelHalfWidth} y2={topY - 32} stroke="#2196F3" strokeWidth="0.75" />
      <text x={centerX} y={topY - 40} fill="#2196F3" fontWeight="bold" fontSize="8" textAnchor="middle">{insideTopWidth.toFixed(1)}mm</text>

      {/* Root gap dimension */}
      <line x1={centerX - halfRootGap} y1={bottomY + 20} x2={centerX + halfRootGap} y2={bottomY + 20} stroke="#2196F3" strokeWidth="0.75" />
      <line x1={centerX - halfRootGap} y1={bottomY + 17} x2={centerX - halfRootGap} y2={bottomY + 23} stroke="#2196F3" strokeWidth="0.75" />
      <line x1={centerX + halfRootGap} y1={bottomY + 17} x2={centerX + halfRootGap} y2={bottomY + 23} stroke="#2196F3" strokeWidth="0.75" />
      <text x={centerX} y={bottomY + 33} fill="#2196F3" fontWeight="bold" fontSize="8" textAnchor="middle">Gap: {rootGap.toFixed(1)}mm</text>

      {/* Wall thickness dimension */}
      <line x1={marginLeft - 45} y1={topY} x2={marginLeft - 45} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
      <line x1={marginLeft - 48} y1={topY} x2={marginLeft - 42} y2={topY} stroke="#FF6B6B" strokeWidth="0.75" />
      <line x1={marginLeft - 48} y1={bottomY} x2={marginLeft - 42} y2={bottomY} stroke="#FF6B6B" strokeWidth="0.75" />
      <text x={marginLeft - 50} y={(topY + bottomY) / 2 - 5} fill="#FF6B6B" fontWeight="bold" fontSize="8" textAnchor="end">Wall</text>
      <text x={marginLeft - 50} y={(topY + bottomY) / 2 + 7} fill="#FF6B6B" fontWeight="bold" fontSize="9" textAnchor="end">{wallThickness.toFixed(1)}mm</text>

      {/* Note if parameters were adjusted */}
      {(rawRootGap !== rootGap || rawRootFace !== rootFace) && (
        <text x={centerX} y={viewBoxHeight - 15} fill="#ffc107" fontSize="8" textAnchor="middle">
          * Diagram adjusted for thin wall
        </text>
      )}

      {/* Bevel angle */}
      <text x={centerX} y={(topY + rootFaceY) / 2 + 3} fill="#9C27B0" fontWeight="bold" fontSize="8" textAnchor="middle">{bevelAngle}°</text>

      {/* Side labels */}
      <text x={viewBoxWidth - 5} y={topY + 15} fill="#4ade80" fontWeight="bold" fontSize="9" textAnchor="end">OUTSIDE</text>
      <text x={viewBoxWidth - 5} y={bottomY - 5} fill="#64b5f6" fontWeight="bold" fontSize="9" textAnchor="end">INSIDE</text>
    </svg>
  );
}
