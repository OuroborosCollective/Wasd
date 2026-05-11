/**
 * Logic Grid - Programming Education Platform
 * Learn coding with interactive exercises
 */

import React, { useState, useEffect } from 'react';

interface Exercise {
  id: number;
  title: string;
  titleDE: string;
  difficulty: number;
  category: string;
  completed: boolean;
}

const exercises: Exercise[] = [
  { id: 1, title: 'Variables', titleDE: 'Variablen', difficulty: 1, category: 'basics', completed: true },
  { id: 2, title: 'Data Types', titleDE: 'Datentypen', difficulty: 1, category: 'basics', completed: true },
  { id: 3, title: 'Conditions', titleDE: 'Bedingungen', difficulty: 2, category: 'logic', completed: false },
  { id: 4, title: 'Loops', titleDE: 'Schleifen', difficulty: 2, category: 'logic', completed: false },
  { id: 5, title: 'Functions', titleDE: 'Funktionen', difficulty: 3, category: 'functions', completed: false },
  { id: 6, title: 'Arrays', titleDE: 'Felder', difficulty: 3, category: 'data', completed: false },
  { id: 7, title: 'Objects', titleDE: 'Objekte', difficulty: 4, category: 'data', completed: false },
  { id: 8, title: 'Classes', titleDE: 'Klassen', difficulty: 4, category: 'oop', completed: false },
  { id: 9, title: 'APIs', titleDE: 'Schnittstellen', difficulty: 5, category: 'advanced', completed: false },
  { id: 10, title: 'Algorithms', titleDE: 'Algorithmen', difficulty: 5, category: 'advanced', completed: false },
];

const lessons = [
  { id: 1, title: 'Introduction', titleDE: 'Einführung', content: 'Welcome to programming!', contentDE: 'Willkommen beim Programmieren!' },
  { id: 2, title: 'Variables', titleDE: 'Variablen', content: 'Store data in variables', contentDE: 'Daten in Variablen speichern' },
  { id: 3, title: 'Logic', titleDE: 'Logik', content: 'If/else statements', contentDE: 'Wenn/Dann-Anweisungen' },
  { id: 4, title: 'Loops', titleDE: 'Schleifen', content: 'Repeat code with loops', contentDE: 'Code mit Schleifen wiederholen' },
];

export function LogicGridApp() {
  const [activeTab, setActiveTab] = useState<'lessons' | 'exercises' | 'code'>('lessons');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(1);
  const [code, setCode] = useState('// Write your code here\nfunction hello() {\n  console.log("Hello World!");\n}');
  const [output, setOutput] = useState<string[]>([]);

  const runCode = () => {
    setOutput(prev => [...prev, '> Hello World!', `> Execution time: ${(Math.random() * 10).toFixed(2)}ms`]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <div className="text-6xl mb-4">🧮</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Logic Grid
          </h1>
          <p className="text-purple-300 mt-2">Programming Education • ARE-Logic Powered</p>
        </header>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-purple-800/50 border border-purple-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">10</div>
            <div className="text-sm text-purple-300">Exercises</div>
          </div>
          <div className="bg-purple-800/50 border border-purple-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">{exercises.filter(e => e.completed).length}</div>
            <div className="text-sm text-purple-300">Completed</div>
          </div>
          <div className="bg-purple-800/50 border border-purple-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">4</div>
            <div className="text-sm text-purple-300">Lessons</div>
          </div>
          <div className="bg-purple-800/50 border border-purple-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-green-400">42%</div>
            <div className="text-sm text-purple-300">Progress</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['lessons', 'exercises', 'code'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-lg font-bold capitalize ${activeTab === tab ? 'bg-purple-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'lessons' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lessons.map(lesson => (
              <button key={lesson.id} onClick={() => setSelectedLesson(lesson.id)}
                className={`p-6 rounded-xl text-left transition-all ${selectedLesson === lesson.id ? 'bg-purple-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
                <div className="text-2xl mb-2">📚</div>
                <div className="font-bold">{lesson.title}</div>
                <div className="text-sm text-slate-400">{lesson.titleDE}</div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'exercises' && (
          <div className="space-y-2">
            {exercises.map(ex => (
              <div key={ex.id} className={`p-4 rounded-xl flex justify-between items-center ${ex.completed ? 'bg-green-900/30 border border-green-500/30' : 'bg-slate-800'}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center ${ex.completed ? 'bg-green-500' : 'bg-slate-600'}`}>
                    {ex.completed ? '✓' : ex.id}
                  </span>
                  <div>
                    <div className="font-bold">{ex.title}</div>
                    <div className="text-sm text-slate-400">{ex.titleDE}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${ex.difficulty <= 2 ? 'bg-green-500/30 text-green-400' : ex.difficulty <= 3 ? 'bg-yellow-500/30 text-yellow-400' : 'bg-red-500/30 text-red-400'}`}>
                    Level {ex.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-700 p-3 flex justify-between items-center">
                <span className="font-bold">Code Editor</span>
                <button onClick={runCode} className="px-4 py-1 bg-green-600 rounded hover:bg-green-500">▶ Run</button>
              </div>
              <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-96 p-4 bg-slate-900 font-mono text-sm resize-none" spellCheck={false} />
            </div>
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-700 p-3">
                <span className="font-bold">Output</span>
              </div>
              <div className="h-96 p-4 bg-black font-mono text-sm overflow-y-auto">
                {output.length === 0 ? <span className="text-slate-500">Click Run to execute code...</span> : output.map((line, i) => (
                  <div key={i} className={line.startsWith('>') ? 'text-green-400' : 'text-slate-400'}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-400">
          🟦 Powered by ARE-Logic • Learn Programming Step by Step
        </div>
      </div>
    </div>
  );
}

export default LogicGridApp;