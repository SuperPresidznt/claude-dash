'use client';

import { type Project } from '@/lib/api/projects';

type ProgressChartsProps = {
  projects: Project[];
  onClose: () => void;
};

export const ProgressCharts = ({ projects, onClose }: ProgressChartsProps) => {
  // Calculate overall statistics
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const totalTasks = projects.reduce((sum, p) => sum + p.stats.totalTasks, 0);
  const completedTasks = projects.reduce((sum, p) => sum + p.stats.completedTasks, 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Projects by status
  const statusCounts = {
    planning: projects.filter((p) => p.status === 'planning').length,
    active: activeProjects,
    paused: projects.filter((p) => p.status === 'paused').length,
    completed: completedProjects,
    cancelled: projects.filter((p) => p.status === 'cancelled').length,
  };

  // Top projects by progress
  const topProjects = [...projects]
    .filter((p) => p.status !== 'completed' && p.status !== 'cancelled')
    .sort((a, b) => b.stats.progressPercent - a.stats.progressPercent)
    .slice(0, 5);

  // Projects needing attention (low progress, active status)
  const needsAttention = projects
    .filter((p) => p.status === 'active' && p.stats.progressPercent < 30 && p.stats.totalTasks > 0)
    .sort((a, b) => a.stats.progressPercent - b.stats.progressPercent);

  // Overdue projects
  const overdue = projects.filter(
    (p) => p.targetDate && new Date(p.targetDate) < new Date() && p.status !== 'completed' && p.status !== 'cancelled'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Project Analytics</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Projects"
            value={totalProjects}
            color="bg-blue-100 text-blue-700"
          />
          <StatCard
            label="Active Projects"
            value={activeProjects}
            color="bg-green-100 text-green-700"
          />
          <StatCard
            label="Completed"
            value={completedProjects}
            color="bg-purple-100 text-purple-700"
          />
          <StatCard
            label="Overall Progress"
            value={`${overallProgress}%`}
            color="bg-orange-100 text-orange-700"
          />
        </div>

        {/* Status Distribution */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Status Distribution</h3>
          <div className="grid grid-cols-5 gap-2">
            <StatusBar label="Planning" count={statusCounts.planning} color="bg-gray-400" />
            <StatusBar label="Active" count={statusCounts.active} color="bg-blue-500" />
            <StatusBar label="Paused" count={statusCounts.paused} color="bg-yellow-500" />
            <StatusBar label="Completed" count={statusCounts.completed} color="bg-green-500" />
            <StatusBar label="Cancelled" count={statusCounts.cancelled} color="bg-red-500" />
          </div>
        </div>

        {/* Top Performing Projects */}
        {topProjects.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Top Performing Projects</h3>
            <div className="space-y-2">
              {topProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-gray-600">
                      {project.stats.completedTasks}/{project.stats.totalTasks} tasks
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${project.stats.progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right font-semibold text-green-600">
                    {project.stats.progressPercent}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Needs Attention */}
        {needsAttention.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Needs Attention</h3>
            <div className="space-y-2">
              {needsAttention.map((project) => (
                <div key={project.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex-1">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-gray-600">
                      Only {project.stats.progressPercent}% complete
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${project.stats.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Projects */}
        {overdue.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-red-600">Overdue Projects</h3>
            <div className="space-y-2">
              {overdue.map((project) => (
                <div key={project.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex-1">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-red-600">
                      Due: {new Date(project.targetDate!).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600">
                    {project.stats.progressPercent}% complete
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task Summary */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Task Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-3xl font-bold text-gray-700">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-3xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-3xl font-bold text-blue-600">{totalTasks - completedTasks}</div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div className={`${color} rounded-lg p-4`}>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm opacity-80">{label}</div>
  </div>
);

const StatusBar = ({ label, count, color }: { label: string; count: number; color: string }) => (
  <div>
    <div className="text-sm text-gray-600 mb-1">{label}</div>
    <div className={`${color} text-white text-center py-2 rounded font-semibold`}>
      {count}
    </div>
  </div>
);
