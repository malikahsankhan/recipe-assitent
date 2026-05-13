'use client';
import { useRef, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot,
  faUser,
  faPaperPlane,
  faUtensils,
  faClock,
  faLeaf,
  faStar,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

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

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantText } : m
          )
        );
      }
    } catch (err) {
      console.error('Error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Kuch masla hua. Dobara try karo.' }
            : m
        )
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 via-white to-orange-25">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <FontAwesomeIcon icon={faRobot} className="text-3xl" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-wide">Chef AI</h1>
            <p className="text-sm opacity-90 flex items-center justify-center space-x-1">
              <FontAwesomeIcon icon={faUtensils} className="text-xs" />
              <span>Recipe Assistant</span>
              <span className="text-xs">•</span>
              <span>Powered by Groq</span>
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-2xl shadow-lg transition-all duration-200 ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-br-md'
                  : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <FontAwesomeIcon
                  icon={m.role === 'assistant' ? faRobot : faUser}
                  className={`text-sm ${m.role === 'user' ? 'text-orange-100' : 'text-orange-500'}`}
                />
                <span className={`text-sm font-semibold ${m.role === 'user' ? 'text-orange-100' : 'text-orange-600'}`}>
                  {m.role === 'assistant' ? 'Chef AI' : 'You'}
                </span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {m.content === '' && isBusy ? (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>Thinking of the perfect recipe...</span>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <FontAwesomeIcon icon={faStar} className="text-orange-500 text-sm" />
          <span className="text-sm font-medium text-gray-700">Quick Suggestions</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[
            { text: 'Biryani recipe', icon: faUtensils },
            { text: 'Aaj dinner mein kya banau?', icon: faClock },
            { text: 'Easy breakfast', icon: faLeaf },
            { text: 'Vegetarian khana', icon: faLeaf }
          ].map(({ text, icon }) => (
            <button
              key={text}
              type="button"
              onClick={() => sendMessage(text)}
              disabled={isBusy}
              className="flex items-center space-x-2 whitespace-nowrap bg-white text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-orange-50 hover:text-orange-600 border border-gray-200 hover:border-orange-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <FontAwesomeIcon icon={icon} className="text-xs" />
              <span>{text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-gray-200 shadow-lg">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-3"
        >
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for recipes, ingredients, or cooking tips..."
              className="w-full border border-gray-300 rounded-full px-6 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm placeholder-gray-500 shadow-sm transition-all duration-200"
              disabled={isBusy}
            />
            {isBusy && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-400 text-sm" />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full disabled:opacity-50 hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
          </button>
        </form>
      </div>
    </div>
  );
}