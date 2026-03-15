import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { ensureProfileForSession } from '@/lib/supabase/ensure-profile'
import { fetchCurrentOrgContext } from '@/lib/supabase/orgs'
import { handleServerError } from '@/lib/handle-server-error'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { OrgThemeProvider } from './context/org-theme-provider'
import { ThemeProvider } from './context/theme-provider'
import { routeTree } from './routeTree.gen'
import './styles/index.css'

const platformRoutePrefixes = [
  '/dashboard',
  '/admin',
  '/news',
  '/bookmarks',
  '/watchlist',
  '/history',
  '/firm-library',
  '/dcf',
  '/merger-analysis',
  '/lbo-model',
  '/tasks',
  '/users',
  '/chats',
  '/settings',
  '/help-center',
  '/apps',
]

function shouldForceIntro(pathname: string) {
  return platformRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

if (typeof window !== 'undefined' && shouldForceIntro(window.location.pathname)) {
  const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
  window.history.replaceState({}, '', `/?redirect=${encodeURIComponent(redirect)}`)
}

supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().auth.setSession(session)
  void ensureProfileForSession(session)
  void fetchCurrentOrgContext(session?.user?.id ?? null)
})

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().auth.setSession(session)
  void ensureProfileForSession(session)
  void fetchCurrentOrgContext(session?.user?.id ?? null)
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000,
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error('Content not modified!')
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          toast.error('Session expired!')
          useAuthStore.getState().auth.reset()
          const redirect = `${router.history.location.href}`
          router.navigate({ to: '/', search: { redirect } })
        }
        if (error.response?.status === 500) {
          toast.error('Internal Server Error!')
          if (import.meta.env.PROD) {
            router.navigate({ to: '/500' })
          }
        }
        if (error.response?.status === 403) {
          // no-op
        }
      }
    },
  }),
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FontProvider>
            <OrgThemeProvider>
              <DirectionProvider>
                <RouterProvider router={router} />
              </DirectionProvider>
            </OrgThemeProvider>
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
