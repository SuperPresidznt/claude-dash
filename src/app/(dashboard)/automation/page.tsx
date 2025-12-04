'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function AutomationPage() {
  const queryClient = useQueryClient();

  const { data: rules } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const res = await fetch('/api/automation/rules');
      if (!res.ok) throw new Error('Failed to fetch rules');
      return res.json();
    },
  });

  const createRule = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
  });

  const evaluateRules = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/automation/rules/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to evaluate rules');
      return res.json();
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Automation & Rules Engine</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Create New Rule</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const conditionType = formData.get('conditionType') as string;

            let conditionConfig = {};
            if (conditionType === 'runway_low') {
              conditionConfig = { threshold: 3 };
            } else if (conditionType === 'budget_exceeded') {
              conditionConfig = { category: formData.get('category') };
            }

            createRule.mutate({
              name: formData.get('name'),
              description: formData.get('description'),
              conditionType,
              conditionConfig,
              actionType: formData.get('actionType'),
              actionConfig: {
                taskTitle: formData.get('taskTitle'),
                priority: 'high',
              },
            });
            e.currentTarget.reset();
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rule Name</label>
                <input type="text" name="name" required className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea name="description" rows={2} className="w-full border rounded px-3 py-2"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Condition</label>
                <select name="conditionType" className="w-full border rounded px-3 py-2">
                  <option value="runway_low">Runway Low (< 3 months)</option>
                  <option value="habit_streak_broken">Habit Streak Broken</option>
                  <option value="budget_exceeded">Budget Exceeded</option>
                  <option value="task_overdue">Task Overdue</option>
                  <option value="wellbeing_declining">Wellbeing Declining</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Action</label>
                <select name="actionType" className="w-full border rounded px-3 py-2">
                  <option value="send_alert">Send Alert</option>
                  <option value="create_task">Create Task</option>
                  <option value="schedule_review">Schedule Review</option>
                  <option value="send_email">Send Email</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Task Title (if creating task)</label>
                <input type="text" name="taskTitle" className="w-full border rounded px-3 py-2" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                Create Rule
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Active Rules</h2>
              <button
                onClick={() => evaluateRules.mutate()}
                disabled={evaluateRules.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {evaluateRules.isPending ? 'Evaluating...' : 'Evaluate Now'}
              </button>
            </div>
            <div className="space-y-3">
              {rules?.map((rule: any) => (
                <div key={rule.id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold">{rule.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${rule.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {rule.isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                  )}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Condition: <span className="font-medium">{rule.conditionType}</span></div>
                    <div>Action: <span className="font-medium">{rule.actionType}</span></div>
                    <div>Triggered: {rule.triggerCount} times</div>
                    {rule.lastTriggeredAt && (
                      <div>Last: {format(new Date(rule.lastTriggeredAt), 'MMM dd, HH:mm')}</div>
                    )}
                  </div>
                  {rule.executionLogs?.length > 0 && (
                    <div className="mt-3 pt-3 border-t text-xs">
                      <p className="font-medium mb-1">Recent Executions:</p>
                      {rule.executionLogs.map((log: any) => (
                        <div key={log.id} className="flex justify-between py-1">
                          <span className={log.success ? 'text-green-600' : 'text-red-600'}>
                            {log.success ? '✓' : '✗'}
                          </span>
                          <span>{format(new Date(log.triggeredAt), 'MMM dd, HH:mm')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {rules?.length === 0 && (
                <p className="text-gray-600 text-center py-4">No rules created yet</p>
              )}
            </div>
          </div>

          {evaluateRules.isSuccess && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-bold mb-2">Evaluation Results</h3>
              <p className="text-sm text-gray-600 mb-3">
                Evaluated {evaluateRules.data.evaluatedRules} rules, triggered {evaluateRules.data.triggeredRules}
              </p>
              {evaluateRules.data.results?.map((result: any) => (
                <div key={result.ruleId} className="bg-green-50 border border-green-200 p-3 rounded mb-2 text-sm">
                  <p className="font-medium">{result.ruleName}</p>
                  <p className="text-xs text-gray-600">Action executed successfully</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
