/**
 * Progress (the mockup's .well.bar): a sunken track with 3 px of padding (2 px on the small one) and a flat pill in
 * the lane's colour inside, under the item it describes. 14 px on Today, 12 on Plan and the sheets, 10 on the
 * Library's cards.
 */
export function ProgressLine({ value, label, color, lane = 0, size = 14 }: { value: number; label: string; color?: string; lane?: number; size?: 10 | 12 | 14 }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  const track = size === 14 ? 'h-3.5 p-[3px]' : size === 12 ? 'h-3 p-[3px]' : 'h-2.5 p-[2px]';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={'well flex w-full rounded-pill ' + track + ' lane-' + lane}
    >
      <div className="lane-fill h-full rounded-pill" style={{ width: percent + '%', ...(color ? { background: color } : {}) }} />
    </div>
  );
}
