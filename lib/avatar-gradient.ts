const GRADIENT_PAIRS: [string, string][] = [
  ['#6B7FD7', '#9B8CE6'],
  ['#E07A5F', '#F2CC8F'],
  ['#3D5A80', '#98C1D9'],
  ['#81B29A', '#A7C957'],
  ['#BC6C25', '#DDA15E'],
  ['#9D4EDD', '#C77DFF'],
  ['#2A9D8F', '#264653'],
  ['#E76F51', '#F4A261'],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getGradientColorsForUser(userIdOrEmail: string): [string, string] {
  if (!userIdOrEmail || !userIdOrEmail.trim()) return GRADIENT_PAIRS[0];
  const index = hashString(userIdOrEmail.trim()) % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[Math.abs(index)];
}

export function getInitialsDotted(name: string | null | undefined): string {
  if (!name || !name.trim()) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase() + '.';
  const first = parts[0][0].toUpperCase();
  const last = parts[parts.length - 1][0].toUpperCase();
  return first + '.' + last + '.';
}
