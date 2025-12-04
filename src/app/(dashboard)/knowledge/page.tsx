'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function KnowledgePage() {
  const [view, setView] = useState<'resources' | 'reading' | 'flashcards'>('resources');
  const queryClient = useQueryClient();

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge/resources');
      if (!res.ok) throw new Error('Failed to fetch resources');
      return res.json();
    },
  });

  const { data: flashcardsDue } = useQuery({
    queryKey: ['flashcards-due'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge/flashcards?dueOnly=true');
      if (!res.ok) throw new Error('Failed to fetch flashcards');
      return res.json();
    },
  });

  const createResource = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/knowledge/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create resource');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Knowledge & Learning</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('resources')}
            className={`px-4 py-2 rounded ${view === 'resources' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Resources
          </button>
          <button
            onClick={() => setView('reading')}
            className={`px-4 py-2 rounded ${view === 'reading' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Reading Sessions
          </button>
          <button
            onClick={() => setView('flashcards')}
            className={`px-4 py-2 rounded ${view === 'flashcards' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Flash Review ({flashcardsDue?.length || 0})
          </button>
        </div>
      </div>

      {view === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources?.map((resource: any) => (
            <div key={resource.id} className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-bold text-lg mb-2">{resource.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{resource.type}</p>
              {resource.url && (
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm">
                  Open Resource
                </a>
              )}
              <div className="mt-4 text-sm text-gray-500">
                {resource.readingSessions?.length || 0} reading sessions
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'flashcards' && (
        <div className="max-w-2xl mx-auto">
          {flashcardsDue?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No cards due for review!</p>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow">
              <p className="text-lg">Flash card review interface would go here</p>
              <p className="text-sm text-gray-600 mt-2">{flashcardsDue?.length} cards due</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
