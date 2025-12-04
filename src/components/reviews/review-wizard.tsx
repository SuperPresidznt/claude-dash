'use client';

import { useState } from 'react';
import { useReviews, useGenerateReview, useUpdateReview } from '@/lib/api/reviews';
import { FileText, TrendingUp, TrendingDown, DollarSign, CheckSquare, Zap, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export function ReviewWizard() {
  const [reviewType, setReviewType] = useState<'weekly' | 'monthly'>('weekly');
  const [step, setStep] = useState(1);
  const [currentReview, setCurrentReview] = useState<any>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [lowlights, setLowlights] = useState<string[]>([]);
  const [actionItems, setActionItems] = useState<string[]>([]);

  const { data: reviews } = useReviews({ type: reviewType });
  const generateMutation = useGenerateReview();
  const updateMutation = useUpdateReview(currentReview?.id || '');

  const handleGenerate = async () => {
    const review = await generateMutation.mutateAsync(reviewType);
    setCurrentReview(review);
    setStep(2);
  };

  const handleSaveReflections = async () => {
    if (!currentReview) return;

    await updateMutation.mutateAsync({
      highlights,
      lowlights,
      actionItems,
    });

    setStep(3);
  };

  const resetWizard = () => {
    setStep(1);
    setCurrentReview(null);
    setHighlights([]);
    setLowlights([]);
    setActionItems([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Review Wizard
        </h2>

        <div className="flex gap-3">
          <select
            value={reviewType}
            onChange={(e) => setReviewType(e.target.value as 'weekly' | 'monthly')}
            className="border border-gray-300 rounded px-4 py-2"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">Generate {reviewType === 'weekly' ? 'Weekly' : 'Monthly'} Review</h3>
            <p className="text-gray-600">
              We'll pull together your finance, task, habit, journal, and pomodoro data to create a comprehensive review.
            </p>

            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Review'}
            </button>
          </div>

          {reviews && reviews.length > 0 && (
            <div className="mt-8 pt-8 border-t">
              <h4 className="font-semibold mb-4">Past Reviews</h4>
              <div className="space-y-2">
                {reviews.slice(0, 5).map((review) => (
                  <div
                    key={review.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setCurrentReview(review);
                      setHighlights(review.highlights);
                      setLowlights(review.lowlights);
                      setActionItems(review.actionItems);
                      setStep(2);
                    }}
                  >
                    <span className="font-medium">{review.period}</span>
                    <span className="text-sm text-gray-600">
                      {format(new Date(review.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && currentReview && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">{currentReview.period} Summary</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {currentReview.financeSummary && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">Finance</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Income:</span>
                      <span className="font-medium">${currentReview.financeSummary.income?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expenses:</span>
                      <span className="font-medium">${currentReview.financeSummary.expenses?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-700 font-semibold">
                      <span>Net:</span>
                      <span>${currentReview.financeSummary.netCashflow?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {currentReview.taskSummary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Tasks</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-medium">{currentReview.taskSummary.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">{currentReview.taskSummary.total}</span>
                    </div>
                    <div className="flex justify-between text-blue-700 font-semibold">
                      <span>Rate:</span>
                      <span>{currentReview.taskSummary.completionRate?.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {currentReview.pomodoroSummary && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-900">Focus</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Sessions:</span>
                      <span className="font-medium">{currentReview.pomodoroSummary.sessionsCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minutes:</span>
                      <span className="font-medium">{currentReview.pomodoroSummary.totalMinutes}</span>
                    </div>
                    <div className="flex justify-between text-red-700 font-semibold">
                      <span>Hours:</span>
                      <span>{(currentReview.pomodoroSummary.totalMinutes / 60).toFixed(1)}h</span>
                    </div>
                  </div>
                </div>
              )}

              {currentReview.journalSummary && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900">Journal</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Entries:</span>
                      <span className="font-medium">{currentReview.journalSummary.entryCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sentiment:</span>
                      <span className="font-medium capitalize">{currentReview.journalSummary.sentimentTrend}</span>
                    </div>
                    <div className="flex justify-between text-purple-700 font-semibold">
                      <span>Score:</span>
                      <span>{currentReview.journalSummary.avgSentiment?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add Your Reflections</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Highlights
              </label>
              <textarea
                value={highlights.join('\n')}
                onChange={(e) => setHighlights(e.target.value.split('\n').filter(Boolean))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={4}
                placeholder="What went well? (One per line)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                Lowlights
              </label>
              <textarea
                value={lowlights.join('\n')}
                onChange={(e) => setLowlights(e.target.value.split('\n').filter(Boolean))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={4}
                placeholder="What could be improved? (One per line)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Items
              </label>
              <textarea
                value={actionItems.join('\n')}
                onChange={(e) => setActionItems(e.target.value.split('\n').filter(Boolean))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={4}
                placeholder="What will you do next? (One per line)"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveReflections}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Review
              </button>
              <button
                onClick={resetWizard}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center space-y-4">
          <h3 className="text-xl font-semibold text-green-700">Review Saved!</h3>
          <p className="text-gray-600">Your {reviewType} review has been saved successfully.</p>

          <div className="flex gap-2 justify-center">
            <button
              onClick={resetWizard}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Another Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
