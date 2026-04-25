const PALETTES: Array<[string, string, string]> = [
  ["#6e56cf", "#3a2873", "#1a0f3d"],
  ["#0ea5e9", "#0c4a6e", "#082338"],
  ["#10b981", "#053e2e", "#021c14"],
  ["#f59e0b", "#7a4400", "#3d2200"],
  ["#ef4444", "#7a1717", "#3d0a0a"],
  ["#ec4899", "#7a1646", "#3d0a23"],
  ["#8b5cf6", "#3b1f7a", "#1a0e3d"],
  ["#14b8a6", "#0a4f48", "#062826"],
  ["#f97316", "#7c2d12", "#451a08"],
  ["#84cc16", "#3f6212", "#1a2806"],
];

function hashIdx(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % PALETTES.length;
}

export function hashGradient(seed: string, angle = 135): string {
  const [a, b, c] = PALETTES[hashIdx(seed)];
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 60%, ${c} 100%)`;
}

export function hashGradientPair(seed: string): { from: string; to: string } {
  const [a, , c] = PALETTES[hashIdx(seed)];
  return { from: a, to: c };
}
