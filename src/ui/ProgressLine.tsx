/** Progress is a thin line, not a bar in a box: 2 px, full width, under the item it describes. */
export function ProgressLine({ value, label, color }: { value: number; label: string; color?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-0.5 w-full bg-line"
    >
      <div className="h-full bg-accent" style={{ width: percent + '%', background: color }} />
    </div>
  );
}
