export interface OrgTheme {
  primaryColor: string
  accentColor: string
  logoUrl: string | null
  firmName: string
}

export const DEFAULT_THEME: OrgTheme = {
  primaryColor: '#f97316',
  accentColor: '#06b6d4',
  logoUrl: null,
  firmName: 'QuantEdge',
}

export function generateThemeCSS(theme: OrgTheme): string {
  return `
    --accent-primary: ${theme.primaryColor};
    --accent-cyan: ${theme.accentColor};
    --accent-primary-10: ${theme.primaryColor}1a;
    --accent-primary-20: ${theme.primaryColor}33;
  `
}

export function buildOrgTheme(theme?: Partial<OrgTheme> | null): OrgTheme {
  return {
    primaryColor: theme?.primaryColor ?? DEFAULT_THEME.primaryColor,
    accentColor: theme?.accentColor ?? DEFAULT_THEME.accentColor,
    logoUrl: theme?.logoUrl ?? DEFAULT_THEME.logoUrl,
    firmName: theme?.firmName ?? DEFAULT_THEME.firmName,
  }
}
