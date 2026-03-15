import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthState {
  auth: {
    user: User | null
    session: Session | null
    setSession: (session: Session | null) => void
    reset: () => void
    signOut: () => Promise<void>
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    user: null,
    session: null,
    setSession: (session) =>
      set((state) => ({
        ...state,
        auth: { ...state.auth, session, user: session?.user ?? null },
      })),
    reset: () =>
      set((state) => ({
        ...state,
        auth: { ...state.auth, session: null, user: null },
      })),
    signOut: async () => {
      await supabase.auth.signOut()
      set((state) => ({
        ...state,
        auth: { ...state.auth, session: null, user: null },
      }))
    },
  },
}))
