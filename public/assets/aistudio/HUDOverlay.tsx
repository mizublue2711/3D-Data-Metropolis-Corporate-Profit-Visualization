import React, { useState, useEffect } from 'react';
import { Layers, Activity, Maximize2, RefreshCw } from 'lucide-react';
import { BrutalistButton } from './BrutalistButton';

/**
 * ============================================================================
 * ARTIFICIAL CRAFT // FLOATING SWISS CAD HUD OVERLAY
 * File: HUDOverlay.tsx
 * Architecture: React UI Tactical Layer for WebGL Canvas
 * Protocol Rules: border-radius: 0px !important, JetBrains Mono telemetry,
 *                 Space Grotesk uppercase headings, [ 01 // TAXONOMY ] bracket syntax.
 * ============================================================================
 */

interface HUDOverlayProps {
  onToggleDock?: () => void;
  onResetCamera?: () => void;
  fps?: number;
  activeNodeLabel?: string;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  onToggleDock,
  onResetCamera,
  fps = 60,
  activeNodeLabel = 'METROPOLIS_ROOT'
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
        if (onToggleDock) onToggleDock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleDock]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-between p-4 font-mono select-none">
      {/* --- TOP HUD LAYER --- */}
      <div className="flex items-start justify-between">
        {/* Top-Left: CAD Identity & Bracket Taxonomy */}
        <div className="pointer-events-auto flex flex-col gap-1 border border-[#1F1F2E] bg-[#0A0C14]/90 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#00E5FF]">
            <Activity size={14} className="animate-pulse stroke-[1.25]" />
            <span>[ ARTIFICIAL CRAFT // METROPOLIS_V2 ]</span>
          </div>
          <div className="text-[10px] text-[#8A8FA3]">
            SYSTEM_STATUS: <span className="text-[#10B981]">ONLINE</span> // REGION: ASIA_EAST
          </div>
        </div>

        {/* Top-Right: Executive Action CTA & Collapsible Pill Trigger */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Micro Pill Dock Trigger [H] */}
          <button
            onClick={() => {
              setIsDockCollapsed(!isDockCollapsed);
              if (onToggleDock) onToggleDock();
            }}
            className="flex h-8 w-8 items-center justify-between border border-[#1F1F2E] bg-[#0A0C14] text-[#8A8FA3] transition-colors hover:border-[#00E5FF] hover:text-[#00E5FF]"
            title="Toggle Control Dock [H]"
          >
            <Layers size={16} className="m-auto stroke-[1.25]" />
          </button>

          <BrutalistButton variant="primary" size="md" onClick={() => console.log('EXECUTE_RENDER')}>
            [ RENDER 60FPS ]
          </BrutalistButton>
        </div>
      </div>

      {/* --- CENTER VIEWPORT CROSSHAIRS --- */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
        <div className="h-4 w-4 border-t border-l border-[#00E5FF]" />
        <div className="h-4 w-4 border-t border-r border-[#00E5FF]" />
        <div className="h-4 w-4 border-b border-l border-[#00E5FF]" />
        <div className="h-4 w-4 border-b border-r border-[#00E5FF]" />
      </div>

      {/* --- BOTTOM HUD LAYER --- */}
      <div className="flex items-end justify-between">
        {/* Bottom-Left: Telemetry & Position Coordinates */}
        <div className="pointer-events-auto border border-[#1F1F2E] bg-[#0A0C14]/90 px-3 py-2 text-[10px] text-[#8A8FA3] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span>[ ⏣ GPU_LOCK • {fps} FPS ]</span>
            <span className="text-[#00E5FF]">ACTIVE_NODE: {activeNodeLabel}</span>
            <span>LOC: X+3.22m Y-1.04m Z-4.50m</span>
          </div>
        </div>

        {/* Bottom-Right: CAD Corner Badge */}
        <div className="pointer-events-auto border border-[#1F1F2E] bg-[#0A0C14] px-2 py-1 text-[9px] tracking-widest text-[#8A8FA3]">
          [ SWISS_CAD // GRID_ID: A-01 ]
        </div>
      </div>
    </div>
  );
};
