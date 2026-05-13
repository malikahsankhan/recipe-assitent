'use client';
import { useState, type FormEvent } from 'react'
import { createClient } from './lib/supbase/client';
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:scale-105 transition-transform duration-300">
            <i className="fas fa-utensils text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Chef<span className="text-orange-500">AI</span>
          </h1>
          <p className="text-gray-500 text-sm">
            Your personal AI recipe assistant
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={signInWithEmail} className="space-y-4">
          {/* Email Field */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-envelope text-sm"></i>
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
              <i className="fas fa-lock text-sm"></i>
            </div>
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Password" 
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
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <a href="#" className="text-xs text-orange-500 hover:text-orange-600 transition-colors hover:underline">
              Forgot password?
            </a>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 animate-shake">
              <p className="text-red-500 text-xs text-center">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-circle-notch fa-spin"></i>
                Signing in...
              </span>
            ) : (
              <>
                <span>Sign In</span>
                <i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform"></i>
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Don't have an account?{' '}
            <Link 
              href="/register" 
              className="text-orange-500 font-semibold hover:text-orange-600 transition-colors hover:underline inline-flex items-center gap-1 group"
            >
              Create account
              <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
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