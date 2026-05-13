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
  const [sidebarOpen, setSidebarOpen] = useState(true)
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

  // Focus input on session change
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
    { text: '🍛 Biryani recipe', prompt: 'How to make authentic chicken biryani?' },
    { text: '🍳 Easy breakfast', prompt: 'Quick and easy breakfast ideas' },
    { text: '🥗 Healthy vegetarian', prompt: 'Healthy vegetarian dinner recipes' },
    { text: '🍝 Quick dinner', prompt: 'What should I cook for dinner today?' },
    { text: '🎂 Dessert', prompt: 'Easy dessert recipes for beginners' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/20 z-30 md:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 max-w-full bg-white border-r border-orange-200 shadow-xl flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex-1 flex flex-col">
          {/* User Profile Section */}
          <div className="p-5 border-b border-orange-200 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center gap-3">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full border-2 border-white shadow-md" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <i className="fas fa-user text-white"></i>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user?.name || 'Chef'}</p>
                <p className="text-xs text-orange-100 truncate">{user?.email}</p>
              </div>
              <button 
                onClick={signOut}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                title="Sign out"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={newChat}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
            >
              <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
              New Chat
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
            <div className="px-2 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chat History</p>
            </div>
            {sessions.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-comment text-orange-400 text-xl"></i>
                </div>
                <p className="text-xs text-gray-400">No chats yet — start a new conversation!</p>
              </div>
            )}
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  activeSession === s.id 
                    ? 'bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 shadow-sm' 
                    : 'hover:bg-orange-50'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <i className={`fas fa-comment text-sm ${activeSession === s.id ? 'text-orange-500' : 'text-gray-400'}`}></i>
                  <span className={`text-sm truncate ${activeSession === s.id ? 'text-orange-700 font-medium' : 'text-gray-600'}`}>
                    {s.title}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                  disabled={deletingSession === s.id}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 hover:bg-red-50 rounded"
                >
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-orange-200">
            <div className="text-xs text-center text-gray-400">
              <i className="fas fa-utensils mr-1"></i>
              Chef AI — Your AI kitchen assistant
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-orange-200 p-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-orange-500 hover:text-orange-600 transition-colors p-2 hover:bg-orange-50 rounded-lg md:hidden"
          >
            <i className={`fas ${sidebarOpen ? 'fa-chevron-left' : 'fa-bars'}`}></i>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-orange-500">
              Chef AI
            </h1>
            {activeSession && (
              <p className="text-xs text-gray-400">
                Active conversation
              </p>
            )}
          </div>
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <i className="fas fa-utensils text-orange-500 text-sm"></i>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {!activeSession ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <i className="fas fa-utensils text-orange-500 text-4xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">Welcome to Chef AI! 🍳</h2>
              <p className="text-gray-500 mb-6 max-w-md">
                Your personal AI recipe assistant. Ask me anything about cooking, recipes, or meal planning!
              </p>
              <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(suggestion.prompt)}
                    disabled={isBusy}
                    className="px-4 py-2 bg-white border border-orange-200 rounded-full text-sm text-orange-600 hover:bg-orange-50 hover:border-orange-300 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div className={`flex gap-3 w-full max-w-full md:max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600' 
                        : 'bg-gradient-to-r from-orange-400 to-orange-500'
                    }`}>
                      <i className={`fas ${m.role === 'user' ? 'fa-user' : 'fa-robot'} text-white text-xs`}></i>
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`flex-1 p-4 rounded-2xl shadow-sm ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                    }`}>
                      {m.role === 'assistant' && (
                        <p className="font-bold text-orange-500 mb-2 text-sm flex items-center gap-2">
                          <i className="fas fa-robot"></i>
                          Chef AI Assistant
                        </p>
                      )}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {m.content === '' && isBusy && m.role === 'assistant' ? (
                          <div className="flex items-center gap-2">
                            <i className="fas fa-circle-notch fa-spin"></i>
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

        {/* Input Area */}
        {activeSession && (
          <div className="border-t border-orange-200 bg-white p-4 md:p-6 shadow-lg">
            {/* Suggestions */}
            {messages.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                <i className="fas fa-lightbulb text-orange-400 text-sm mt-1"></i>
                {suggestions.slice(0, 3).map(s => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.prompt)}
                    disabled={isBusy}
                    className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap border border-orange-200"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about recipes, ingredients, or cooking tips..."
                className="w-full flex-1 border border-orange-200 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm bg-white"
                disabled={isBusy}
              />
              <button
                type="submit"
                disabled={isBusy || !input.trim()}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-semibold text-sm w-full md:w-auto"
              >
                <span>Send</span>
                <i className="fas fa-paper-plane text-sm"></i>
              </button>
            </form>
          </div>
        )}
      </div>

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
      `}</style>
    </div>
  )
}