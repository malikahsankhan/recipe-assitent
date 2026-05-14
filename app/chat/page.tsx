'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { createClient } from '../lib/supbase/client'
import { useRouter } from 'next/navigation'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Session = {
  id: string
  title: string
  created_at: string
}

export default function ChatPage() {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState<{ id: string; email?: string; name?: string; avatar?: string } | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deletingSession, setDeletingSession] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name,
        avatar: data.user.user_metadata?.avatar_url,
      })
    })
  }, [router, supabase])

  // Load sessions
  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
    if (data) setSessions(data)
  }, [supabase])

  useEffect(() => {
    if (user) loadSessions()
  }, [user, loadSessions])

  // Load messages for active session
  useEffect(() => {
    if (!activeSession) return
    supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', activeSession)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data.map(m => ({ id: m.id, role: m.role, content: m.content })))
      })
  }, [activeSession, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeSession) {
      inputRef.current?.focus()
    }
  }, [activeSession])

  const newChat = async () => {
    if (!user) return
    const { data } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title: 'New Chat' })
      .select()
      .single()
    if (data) {
      setSessions(prev => [data, ...prev])
      setActiveSession(data.id)
      setMessages([])
      setSidebarOpen(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    setDeletingSession(sessionId)
    await supabase.from('chat_sessions').delete().eq('id', sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeSession === sessionId) {
      setActiveSession(null)
      setMessages([])
    }
    setDeletingSession(null)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isBusy || !user) return

    let sessionId = activeSession

    // Auto create session if none
    if (!sessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, title: text.slice(0, 40) })
        .select()
        .single()
      if (!data) return
      sessionId = data.id
      setActiveSession(data.id)
      setSessions(prev => [data, ...prev])
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsBusy(true)

    // Save user message to DB
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: text,
    })

    const assistantId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader available for response stream')

      const decoder = new TextDecoder()
      let assistantText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantText += chunk
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: assistantText } : m)
        )
      }

      // Save assistant message to DB
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: assistantText,
      })

      // Update session title if first message
      if (messages.length === 0) {
        await supabase
          .from('chat_sessions')
          .update({ title: text.slice(0, 40), updated_at: new Date().toISOString() })
          .eq('id', sessionId)
        loadSessions()
      }

    } catch (err) {
      console.error(err)
      setMessages(prev =>
        prev.map(m => m.id === assistantId 
          ? { ...m, content: "Sorry, I'm having trouble connecting. Please try again in a moment." } 
          : m)
      )
    } finally {
      setIsBusy(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Suggested prompts
  const suggestions = [
    { text: '🍛 Biryani Recipe', prompt: 'How to make authentic chicken biryani? Give me step by step instructions.' },
    { text: '🍳 Quick Breakfast', prompt: 'Quick and easy breakfast ideas under 15 minutes' },
    { text: '🥗 Healthy Dinner', prompt: 'Healthy vegetarian dinner recipes for weight loss' },
    { text: '🍝 Easy Pasta', prompt: 'What should I cook for dinner today? Give me pasta recipes.' },
    { text: '🎂 Dessert', prompt: 'Easy dessert recipes for beginners with simple ingredients' }
  ]

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative lg:flex lg:w-80 w-80 h-full bg-white border-r border-gray-200 
        flex flex-col transition-transform duration-300 ease-in-out z-30 shadow-xl
        ${sidebarOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none lg:translate-x-0 lg:pointer-events-auto'}
      `}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-utensils text-white text-lg" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h1 className="text-white font-bold text-lg">ChefAI</h1>
              <p className="text-gray-400 text-xs">Your AI Kitchen Assistant</p>
            </div>
            <button 
              type="button"
              onClick={signOut}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              title="Sign out"
            >
              <i className="fa-solid fa-right-from-bracket text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full ring-2 ring-amber-400" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center ring-2 ring-amber-300">
                  <i className="fa-solid fa-user text-white text-sm" aria-hidden="true" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{user?.name || 'Chef'}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={newChat}
            className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
          >
            <span className="text-sm">➕</span>
            New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="px-2 mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-history text-xs" aria-hidden="true" />
              Chat History
            </p>
          </div>
          {sessions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-comments text-gray-400 text-2xl" aria-hidden="true" />
              </div>
              <p className="text-sm text-gray-400">No conversations yet</p>
              <p className="text-xs text-gray-300 mt-1">Start a new chat above</p>
            </div>
          )}
          <div className="space-y-1">
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => {
                  setActiveSession(s.id)
                  setSidebarOpen(false)
                }}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  activeSession === s.id 
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 shadow-sm' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <i className={`fa-solid fa-comments text-sm ${activeSession === s.id ? 'text-amber-500' : 'text-gray-400'}`} aria-hidden="true" />
                  <span className={`text-sm truncate ${activeSession === s.id ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {s.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                  disabled={deletingSession === s.id}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 hover:bg-red-50 rounded"
                >
                  <i className="fa-solid fa-trash text-xs" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="text-xs text-center text-gray-400 flex items-center justify-center gap-2">
            <i className="fa-solid fa-robot text-amber-500" aria-hidden="true" />
            <span>Powered by AI</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-br from-gray-50 to-white">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
          <button 
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <i className={`fa-solid text-lg ${sidebarOpen ? 'fa-xmark' : 'fa-bars'}`} aria-hidden="true" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-robot text-amber-500" aria-hidden="true" />
              <h2 className="font-semibold text-gray-800">
                {activeSession ? 'Cooking Assistant' : 'Welcome to ChefAI'}
              </h2>
            </div>
            {activeSession && messages.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {messages.length} messages • Active conversation
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-utensils text-white text-sm" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            {!activeSession ? (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
                <div className="relative">
                  <div className="absolute -bottom-2 -right-2 w-20 mb-5 h-20 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                    <i className="fa-solid fa-robot text-white text-lg" aria-hidden="true" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                  What would you like to cook today? 🍳
                </h2>
                <p className="text-gray-500 mb-8 max-w-md">
                  Ask me anything about recipes, cooking techniques, meal planning, or ingredient substitutions.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => sendMessage(suggestion.prompt)}
                      disabled={isBusy}
                      className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 hover:border-amber-300 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 group"
                    >
                      <i className="fa-solid fa-lightbulb text-amber-400 text-xs group-hover:scale-110 transition-transform" aria-hidden="true" />
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`flex gap-3 max-w-full lg:max-w-[75%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                        m.role === 'user' 
                          ? 'bg-gradient-to-br from-gray-800 to-gray-700' 
                          : 'bg-gradient-to-br from-amber-400 to-orange-400'
                      }`}>
                        <i className={`text-white text-sm ${m.role === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot'}`} aria-hidden="true" />
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={`flex-1 px-5 py-3 ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-gray-800 to-gray-700 text-white rounded-2xl rounded-tr-sm'
                          : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100'
                      }`}>
                        {m.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                              <i className="fa-solid fa-robot text-amber-500 text-xs" aria-hidden="true" />
                            <span className="font-semibold text-xs text-gray-700">ChefAI</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {m.content === '' && isBusy && m.role === 'assistant' ? (
                            <div className="flex items-center gap-2">
                              <i className="fa-solid fa-circle-notch fa-spin text-amber-500" aria-hidden="true" />
                              <span className="text-gray-400">Cooking up your recipe...</span>
                            </div>
                          ) : (
                            m.content
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white/95 backdrop-blur-sm shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {activeSession && messages.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <i className="fa-solid fa-lightbulb text-amber-400 text-sm mt-1.5" aria-hidden="true" />
                {suggestions.slice(0, 3).map(s => (
                  <button
                    type="button"
                    key={s.text}
                    onClick={() => sendMessage(s.prompt)}
                    disabled={isBusy}
                    className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-full transition-all whitespace-nowrap border border-gray-200 hover:border-amber-300"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me about recipes, ingredients, or cooking tips..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm bg-white"
                  disabled={isBusy}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs">
                  <i className="fa-solid fa-utensils" aria-hidden="true" />
                </div>
              </div>
              <button
                type="submit"
                disabled={isBusy || !input.trim()}
                className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-5 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-semibold text-sm min-w-[90px]"
              >
                {isBusy ? (
                  <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
                ) : (
                  <>
                    <span>Send</span>
                    <i className="fa-solid fa-paper-plane text-xs" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .scrollbar-thin::-webkit-scrollbar {
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}