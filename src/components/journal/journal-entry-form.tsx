'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useJournalEntries, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry } from '@/lib/api/journal';
import { BookOpen, Plus, Edit2, Trash2, Smile, Frown, Meh } from 'lucide-react';

const AM_PROMPTS = [
  'What are you grateful for today?',
  'What are your top 3 priorities today?',
  'How do you want to feel by the end of the day?',
];

const PM_PROMPTS = [
  'What went well today?',
  'What could have gone better?',
  'What did you learn today?',
];

export function JournalEntryForm({ type = 'reflection' as 'reflection' | 'am' | 'pm' }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    content: '',
    promptQuestion: '',
    tags: [] as string[],
  });

  const { data: entries, isLoading } = useJournalEntries({ type, period: 'month' });
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry(editingId || '');
  const deleteMutation = useDeleteJournalEntry();

  const prompts = type === 'am' ? AM_PROMPTS : type === 'pm' ? PM_PROMPTS : [];

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      type,
      date: new Date().toISOString(),
      content: formData.content,
      promptQuestion: formData.promptQuestion || undefined,
      tags: formData.tags,
    });

    setIsCreating(false);
    setFormData({ content: '', promptQuestion: '', tags: [] });
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    await updateMutation.mutateAsync({
      content: formData.content,
      promptQuestion: formData.promptQuestion || null,
      tags: formData.tags,
    });

    setEditingId(null);
    setFormData({ content: '', promptQuestion: '', tags: [] });
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setFormData({
      content: entry.content,
      promptQuestion: entry.promptQuestion || '',
      tags: entry.tags || [],
    });
    setIsCreating(true);
  };

  const getSentimentIcon = (label?: string) => {
    if (label === 'positive') return <Smile className="w-4 h-4 text-green-600" />;
    if (label === 'negative') return <Frown className="w-4 h-4 text-red-600" />;
    return <Meh className="w-4 h-4 text-gray-600" />;
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading journal entries...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {type === 'am' ? 'Morning Reflection' : type === 'pm' ? 'Evening Reflection' : 'Journal'}
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {isCreating && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium">{editingId ? 'Edit Entry' : 'New Entry'}</h3>

          {prompts.length > 0 && !editingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt (Optional)
              </label>
              <select
                value={formData.promptQuestion}
                onChange={(e) => setFormData({ ...formData, promptQuestion: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Choose a prompt...</option>
                {prompts.map((prompt, idx) => (
                  <option key={idx} value={prompt}>
                    {prompt}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.promptQuestion || 'Your Thoughts'}
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={8}
              placeholder="Write your thoughts here..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={!formData.content}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {editingId ? 'Update' : 'Save'} Entry
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
                setFormData({ content: '', promptQuestion: '', tags: [] });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {entries?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No journal entries yet. Start writing!
          </div>
        )}

        {entries?.map((entry) => (
          <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {format(new Date(entry.date), 'MMM d, yyyy h:mm a')}
                </span>
                {entry.sentimentLabel && (
                  <span className="flex items-center gap-1">
                    {getSentimentIcon(entry.sentimentLabel)}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(entry)}
                  className="p-1 text-gray-500 hover:text-blue-600"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(entry.id)}
                  className="p-1 text-gray-500 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {entry.promptQuestion && (
              <div className="text-sm text-purple-600 mb-2 font-medium">
                {entry.promptQuestion}
              </div>
            )}

            <p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>

            {entry.tags && entry.tags.length > 0 && (
              <div className="flex gap-2 mt-3">
                {entry.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
