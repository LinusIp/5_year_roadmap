/**
 * Progress: a 14 px sunken track with 3 px of padding and an ice-to-blue pill inside, under the item it describes.
 * With a `lane` (ATLAS-DAILY-SCENES) the pill takes the lane's colour while a scene is on.
 */
export function ProgressLine({ value, label, color, lane }: { value: number; label: string; color?: string; lane?: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={'well flex h-3.5 w-full rounded-pill p-[3px]' + (lane === undefined ? '' : ' lane-' + lane)}
    >
      <div className={'progress-fill h-full rounded-pill' + (lane === undefined ? '' : ' lane-fill')} style={{ width: percent + '%', ...(color ? { background: color } : {}) }} />
    </div>
  );
}
