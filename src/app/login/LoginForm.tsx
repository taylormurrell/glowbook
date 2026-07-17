'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'reset'

export default function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<Mode>('signin')
  const [error, setError] = useState<string | null>(initialError)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    const supabase = createClient()

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      })
      setLoading(false)
      // Always show the same confirmation, whether or not the email exists,
      // so this can't be used to probe which addresses have accounts.
      if (error) {
        setError(error.message)
        return
      }
      setNotice('If an account exists for that email, a password reset link is on its way.')
      return
    }

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const heading =
    mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'
  const submitLabel =
    mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Glowbook</h1>
          <p className="mt-2 text-sm text-gray-500">Your personal fashion wishlist</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-base font-medium text-gray-900 mb-6">{heading}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-700">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            {notice && (
              <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">{notice}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Please wait…' : submitLabel}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-500">
            {mode === 'reset' ? (
              <>
                Remembered it?{' '}
                <button
                  onClick={() => switchMode('signin')}
                  className="text-gray-900 font-medium underline underline-offset-2"
                >
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-gray-900 font-medium underline underline-offset-2"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
