'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import {createClient} from
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
  const bottomRef = useRef<HTMLDivElement>(null)

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
  }, [])

  // Load sessions
  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
    if (data) setSessions(data)
  }, [])

  useEffect(() => {
    if (user) loadSessions()
  }, [user])

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
  }, [activeSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    await supabase.from('chat_sessions').delete().eq('id', sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeSession === sessionId) {
      setActiveSession(null)
      setMessages([])
    }
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

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('0:')) {
            try {
              assistantText += JSON.parse(line.slice(2))
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: assistantText } : m)
              )
            } catch {}
          }
        }
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
    } finally {
      setIsBusy(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex h-screen bg-orange-50">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-72 bg-white border-r flex flex-col shadow-sm">
          {/* User info */}
          <div className="p-4 border-b flex items-center gap-3">
            {user?.avatar && (
              <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="text-xs text-red-400 hover:text-red-600">Logout</button>
          </div>

          {/* New Chat */}
          <div className="p-3">
            <button
              onClick={newChat}
              className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-orange-600"
            >
              + New Chat
            </button>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Koi chat nahi — New Chat banao!</p>
            )}
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm group ${
                  activeSession === s.id ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'
                }`}
              >
                <span className="truncate flex-1">💬 {s.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-2 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-orange-500 text-white p-4 flex items-center gap-3 shadow-md">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white text-xl">☰</button>
          <h1 className="text-xl font-bold flex-1 text-center">🍳 Chef AI</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeSession && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-4xl mb-3">🍳</p>
              <p className="font-semibold">New Chat banao ya purani chat select karo</p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl whitespace-pre-wrap text-sm shadow ${
                m.role === 'user'
                  ? 'bg-orange-500 text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-bl-none'
              }`}>
                {m.role === 'assistant' && <p className="font-bold text-orange-500 mb-1">👨‍🍳 Chef AI</p>}
                {m.content === '' && isBusy
                  ? <span className="text-gray-400 animate-pulse">Recipe soch raha hun...</span>
                  : m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 0 && activeSession && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto">
            {['Biryani recipe', 'Easy breakfast', 'Vegetarian khana', 'Aaj dinner mein kya banau?'].map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={isBusy}
                className="whitespace-nowrap bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm border border-orange-300 hover:bg-orange-200 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        {activeSession && (
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
            className="p-4 bg-white border-t flex gap-2 shadow-lg"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Recipe poochho ya ingredients batao..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              disabled={isBusy}
            />
            <button
              type="submit"
              disabled={isBusy || !input.trim()}
              className="bg-orange-500 text-white px-5 py-2 rounded-full disabled:opacity-50 hover:bg-orange-600 font-semibold text-sm"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  )
}