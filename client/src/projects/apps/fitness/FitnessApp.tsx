/**
 * Fitness Tracker - ARE-Logic Powered
 * Workout and health management
 */

import React, { useState, useEffect } from 'react';

interface Workout {
  id: string;
  type: string;
  duration: number;
  calories: number;
  heartRate: number;
  timestamp: Date;
}

const workoutTypes = ['Running', 'Cycling', 'Swimming', 'Weight Training', 'Yoga', 'HIIT'];

export function FitnessApp() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [heartRate, setHeartRate] = useState(72);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeWorkout) {
        setHeartRate(120 + Math.floor(Math.random() * 40));
        setActiveWorkout(prev => prev ? { ...prev, duration: prev.duration + 1, calories: prev.calories + 0.5, heartRate: 120 + Math.floor(Math.random() * 40) } : null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  const startWorkout = (type: string) => {
    setActiveWorkout({ id: Date.now().toString(), type, duration: 0, calories: 0, heartRate: 72, timestamp: new Date() });
  };

  const endWorkout = () => {
    if (activeWorkout) {
      setWorkouts(prev => [...prev.slice(-9), activeWorkout]);
      setActiveWorkout(null);
      setHeartRate(72);
    }
  };

  const totalCalories = workouts.reduce((a, w) => a + w.calories, 0) + (activeWorkout?.calories || 0);
  const totalDuration = workouts.reduce((a, w) => a + w.duration, 0) + (activeWorkout?.duration || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">💪 Fitness Tracker</h1>
        <p className="text-center text-purple-300 mb-8">ARE-Logic Powered</p>

        {activeWorkout ? (
          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">{activeWorkout.type}</h2>
            <div className="text-6xl font-mono mb-4">{activeWorkout.duration}s</div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700 p-4 rounded-xl">
                <div className="text-3xl">{Math.round(activeWorkout.calories)}</div>
                <div className="text-sm text-slate-400">Calories</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl">
                <div className="text-3xl text-red-400">{heartRate}</div>
                <div className="text-sm text-slate-400">BPM</div>
              </div>
            </div>
            <button onClick={endWorkout} className="px-8 py-4 bg-red-600 rounded-xl font-bold hover:bg-red-500">
              ⏹ End Workout
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800 p-4 rounded-xl text-center">
                <div className="text-3xl font-bold">{totalDuration}s</div>
                <div className="text-sm text-slate-400">Total Time</div>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl text-center">
                <div className="text-3xl font-bold text-orange-400">{Math.round(totalCalories)}</div>
                <div className="text-sm text-slate-400">Calories</div>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl text-center">
                <div className="text-3xl font-bold text-green-400">{workouts.length}</div>
                <div className="text-sm text-slate-400">Workouts</div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Start Workout</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {workoutTypes.map(type => (
                  <button key={type} onClick={() => startWorkout(type)} className="p-4 bg-slate-700 hover:bg-purple-600 rounded-xl font-bold transition-colors">
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">History</h2>
              {workouts.map(w => (
                <div key={w.id} className="flex justify-between p-3 bg-slate-700 rounded-lg mb-2">
                  <span>{w.type}</span>
                  <span>{w.duration}s • {Math.round(w.calories)} cal</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 text-center text-sm text-slate-400">
          🟦 Powered by ARE-Logic • 10-Hz Real-time Tracking
        </div>
      </div>
    </div>
  );
}

export default FitnessApp;
