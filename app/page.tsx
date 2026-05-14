'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from './lib/supbase/client'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const signInWithEmail = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password. Please try again!')
    } else {
      router.push('/chat')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f6f1] p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-300/40 transition-all duration-300 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1f2723] shadow-lg shadow-stone-300/60 transition-transform duration-300 hover:scale-105">
            <i className="fa-solid fa-utensils text-3xl text-amber-400" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Chef<span className="text-amber-500">AI</span>
          </h1>
          <p className="text-sm text-gray-500">
            Your personal AI recipe assistant
          </p>
        </div>

        <form onSubmit={signInWithEmail} className="space-y-4">
          <div className="group relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-amber-500">
              <i className="fa-solid fa-envelope text-sm" aria-hidden="true" />
            </div>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3 pl-10 text-gray-900 placeholder-stone-400 transition-all duration-300 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="group relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-amber-500">
              <i className="fa-solid fa-lock text-sm" aria-hidden="true" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3 pl-10 pr-12 text-gray-900 placeholder-stone-400 transition-all duration-300 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-gray-700"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} aria-hidden="true" />
            </button>
          </div>

          <div className="text-right">
            <a href="#" className="text-xs font-medium text-amber-600 transition-colors hover:text-amber-700 hover:underline">
              Forgot password?
            </a>
          </div>

          {error && (
            <div className="animate-shake rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="flex items-center justify-center gap-2 text-center text-xs text-red-500">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f2723] py-3 font-semibold text-white shadow-lg shadow-stone-300/60 transition-all duration-300 hover:bg-[#2d3933] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
                Signing in...
              </span>
            ) : (
              <>
                <span>Sign In</span>
                <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-semibold text-amber-600 transition-colors hover:text-amber-700 hover:underline"
            >
              Create account
              <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
