'use client'
import { useState, type FormEvent } from 'react'
import { createClient } from '../lib/supbase/client'
import Link from 'next/link'

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
      setError('Passwords do not match!'); 
      return 
    }
    if (password.length < 6) { 
      setError('Password must be at least 6 characters long!'); 
      return 
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
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
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-circle-check text-white text-3xl" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
            <i className="fa-solid fa-envelope text-orange-500" aria-hidden="true" />
            Verify Your Email!
          </h2>
          <p className="text-gray-600 mb-2">
            We&apos;ve sent a confirmation link to:
          </p>
          <p className="text-orange-500 font-semibold mb-6 break-all">
            {email}
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Click the link in the email to activate your account and start your culinary journey!
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg"
          >
            <i className="fa-solid fa-utensils" aria-hidden="true" />
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i className="fa-solid fa-utensils text-white text-2xl" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Chef<span className="text-orange-500">AI</span>
          </h1>
          <p className="text-gray-500 text-sm">
            Create your account and start cooking smarter
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={register} className="space-y-4">
          {/* Name Field */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fa-solid fa-user text-sm" aria-hidden="true" />
            </div>
            <input 
              type="text" 
              placeholder="Full Name" 
              value={name}
              onChange={(e) => setName(e.target.value)} 
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pl-10 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300"
            />
          </div>

          {/* Email Field */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fa-solid fa-envelope text-sm" aria-hidden="true" />
            </div>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pl-10 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300"
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fa-solid fa-lock text-sm" aria-hidden="true" />
            </div>
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 characters)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pl-10 pr-12 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} aria-hidden="true" />
            </button>
          </div>

          {/* Confirm Password Field */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fa-solid fa-lock text-sm" aria-hidden="true" />
            </div>
            <input 
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password" 
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)} 
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pl-10 pr-12 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} aria-hidden="true" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-500 text-xs text-center">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
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

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Already have an account?{' '}
            <Link 
              href="/" 
              className="text-orange-500 font-semibold hover:text-orange-600 transition-colors hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
