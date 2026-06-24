/**
 * Theme context (PRD 6.1, architecture §3/§8). v1 ships a single light theme, so the
 * provider injects the static PRD tokens and `useTheme()` returns them. The context has
 * a sensible default (the tokens) so a component works even if a test renders it without
 * an explicit provider. Components read design values through this hook — not the
 * scaffold's constants/theme — to keep a single source of truth and avoid theme drift.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { tokens, type Tokens } from '@/theme/tokens';

const ThemeContext = createContext<Tokens>(tokens);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Tokens {
  return useContext(ThemeContext);
}
