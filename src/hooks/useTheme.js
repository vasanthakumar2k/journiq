import { useSelector, useDispatch } from 'react-redux';
import { createTheme } from '../theme/theme';
import { toggleTheme } from '../store/themeSlice';

export const useTheme = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  
  const theme = createTheme(isDarkMode);
  
  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  return {
    theme,
    isDarkMode,
    toggleTheme: handleToggleTheme,
  };
};
