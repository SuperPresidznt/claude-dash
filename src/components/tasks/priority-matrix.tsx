'use client';

import { type Task } from '@/lib/api/tasks';

type PriorityMatrixProps = {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
};

export const PriorityMatrix = ({ tasks, onTaskClick }: PriorityMatrixProps) => {
  // Filter out completed and cancelled tasks
  const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

  // Categorize tasks into quadrants based on effort and impact
  const getQuadrant = (task: Task): 'quick-wins' | 'major-projects' | 'fill-ins' | 'thankless-tasks' | 'unscored' => {
    if (!task.effort || !task.impact) return 'unscored';

    // High impact (4-5), Low effort (1-2) = Quick Wins
    if (task.impact >= 4 && task.effort <= 2) return 'quick-wins';

    // High impact (4-5), High effort (3-5) = Major Projects
    if (task.impact >= 4 && task.effort >= 3) return 'major-projects';

    // Low impact (1-2), Low effort (1-2) = Fill-ins
    if (task.impact <= 2 && task.effort <= 2) return 'fill-ins';

    // Low impact (1-3), High effort (3-5) = Thankless Tasks
    if (task.impact <= 3 && task.effort >= 3) return 'thankless-tasks';

    // Medium values - distribute based on score
    const score = task.impact / task.effort;
    if (score > 1.5) return 'quick-wins';
    if (score > 0.8) return 'major-projects';
    return 'thankless-tasks';
  };

  const quickWins = activeTasks.filter((t) => getQuadrant(t) === 'quick-wins');
  const majorProjects = activeTasks.filter((t) => getQuadrant(t) === 'major-projects');
  const fillIns = activeTasks.filter((t) => getQuadrant(t) === 'fill-ins');
  const thanklessTasks = activeTasks.filter((t) => getQuadrant(t) === 'thankless-tasks');
  const unscoredTasks = activeTasks.filter((t) => getQuadrant(t) === 'unscored');

  return (
    <div className="space-y-6">
      {/* Eisenhower Matrix */}
      <div className="grid grid-cols-2 gap-4 h-[600px]">
        {/* Quick Wins - High Impact, Low Effort */}
        <QuadrantCard
          title="Quick Wins"
          subtitle="High Impact, Low Effort"
          color="bg-green-50 border-green-300"
          tasks={quickWins}
          onTaskClick={onTaskClick}
          recommendation="Do these first - best ROI"
        />

        {/* Major Projects - High Impact, High Effort */}
        <QuadrantCard
          title="Major Projects"
          subtitle="High Impact, High Effort"
          color="bg-blue-50 border-blue-300"
          tasks={majorProjects}
          onTaskClick={onTaskClick}
          recommendation="Schedule time blocks for these"
        />

        {/* Fill-ins - Low Impact, Low Effort */}
        <QuadrantCard
          title="Fill-ins"
          subtitle="Low Impact, Low Effort"
          color="bg-yellow-50 border-yellow-300"
          tasks={fillIns}
          onTaskClick={onTaskClick}
          recommendation="Do when you have spare time"
        />

        {/* Thankless Tasks - Low Impact, High Effort */}
        <QuadrantCard
          title="Thankless Tasks"
          subtitle="Low Impact, High Effort"
          color="bg-red-50 border-red-300"
          tasks={thanklessTasks}
          onTaskClick={onTaskClick}
          recommendation="Eliminate, delegate, or defer"
        />
      </div>

      {/* Unscored Tasks */}
      {unscoredTasks.length > 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-2">
            Unscored Tasks ({unscoredTasks.length})
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            These tasks need effort and impact scores to be prioritized
          </p>
          <div className="grid grid-cols-3 gap-2">
            {unscoredTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="text-left p-2 bg-white border rounded hover:shadow-md transition-shadow"
              >
                <div className="font-medium text-sm">{task.title}</div>
                <div className="text-xs text-gray-500 mt-1">Click to add scores</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const QuadrantCard = ({
  title,
  subtitle,
  color,
  tasks,
  onTaskClick,
  recommendation,
}: {
  title: string;
  subtitle: string;
  color: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  recommendation: string;
}) => {
  return (
    <div className={`border-2 rounded-lg p-4 ${color} flex flex-col`}>
      <div className="mb-3">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-gray-600">{subtitle}</p>
        <p className="text-xs italic text-gray-700 mt-1">{recommendation}</p>
        <div className="text-sm font-semibold mt-2">{tasks.length} tasks</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="w-full text-left p-3 bg-white border rounded hover:shadow-md transition-shadow"
          >
            <div className="font-medium text-sm">{task.title}</div>
            {task.description && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</div>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="bg-blue-100 px-2 py-1 rounded">
                Impact: {task.impact}
              </span>
              <span className="bg-purple-100 px-2 py-1 rounded">
                Effort: {task.effort}
              </span>
              {task.priorityScore && (
                <span className="bg-green-100 px-2 py-1 rounded">
                  Score: {task.priorityScore}
                </span>
              )}
            </div>
            {task.dueDate && (
              <div className="text-xs text-gray-500 mt-1">
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
