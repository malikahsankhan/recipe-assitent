'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supbase/client'

export default function RegisterPage() {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const register = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match!')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long!')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f6f1] p-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-xl shadow-stone-300/40 sm:p-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#1f2723] shadow-lg shadow-stone-300/60">
            <i className="fa-solid fa-circle-check text-3xl text-amber-400" aria-hidden="true" />
          </div>
          <h2 className="mb-3 flex items-center justify-center gap-2 text-2xl font-bold text-gray-900">
            <i className="fa-solid fa-envelope text-amber-500" aria-hidden="true" />
            Verify Your Email!
          </h2>
          <p className="mb-2 text-gray-600">
            We&apos;ve sent a confirmation link to:
          </p>
          <p className="mb-6 break-all font-semibold text-amber-600">
            {email}
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Click the link in the email to activate your account and start your culinary journey!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1f2723] px-6 py-3 font-semibold text-white shadow-lg shadow-stone-300/60 transition-all duration-300 hover:bg-[#2d3933]"
          >
            <i className="fa-solid fa-utensils text-amber-400" aria-hidden="true" />
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f6f1] p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-300/40 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1f2723] shadow-lg shadow-stone-300/60">
            <i className="fa-solid fa-utensils text-2xl text-amber-400" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Chef<span className="text-amber-500">AI</span>
          </h1>
          <p className="text-sm text-gray-500">
            Create your account and start cooking smarter
          </p>
        </div>

        <form onSubmit={register} className="space-y-4">
          <div className="group relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-amber-500">
              <i className="fa-solid fa-user text-sm" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3 pl-10 text-gray-900 placeholder-stone-400 transition-all duration-300 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

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
              placeholder="Password (min 6 characters)"
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

          <div className="group relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-amber-500">
              <i className="fa-solid fa-lock text-sm" aria-hidden="true" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3 pl-10 pr-12 text-gray-900 placeholder-stone-400 transition-all duration-300 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-gray-700"
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} aria-hidden="true" />
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
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
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href="/"
              className="font-semibold text-amber-600 transition-colors hover:text-amber-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
