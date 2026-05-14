'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '../lib/supbase/client'

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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const tempIdRef = useRef(0)
  const assistantTextRef = useRef('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/')
        return
      }

      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name,
        avatar: data.user.user_metadata?.avatar_url,
      })

      supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .then(({ data: sessionsData }) => {
          if (sessionsData) setSessions(sessionsData)
        })
    })
  }, [router, supabase])

  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })

    if (data) setSessions(data)
  }, [supabase])

  useEffect(() => {
    if (!activeSession) return
    if (isBusy) return

    supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', activeSession)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data.map(m => ({ id: m.id, role: m.role, content: m.content })))
      })
  }, [activeSession, isBusy, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeSession) inputRef.current?.focus()
  }, [activeSession])

  const createTempId = () => {
    tempIdRef.current += 1
    return `temp-${tempIdRef.current}`
  }

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

    const userMsg: Message = { id: createTempId(), role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsBusy(true)

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: text,
    })

    const assistantId = createTempId()
    assistantTextRef.current = ''
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error(`HTTP error ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader available for response stream')

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const assistantText = assistantTextRef.current + decoder.decode(value, { stream: true })
        assistantTextRef.current = assistantText
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: assistantText } : m)
        )
      }

      const remainingText = decoder.decode()
      if (remainingText) {
        const assistantText = assistantTextRef.current + remainingText
        assistantTextRef.current = assistantText
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: assistantText } : m)
        )
      }

      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: assistantTextRef.current,
      })

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
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "Sorry, I'm having trouble connecting. Please try again in a moment." }
            : m
        )
      )
    } finally {
      setIsBusy(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const suggestions = [
    { icon: 'fa-bowl-rice', text: 'Biryani Recipe', prompt: 'How to make authentic chicken biryani? Give me step by step instructions.' },
    { icon: 'fa-mug-saucer', text: 'Quick Breakfast', prompt: 'Quick and easy breakfast ideas under 15 minutes' },
    { icon: 'fa-leaf', text: 'Healthy Dinner', prompt: 'Healthy vegetarian dinner recipes for weight loss' },
    { icon: 'fa-plate-wheat', text: 'Easy Pasta', prompt: 'What should I cook for dinner today? Give me pasta recipes.' },
    { icon: 'fa-cookie-bite', text: 'Dessert', prompt: 'Easy dessert recipes for beginners with simple ingredients' },
  ]

  return (
    <div className="flex h-dvh min-h-[560px] overflow-hidden bg-[#f8f6f1] text-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-gray-950/45 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 flex h-full w-[min(88vw,20rem)] flex-col border-r border-stone-200
        bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:relative lg:w-80 lg:shadow-none
        ${sidebarOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none lg:translate-x-0 lg:pointer-events-auto'}
      `}>
        <div className="border-b border-stone-200 bg-[#1f2723] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow-lg">
              <i className="fa-solid fa-utensils text-lg text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-white">ChefAI</h1>
              <p className="truncate text-xs text-stone-300">Your AI Kitchen Assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-stone-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              title="Close menu"
            >
              <i className="fa-solid fa-xmark text-lg" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg p-2 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <i className="fa-solid fa-right-from-bracket text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="border-b border-stone-100 bg-stone-50 p-4">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt="avatar"
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-400"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 ring-2 ring-amber-200">
                <i className="fa-solid fa-user text-sm text-white" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">{user?.name || 'Chef'}</p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f2723] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#2d3933] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
            New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="mb-3 px-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
              <i className="fa-solid fa-history text-xs" aria-hidden="true" />
              Chat History
            </p>
          </div>

          {sessions.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                <i className="fa-solid fa-comments text-2xl text-stone-400" aria-hidden="true" />
              </div>
              <p className="text-sm text-stone-500">No conversations yet</p>
              <p className="mt-1 text-xs text-stone-400">Start a new chat above</p>
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
                className={`group flex cursor-pointer items-center justify-between rounded-xl p-3 transition-all duration-200 ${
                  activeSession === s.id
                    ? 'border-l-4 border-amber-500 bg-amber-50 shadow-sm'
                    : 'hover:bg-stone-50'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <i className={`fa-solid fa-comments text-sm ${activeSession === s.id ? 'text-amber-500' : 'text-gray-400'}`} aria-hidden="true" />
                  <span className={`truncate text-sm ${activeSession === s.id ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                    {s.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(s.id)
                  }}
                  disabled={deletingSession === s.id}
                  className="rounded p-2 text-red-400 opacity-100 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Delete conversation"
                >
                  <i className="fa-solid fa-trash text-xs" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-stone-100 bg-stone-50 p-4">
          <div className="flex items-center justify-center gap-2 text-center text-xs text-stone-400">
            <i className="fa-solid fa-robot text-amber-500" aria-hidden="true" />
            <span>Powered by AI</span>
          </div>
        </div>
      </aside>

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#f8f6f1]">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-5">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-stone-100 hover:text-gray-900 lg:hidden"
            title="Open menu"
          >
            <i className={`fa-solid text-lg ${sidebarOpen ? 'fa-xmark' : 'fa-bars'}`} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-robot shrink-0 text-amber-500" aria-hidden="true" />
              <h2 className="truncate font-semibold text-gray-800">
                {activeSession ? 'Cooking Assistant' : 'Welcome to ChefAI'}
              </h2>
            </div>
            {activeSession && messages.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {messages.length} messages - Active conversation
              </p>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 shadow-sm">
            <i className="fa-solid fa-utensils text-sm text-white" aria-hidden="true" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
            {!activeSession ? (
              <div className="mx-auto flex min-h-[calc(100dvh-190px)] max-w-3xl flex-col items-center justify-center py-8 text-center sm:py-12">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1f2723] shadow-xl shadow-stone-300/50 sm:h-24 sm:w-24">
                  <i className="fa-solid fa-utensils text-3xl text-amber-400" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-balance text-2xl font-bold text-gray-900 sm:text-4xl">
                  What would you like to cook today?
                </h2>
                <p className="mb-7 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
                  Ask me anything about recipes, cooking techniques, meal planning, or ingredient substitutions.
                </p>
                <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => sendMessage(suggestion.prompt)}
                      disabled={isBusy}
                      className="group flex min-h-14 items-center justify-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-50/50 disabled:opacity-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 transition-transform group-hover:scale-105">
                        <i className={`fa-solid ${suggestion.icon} text-sm`} aria-hidden="true" />
                      </span>
                      <span className="truncate">{suggestion.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`flex max-w-[94%] gap-2 sm:max-w-[86%] sm:gap-3 lg:max-w-[74%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl shadow-sm sm:flex ${
                        m.role === 'user' ? 'bg-[#1f2723]' : 'bg-amber-500'
                      }`}>
                        <i className={`text-sm text-white ${m.role === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot'}`} aria-hidden="true" />
                      </div>

                      <div className={`min-w-0 flex-1 px-4 py-3 sm:px-5 ${
                        m.role === 'user'
                          ? 'rounded-2xl rounded-tr-sm bg-[#1f2723] text-white'
                          : 'rounded-2xl rounded-tl-sm border border-stone-200 bg-white text-gray-800 shadow-sm'
                      }`}>
                        {m.role === 'assistant' && (
                          <div className="mb-2 flex items-center gap-2 border-b border-stone-100 pb-2">
                            <i className="fa-solid fa-robot text-xs text-amber-500" aria-hidden="true" />
                            <span className="text-xs font-semibold text-gray-700">ChefAI</span>
                          </div>
                        )}
                        <div className="overflow-wrap-anywhere whitespace-pre-wrap break-words text-sm leading-relaxed">
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

        <div className="border-t border-stone-200 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-5 sm:py-4">
            {activeSession && messages.length > 0 && (
              <div className="scrollbar-thin mb-3 flex gap-2 overflow-x-auto pb-2">
                <i className="fa-solid fa-lightbulb mt-2 text-sm text-amber-400" aria-hidden="true" />
                {suggestions.slice(0, 3).map(s => (
                  <button
                    type="button"
                    key={s.text}
                    onClick={() => sendMessage(s.prompt)}
                    disabled={isBusy}
                    className="whitespace-nowrap rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-gray-600 transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-gray-800 disabled:opacity-50"
                  >
                    <i className={`fa-solid ${s.icon} mr-1.5 text-amber-500`} aria-hidden="true" />
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex items-end gap-2 sm:gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(input)
                    }
                  }}
                  placeholder="Ask me about recipes, ingredients, or cooking tips..."
                  rows={1}
                  className="max-h-32 min-h-12 w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 pr-11 text-sm leading-6 text-gray-900 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50"
                  disabled={isBusy}
                />
                <div className="pointer-events-none absolute right-3 top-3.5 text-xs text-stone-300">
                  <i className="fa-solid fa-utensils" aria-hidden="true" />
                </div>
              </div>
              <button
                type="submit"
                disabled={isBusy || !input.trim()}
                className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-xl bg-[#1f2723] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#2d3933] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[96px] sm:px-5"
                title="Send message"
              >
                {isBusy ? (
                  <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
                ) : (
                  <>
                    <span className="hidden sm:inline">Send</span>
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
          background: #f5f5f4;
          border-radius: 10px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d6d3d1;
          border-radius: 10px;
        }

        .overflow-wrap-anywhere {
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  )
}
