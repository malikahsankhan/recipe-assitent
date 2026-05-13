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

  const register = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Dono passwords match nahi karte!'); return }
    if (password.length < 6) { setError('Password kam az kam 6 characters ka hona chahiye!'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })
    if (error) { setError(error.message) } else { setSuccess(true) }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Email Confirm Karo!</h2>
          <p className="text-gray-500 text-sm mb-4">
            <span className="font-semibold text-orange-500">{email}</span> par confirmation email bheja gaya hai.
          </p>
          <Link href="/" className="text-orange-500 font-semibold hover:underline text-sm">Login page par jao</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-orange-500">🍳 Chef AI</h1>
          <p className="text-gray-400 text-sm mt-1">Naya account banao</p>
        </div>
        <form onSubmit={register} className="space-y-3">
          <input type="text" placeholder="Apna naam" value={name}
            onChange={(e) => setName(e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="password" placeholder="Password (min 6 characters)" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="password" placeholder="Password dobara likho" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition">
            {loading ? 'Account ban raha hai...' : 'Register karo'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          Pehle se account hai?{' '}
          <Link href="/" className="text-orange-500 font-semibold hover:underline">Login karo</Link>
        </p>
      </div>
    </div>
  )
}