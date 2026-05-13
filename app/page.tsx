'use client';
import { useRef, useEffect, useState } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function RecipeAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👨‍🍳 Assalam o Alaikum! Main aapka Chef AI hun. Batao kya banana chahte ho? Ya koi bhi recipe pooch sakte ho!',
    },
  ]);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isBusy) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const jsonStr = line.slice(2);
              const parsed = JSON.parse(jsonStr);
              assistantText += parsed;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantText } : m
                )
              );
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-orange-500 text-white p-4 text-center shadow-md">
        <h1 className="text-2xl font-bold">🍳 Chef AI - Recipe Assistant</h1>
        <p className="text-sm opacity-80">Powered by Groq (Free)</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] p-3 rounded-2xl whitespace-pre-wrap text-sm shadow ${
                m.role === 'user'
                  ? 'bg-orange-500 text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-bl-none'
              }`}
            >
              {m.role === 'assistant' && (
                <p className="font-bold text-orange-500 mb-1">👨‍🍳 Chef AI</p>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {isBusy && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow">
              <p className="font-bold text-orange-500 mb-1">👨‍🍳 Chef AI</p>
              <p className="text-gray-500 animate-pulse">Recipe soch raha hun...</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto">
        {['Biryani recipe', 'Aaj dinner mein kya banau?', 'Easy breakfast', 'Vegetarian khana'].map(
          (suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => sendMessage(suggestion)}
              disabled={isBusy}
              className="whitespace-nowrap bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm hover:bg-orange-200 border border-orange-300 disabled:opacity-50"
            >
              {suggestion}
            </button>
          )
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t flex gap-2 shadow-lg">
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
    </div>
  );
}