import React, { useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

export const AIChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-white rounded-2xl shadow-2xl w-80 h-96 flex flex-col border border-gray-200 overflow-hidden mb-4">
          <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
            <span className="font-bold">AraClinic AI</span>
            <button onClick={() => setIsOpen(false)}><X size={20}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded-lg text-sm ${m.role === 'user' ? 'bg-emerald-50 ml-8' : 'bg-gray-100 mr-8'}`}>
                {m.text}
              </div>
            ))}
            {loading && <Loader2 className="animate-spin text-emerald-600 mx-auto" />}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input 
              className="flex-1 border rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            />
            <button onClick={handleAsk} className="text-emerald-600"><Send size={20}/></button>
          </div>
        </div>
      ) : null}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110"
      >
        <MessageCircle size={28} />
      </button>
    </div>
  );
};