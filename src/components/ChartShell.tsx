'use client';
import { useChart } from '@/state/ChartProvider';
import { tToDate, formatInstant } from '@/chart/time';
import { WorkbenchWindow } from './WorkbenchWindow';
import { ChartCanvas } from './ChartCanvas';
import { LiveReadout } from './LiveReadout';
import { ChartDock } from './ChartDock';
import { OraclePanel } from './OraclePanel';

/**
 * Layout C: the chart framed as a single Workbench window centered on the
 * desktop. The title bar carries the always-on, zoom-adaptive instant readout;
 * the plot fills the body with the side dock docked to its right.
 */
export function ChartShell() {
  const { view } = useChart();
  const span = view.tLeft - view.tRight;
  const centerInstant = formatInstant(tToDate((view.tLeft + view.tRight) / 2), span);

  return (
    <div className="absolute inset-3 sm:inset-4 flex">
      <WorkbenchWindow
        className="flex-1"
        bodyClassName="flex flex-col min-h-0 overflow-hidden"
        prankGadgets
        title={<span className="tabular-nums">TIMEWAVE.CHART — {centerInstant}</span>}
      >
        <div className="flex flex-col sm:flex-row min-h-0 flex-1">
          <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
            <ChartCanvas />
            <LiveReadout />
          </div>
          <ChartDock />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <OraclePanel />
        </div>
      </WorkbenchWindow>
    </div>
  );
}
