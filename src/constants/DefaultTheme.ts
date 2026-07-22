export const DefaultTheme = {
  colors: {
    primary: '#8A9900',
    buttonHover: '#9AA51A',
    background: '#F9F7F0',
    hover: '#FAFFCC',
    ink: '#20201F',
    muted: '#676862',
    line: '#E7E5DD',
    cool: '#F3F5F7',
    white: '#FFFFFF',
    softOlive: '#EEF1DE',
    softGold: '#FFF0D0',
    blue: '#4EA4E5',
    softBlue: '#E6F2FB',
  },
  fonts: {
    heading: 'InstrumentSerif_400Regular',
    headingItalic: 'InstrumentSerif_400Regular_Italic',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodySemiBold: 'DMSans_600SemiBold',
    bodyBold: 'DMSans_700Bold',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    section: 88,
  },
  radius: {
    sm: 10,
    md: 18,
    lg: 28,
    pill: 999,
  },
  layout: {
    contentWidth: 1220,
    compactNavigation: 800,
    tablet: 660,
    desktop: 900,
    wide: 1050,
  },
} as const;

export const ThemeColors = DefaultTheme.colors;
export const FontFamily = DefaultTheme.fonts;
