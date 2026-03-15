import { createContext, useContext, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_THEME, buildOrgTheme, generateThemeCSS, type OrgTheme } from '@/lib/org-theme'
import { useOrgStore } from '@/stores/org-store'

type OrgThemeContextValue = {
  theme: OrgTheme
}

const OrgThemeContext = createContext<OrgThemeContextValue>({ theme: DEFAULT_THEME })

export function OrgThemeProvider({ children }: { children: ReactNode }) {
  const currentOrg = useOrgStore((state) => state.currentOrg)

  const theme = useMemo(
    () =>
      buildOrgTheme({
        primaryColor: currentOrg?.primary_color,
        accentColor: currentOrg?.accent_color,
        logoUrl: currentOrg?.logo_url,
        firmName: currentOrg?.sidebar_label ?? currentOrg?.name ?? DEFAULT_THEME.firmName,
      }),
    [currentOrg]
  )

  useEffect(() => {
    const root = document.documentElement
    const css = generateThemeCSS(theme)
    css
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const [property, value] = line.replace(';', '').split(':').map((entry) => entry.trim())
        if (property && value) {
          root.style.setProperty(property, value)
        }
      })
  }, [theme])

  return <OrgThemeContext.Provider value={{ theme }}>{children}</OrgThemeContext.Provider>
}

export function useOrgTheme() {
  return useContext(OrgThemeContext)
}
