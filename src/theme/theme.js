import { COLORS, LIGHT_COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const createTheme = (isDarkMode) => ({
  colors: isDarkMode ? COLORS : LIGHT_COLORS,
  fonts: FONTS,
  spacing: {
    unit: 8,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 12,
    lg: 20,
    xl: 30,
    round: 50,
  },
  shadows: {
    none: { elevation: 0, shadowOpacity: 0 },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.4,
      shadowRadius: 30,
      elevation: 15,
    },
  },
});

export const theme = createTheme(true); // Legacy export for static use
export { createTheme };

