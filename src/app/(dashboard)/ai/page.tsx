'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export default function AIPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [nlInput, setNlInput] = useState('');

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages([...messages, { role: 'user', content: nlInput }, { role: 'assistant', content: data.response }]);
    },
  });

  const nlCapture = useMutation({
    mutationFn: async (input: string) => {
      const res = await fetch('/api/ai/nl-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) throw new Error('Failed to process input');
      return res.json();
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">AI Copilot & Natural Language Capture</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">AI Copilot Chat</h2>
          <div className="space-y-4 mb-4 h-96 overflow-y-auto border rounded p-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (nlInput.trim()) {
              sendMessage.mutate(nlInput);
              setNlInput('');
            }
          }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                placeholder="Ask about your goals, tasks, or finances..."
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                type="submit"
                disabled={sendMessage.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {sendMessage.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Natural Language Capture</h2>
          <p className="text-sm text-gray-600 mb-4">
            Type naturally to create tasks, log expenses, or track habits
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const input = formData.get('input') as string;
            nlCapture.mutate(input);
            e.currentTarget.reset();
          }}>
            <div className="space-y-4">
              <textarea
                name="input"
                rows={4}
                placeholder="Examples:
- Log $45 groceries yesterday
- Create task: Review quarterly goals
- Completed meditation habit
- $1200 income from client"
                className="w-full border rounded px-3 py-2"
              ></textarea>
              <button
                type="submit"
                disabled={nlCapture.isPending}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {nlCapture.isPending ? 'Processing...' : 'Process Input'}
              </button>
            </div>
          </form>

          {nlCapture.isSuccess && (
            <div className="mt-4 p-4 rounded border">
              {nlCapture.data.success ? (
                <div className="space-y-2">
                  <p className="text-green-600 font-medium">Successfully processed!</p>
                  <div className="text-sm text-gray-600">
                    <p>Type: {nlCapture.data.entityType}</p>
                    <p>Entity ID: {nlCapture.data.entityId}</p>
                    {nlCapture.data.parsed && (
                      <pre className="mt-2 bg-gray-50 p-2 rounded text-xs">
                        {JSON.stringify(nlCapture.data.parsed, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-red-600">Failed to process input</p>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-bold text-sm mb-2">Tips:</h3>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Include amounts ($) for expenses/income</li>
              <li>• Mention time (today, yesterday)</li>
              <li>• Use keywords like "task", "habit", "completed"</li>
              <li>• Specify categories (groceries, transport, etc.)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
