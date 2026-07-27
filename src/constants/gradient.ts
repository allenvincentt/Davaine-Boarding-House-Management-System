export const GradientColors = {
  baseStart: '#8A9900FF',
  baseEnd: '#E8DA17FF',
  hoverStart: '#9AA51AFF',
  hoverEnd: '#F5EC5CFF',
  pressedStart: '#6E7A00FF',
  pressedEnd: '#B8A812FF',
  softStart: '#8A99002E',
  softEnd: '#E8DA1738',
} as const;

export const GradientDirection = '106.11deg';
export const GradientStops = { start: '37%', end: '100%' } as const;

export const Gradient = {
  base: `linear-gradient(${GradientDirection}, ${GradientColors.baseStart} ${GradientStops.start}, ${GradientColors.baseEnd} ${GradientStops.end})`,
  hover: `linear-gradient(${GradientDirection}, ${GradientColors.hoverStart} ${GradientStops.start}, ${GradientColors.hoverEnd} ${GradientStops.end})`,
  pressed: `linear-gradient(${GradientDirection}, ${GradientColors.pressedStart} ${GradientStops.start}, ${GradientColors.pressedEnd} ${GradientStops.end})`,
  soft: `linear-gradient(${GradientDirection}, ${GradientColors.softStart} ${GradientStops.start}, ${GradientColors.softEnd} ${GradientStops.end})`,
} as const;

export type GradientState = keyof typeof Gradient;
