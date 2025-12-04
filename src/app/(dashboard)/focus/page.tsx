import { FocusBlockPlanner } from '@/components/focus/focus-block-planner';
import { PomodoroTimer } from '@/components/pomodoro/pomodoro-timer';

export default function FocusPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <FocusBlockPlanner />
        </div>
        <div>
          <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}
