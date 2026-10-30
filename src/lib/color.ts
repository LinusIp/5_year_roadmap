/**
 * Colour maths shared by the scene build (scripts/scenes.ts), validate:data and the app (src/lib/scenes.ts):
 * hex ↔ sRGB ↔ CIE Lab (D65) ↔ LCh, WCAG contrast, and `fit`, which moves a colour's lightness until it reads
 * against a ground. Pure, no DOM.
 */

export type Lab = [L: number, a: number, b: number];
export type Lch = [L: number, C: number, H: number];

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0').toUpperCase()).join('');
}

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function fromLinear(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** WCAG relative luminance (the 0.03928 threshold of the recommendation, as the Python original used). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: [number, number, number] = [0.95047, 1.0, 1.08883];

export function rgbToLab([r, g, b]: [number, number, number]): Lab {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / WHITE[0];
  const y = (0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb) / WHITE[1];
  const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / WHITE[2];
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labToRgb([L, a, b]: Lab): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const inv = (t: number): number => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = inv(fx) * WHITE[0];
  const y = inv(fy) * WHITE[1];
  const z = inv(fz) * WHITE[2];
  const lr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const lg = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const lb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return [fromLinear(lr), fromLinear(lg), fromLinear(lb)];
}

export function hexToLab(hex: string): Lab {
  return rgbToLab(hexToRgb(hex));
}

export function labToHex(lab: Lab): string {
  return rgbToHex(labToRgb(lab));
}

export function labToLch([L, a, b]: Lab): Lch {
  const C = Math.hypot(a, b);
  const H = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return [L, C, H];
}

export function lchToLab([L, C, H]: Lch): Lab {
  const rad = (H * Math.PI) / 180;
  return [L, C * Math.cos(rad), C * Math.sin(rad)];
}

export function lchToHex(lch: Lch): string {
  return labToHex(lchToLab(lch));
}

export function hexToLch(hex: string): Lch {
  return labToLch(hexToLab(hex));
}

/** Degrees between two hues, 0 to 180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Moves lightness one step at a time (darker by default, lighter with `lighter`), chroma fading a little with
 * each step, until the colour reads against `against` at `need` or better; at most 80 steps. The hue never moves.
 */
export function fit(L: number, C: number, H: number, against: string, need: number, lighter = false): { hex: string; L: number } {
  let l = L;
  let c = C;
  for (let i = 0; i < 80; i++) {
    const hex = lchToHex([l, c, H]);
    if (contrast(hex, against) >= need) return { hex, L: l };
    l += lighter ? 1 : -1;
    c *= 0.99;
  }
  return { hex: lchToHex([l, c, H]), L: l };
}

/** `fit` from a hex colour: keeps its hue and chroma, moves its lightness. */
export function fitHex(hex: string, against: string, need: number, lighter = false): string {
  const [L, C, H] = hexToLch(hex);
  return fit(L, C, H, against, need, lighter).hex;
}

/** A blend of two colours in sRGB, `t` of the second (0 keeps the first). */
export function mix(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex([ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t]);
}

/** `#RRGGBB` with an alpha, as CSS `rgb(r g b / a)`. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c * 255));
  return 'rgb(' + r + ' ' + g + ' ' + b + ' / ' + alpha + ')';
}
