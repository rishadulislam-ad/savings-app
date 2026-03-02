import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('findo-theme') === 'dark';
  });

  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('findo-currency') || 'USD';
  });

  useEffect(() => {
    localStorage.setItem('findo-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('findo-currency', currency);
  }, [currency]);

  function toggleTheme() {
    setIsDark(prev => !prev);
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, currency, setCurrency }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
