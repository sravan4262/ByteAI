export const C = {
  // Backgrounds
  background:   '#05050e',
  card:         '#08081a',
  element:      '#0d0d22',
  codeBg:       '#030310',

  // Borders
  border:       '#1a1a2e',
  borderMed:    '#252540',
  borderHigh:   '#3a3a5c',

  // Text
  text1:        '#f1f5f9',   // primary
  text2:        '#94a3b8',   // secondary
  text3:        '#64748b',   // tertiary

  // Accent (blue)
  accent:       '#3b82f6',
  accentDim:    'rgba(59,130,246,0.12)',
  accentGlow:   'rgba(59,130,246,0.25)',

  // Semantic
  cyan:         '#06b6d4',
  cyanDim:      'rgba(6,182,212,0.12)',
  green:        '#22c55e',
  greenDim:     'rgba(34,197,94,0.12)',
  purple:       '#a855f7',
  purpleDim:    'rgba(168,85,247,0.12)',
  orange:       '#f97316',
  orangeDim:    'rgba(249,115,22,0.12)',
  red:          '#ef4444',
  redDim:       'rgba(239,68,68,0.12)',

  // Avatar gradient bases
  avatarCyan:   ['#0e7490', '#06b6d4'],
  avatarPurple: ['#7e22ce', '#a855f7'],
  avatarGreen:  ['#15803d', '#22c55e'],
  avatarOrange: ['#c2410c', '#f97316'],
} as const;

export const MONO_FONT = 'Menlo';
export const SANS_FONT = undefined; // System default (SF Pro on iOS)
