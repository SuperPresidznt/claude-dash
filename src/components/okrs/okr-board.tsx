'use client';

import { useState } from 'react';
import { useObjectives, useCreateObjective, useUpdateObjective, useCreateKeyResult, useUpdateKeyResult } from '@/lib/api/okrs';
import { Target, Plus, TrendingUp, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export function OKRBoard() {
  const [selectedQuarter, setSelectedQuarter] = useState('Q1 2025');
  const { data: objectives, isLoading } = useObjectives({ quarter: selectedQuarter });
  const [isCreatingObjective, setIsCreatingObjective] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);

  const createObjectiveMutation = useCreateObjective();
  const createKeyResultMutation = useCreateKeyResult();
  const updateKeyResultMutation = useUpdateKeyResult('');

  const [objectiveForm, setObjectiveForm] = useState({
    title: '',
    description: '',
    quarter: selectedQuarter,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    confidenceRating: 50,
  });

  const [keyResultForm, setKeyResultForm] = useState({
    title: '',
    targetValue: 100,
    currentValue: 0,
    unit: '%',
  });

  const handleCreateObjective = async () => {
    await createObjectiveMutation.mutateAsync({
      ...objectiveForm,
      startDate: new Date(objectiveForm.startDate).toISOString(),
      endDate: new Date(objectiveForm.endDate).toISOString(),
    });
    setIsCreatingObjective(false);
    setObjectiveForm({
      title: '',
      description: '',
      quarter: selectedQuarter,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      confidenceRating: 50,
    });
  };

  const handleAddKeyResult = async (objectiveId: string) => {
    await createKeyResultMutation.mutateAsync({
      objectiveId,
      ...keyResultForm,
    });
    setSelectedObjectiveId(null);
    setKeyResultForm({ title: '', targetValue: 100, currentValue: 0, unit: '%' });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading OKRs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            OKRs
          </h2>
          <p className="text-sm text-gray-600 mt-1">Objectives and Key Results</p>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2"
          >
            <option>Q1 2025</option>
            <option>Q2 2025</option>
            <option>Q3 2025</option>
            <option>Q4 2025</option>
          </select>

          <button
            onClick={() => setIsCreatingObjective(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Objective
          </button>
        </div>
      </div>

      {isCreatingObjective && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create Objective</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={objectiveForm.title}
              onChange={(e) => setObjectiveForm({ ...objectiveForm, title: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g., Launch new product feature"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={objectiveForm.description}
              onChange={(e) => setObjectiveForm({ ...objectiveForm, description: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={objectiveForm.startDate}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={objectiveForm.endDate}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confidence: {objectiveForm.confidenceRating}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={objectiveForm.confidenceRating}
              onChange={(e) => setObjectiveForm({ ...objectiveForm, confidenceRating: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateObjective}
              disabled={!objectiveForm.title || !objectiveForm.endDate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Create Objective
            </button>
            <button
              onClick={() => setIsCreatingObjective(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {objectives?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No objectives for this quarter. Create one to get started!
          </div>
        )}

        {objectives?.map((objective) => {
          const completedKRs = objective.keyResults?.filter(kr => kr.isCompleted).length || 0;
          const totalKRs = objective.keyResults?.length || 0;
          const overallProgress = totalKRs > 0
            ? objective.keyResults!.reduce((sum, kr) => sum + (kr.currentValue / kr.targetValue) * 100, 0) / totalKRs
            : 0;

          return (
            <div key={objective.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{objective.title}</h3>
                  {objective.description && (
                    <p className="text-sm text-gray-600 mt-1">{objective.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{format(new Date(objective.startDate), 'MMM d')} - {format(new Date(objective.endDate), 'MMM d, yyyy')}</span>
                    {objective.confidenceRating && (
                      <span className="text-blue-600">Confidence: {objective.confidenceRating}%</span>
                    )}
                  </div>
                </div>

                <span className={`px-3 py-1 rounded text-sm ${
                  objective.status === 'active' ? 'bg-green-100 text-green-800' :
                  objective.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {objective.status}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Overall Progress</span>
                  <span className="font-medium">{Math.round(overallProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(overallProgress)}`}
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Key Results ({completedKRs}/{totalKRs})
                  </h4>
                  <button
                    onClick={() => setSelectedObjectiveId(objective.id)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Key Result
                  </button>
                </div>

                {selectedObjectiveId === objective.id && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Key result title"
                      value={keyResultForm.title}
                      onChange={(e) => setKeyResultForm({ ...keyResultForm, title: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="Target"
                        value={keyResultForm.targetValue}
                        onChange={(e) => setKeyResultForm({ ...keyResultForm, targetValue: parseFloat(e.target.value) })}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Current"
                        value={keyResultForm.currentValue}
                        onChange={(e) => setKeyResultForm({ ...keyResultForm, currentValue: parseFloat(e.target.value) })}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={keyResultForm.unit}
                        onChange={(e) => setKeyResultForm({ ...keyResultForm, unit: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddKeyResult(objective.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setSelectedObjectiveId(null)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {objective.keyResults?.map((kr) => {
                  const krProgress = (kr.currentValue / kr.targetValue) * 100;
                  return (
                    <div key={kr.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      {kr.isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-gray-400" />
                      )}

                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{kr.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {kr.currentValue} / {kr.targetValue} {kr.unit} ({Math.round(krProgress)}%)
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div
                            className={`h-1 rounded-full ${getProgressColor(krProgress)}`}
                            style={{ width: `${Math.min(krProgress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {kr.confidenceRating && (
                        <div className="text-xs text-gray-600">
                          {kr.confidenceRating}% confident
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
