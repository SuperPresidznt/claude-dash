'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Check, X } from 'lucide-react';
import { useCreatePomodoro, useCompletePomodoro, usePomodoroSessions } from '@/lib/api/pomodoro';
import { useTasks } from '@/lib/api/tasks';
import { format } from 'date-fns';

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

export function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const { data: tasks } = useTasks({ status: 'todo,in_progress' });
  const { data: todaySessions } = usePomodoroSessions({ date: format(new Date(), 'yyyy-MM-dd') });
  const createMutation = useCreatePomodoro();
  const completeMutation = useCompletePomodoro(currentSessionId || '');

  useEffect(() => {
    if (todaySessions) {
      setPomodorosCompleted(todaySessions.filter(s => s.type === 'work' && s.completed).length);
    }
  }, [todaySessions]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleStart = async () => {
    if (!isRunning && !currentSessionId) {
      const session = await createMutation.mutateAsync({
        taskId: selectedTaskId || undefined,
        type: sessionType,
        durationMinutes: Math.ceil(timeLeft / 60),
        startTime: new Date().toISOString(),
      });
      setCurrentSessionId(session.id);
      startTimeRef.current = new Date();
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleSessionComplete = async () => {
    setIsRunning(false);

    if (currentSessionId) {
      await completeMutation.mutateAsync({
        endTime: new Date().toISOString(),
        completed: true,
      });

      if (sessionType === 'work') {
        setPomodorosCompleted(prev => prev + 1);
        // After 4 work sessions, take a long break
        if ((pomodorosCompleted + 1) % 4 === 0) {
          setSessionType('long_break');
          setTimeLeft(LONG_BREAK);
        } else {
          setSessionType('short_break');
          setTimeLeft(SHORT_BREAK);
        }
      } else {
        // After break, start work session
        setSessionType('work');
        setTimeLeft(WORK_DURATION);
      }

      setCurrentSessionId(null);
      startTimeRef.current = null;
    }
  };

  const handleSkip = async () => {
    setIsRunning(false);

    if (currentSessionId) {
      await completeMutation.mutateAsync({
        endTime: new Date().toISOString(),
        completed: false,
        interrupted: true,
      });
    }

    if (sessionType === 'work') {
      setSessionType('short_break');
      setTimeLeft(SHORT_BREAK);
    } else {
      setSessionType('work');
      setTimeLeft(WORK_DURATION);
    }

    setCurrentSessionId(null);
    startTimeRef.current = null;
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentSessionId(null);
    startTimeRef.current = null;

    if (sessionType === 'work') {
      setTimeLeft(WORK_DURATION);
    } else if (sessionType === 'short_break') {
      setTimeLeft(SHORT_BREAK);
    } else {
      setTimeLeft(LONG_BREAK);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const getBackgroundColor = () => {
    if (sessionType === 'work') return 'bg-red-50 border-red-200';
    if (sessionType === 'short_break') return 'bg-green-50 border-green-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getButtonColor = () => {
    if (sessionType === 'work') return 'bg-red-600 hover:bg-red-700';
    if (sessionType === 'short_break') return 'bg-green-600 hover:bg-green-700';
    return 'bg-blue-600 hover:bg-blue-700';
  };

  return (
    <div className={`border rounded-lg p-6 ${getBackgroundColor()}`}>
      <div className="text-center space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">
            {sessionType === 'work' ? 'Focus Time' : sessionType === 'short_break' ? 'Short Break' : 'Long Break'}
          </h3>
          <p className="text-sm text-gray-600">
            Pomodoros completed today: {pomodorosCompleted}
          </p>
        </div>

        <div className="text-6xl font-mono font-bold">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        {sessionType === 'work' && !isRunning && !currentSessionId && (
          <div className="max-w-xs mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to Task (Optional)
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">No task</option>
              {tasks?.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-center gap-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className={`flex items-center gap-2 px-6 py-3 ${getButtonColor()} text-white rounded-lg`}
            >
              <Play className="w-5 h-5" />
              Start
            </button>
          ) : (
            <button
              onClick={handlePause}
              className={`flex items-center gap-2 px-6 py-3 ${getButtonColor()} text-white rounded-lg`}
            >
              <Pause className="w-5 h-5" />
              Pause
            </button>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>

          {currentSessionId && (
            <button
              onClick={handleSkip}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <X className="w-5 h-5" />
              Skip
            </button>
          )}
        </div>

        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => {
              setSessionType('work');
              setTimeLeft(WORK_DURATION);
              setIsRunning(false);
              setCurrentSessionId(null);
            }}
            className={`px-4 py-2 rounded ${sessionType === 'work' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Work
          </button>
          <button
            onClick={() => {
              setSessionType('short_break');
              setTimeLeft(SHORT_BREAK);
              setIsRunning(false);
              setCurrentSessionId(null);
            }}
            className={`px-4 py-2 rounded ${sessionType === 'short_break' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Short Break
          </button>
          <button
            onClick={() => {
              setSessionType('long_break');
              setTimeLeft(LONG_BREAK);
              setIsRunning(false);
              setCurrentSessionId(null);
            }}
            className={`px-4 py-2 rounded ${sessionType === 'long_break' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Long Break
          </button>
        </div>
      </div>

      {todaySessions && todaySessions.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-medium mb-2">Today's Sessions</h4>
          <div className="space-y-1">
            {todaySessions.slice(0, 5).map((session) => (
              <div key={session.id} className="text-sm flex justify-between items-center">
                <span className={session.completed ? 'text-green-700' : 'text-gray-500'}>
                  {session.type === 'work' ? '🍅' : '☕'} {session.task?.title || session.type}
                </span>
                <span className="text-xs text-gray-500">
                  {format(new Date(session.startTime), 'h:mm a')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
