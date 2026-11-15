'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  role: 'customer' | 'provider' | 'admin'
  isStudentVerified: boolean
  university?: string
  studentId?: string
  rating?: number
  totalTransactions?: number
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean

  login: (user: AuthUser, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<AuthUser>) => void
  setStudentVerified: (verified: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true })
        // Sync with legacy lib/auth.ts keys so existing API client still works
        if (typeof window !== 'undefined') {
          localStorage.setItem('beehub_token', token)
          localStorage.setItem('beehub_user', JSON.stringify(user))
          document.cookie = `beehub_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('beehub_token')
          localStorage.removeItem('beehub_user')
          document.cookie = 'beehub_token=; path=/; max-age=0'
        }
      },

      updateUser: (updates) =>
        set((s) => ({
          user: s.user ? { ...s.user, ...updates } : null,
        })),

      setStudentVerified: (verified) =>
        set((s) => ({
          user: s.user ? { ...s.user, isStudentVerified: verified } : null,
        })),
    }),
    {
      name: 'beehub-auth',
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
