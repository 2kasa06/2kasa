/** サウナ小屋の檜と水風呂から取った配色。画面はライト固定。 */
export const colors = {
  background: '#F6F3EE',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEAE2',
  text: '#1C2B33',
  textMuted: '#6B7A82',
  border: '#E2DACE',
  primary: '#1E6F8E',
  primarySoft: '#E4F0F5',
  accent: '#D4622F',
  accentSoft: '#FBEAE0',
  success: '#2F7A55',
  danger: '#B3381F',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;
