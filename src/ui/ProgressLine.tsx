/** Progress: a 14 px sunken track with 3 px of padding and an ice-to-blue pill inside, under the item it describes. */
export function ProgressLine({ value, label, color }: { value: number; label: string; color?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="well flex h-3.5 w-full rounded-pill p-[3px]"
    >
      <div className="progress-fill h-full rounded-pill" style={{ width: percent + '%', ...(color ? { background: color } : {}) }} />
    </div>
  );
}
