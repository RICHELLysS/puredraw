import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'pink' | 'green';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  images: {
    logo: string;
    hero: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('puredraw-theme');
    return (saved === 'green' ? 'green' : 'pink') as Theme;
  });

  const images = {
    pink: {
      logo: 'https://miaoda-conversation-file.cdn.bcebos.com/user-a7npi41ahnnk/conv-a7q1uwj0b668/20260411/file-avx25kt9aq68.jpg',
      hero: 'https://miaoda-conversation-file.cdn.bcebos.com/user-a7npi41ahnnk/conv-a7q1uwj0b668/20260411/file-avx35j5j6pz4.jpg',
    },
    green: {
      logo: 'https://miaoda-conversation-file.cdn.bcebos.com/user-a7npi41ahnnk/conv-a7q1uwj0b668/20260411/file-avxydqzhk7i9.jpg',
      hero: 'https://miaoda-conversation-file.cdn.bcebos.com/user-a7npi41ahnnk/conv-a7q1uwj0b668/20260411/file-avxydqzhk7i8.jpg',
    },
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('puredraw-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'pink' ? 'green' : 'pink');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, images: images[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
