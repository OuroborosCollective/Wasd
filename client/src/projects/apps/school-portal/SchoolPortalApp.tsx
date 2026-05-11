/**
 * School Portal - Education Management
 */

import React, { useState } from 'react';

export function SchoolPortalApp() {
  const students = [
    { id: 1, name: 'Max Mustermann', grade: '10A', attendance: 95 },
    { id: 2, name: 'Anna Müller', grade: '10B', attendance: 88 },
    { id: 3, name: 'Lena Schmidt', grade: '10A', attendance: 92 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">🏫 School Portal</h1>
        <p className="text-center text-blue-300 mb-8">Educational Management</p>
        
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Student Directory</h2>
          {students.map(s => (
            <div key={s.id} className="flex justify-between p-3 bg-slate-700 rounded-lg mb-2">
              <span>{s.name}</span>
              <span>{s.grade} • {s.attendance}% attendance</span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-400">
          🟦 Powered by ARE-Logic
        </div>
      </div>
    </div>
  );
}

export default SchoolPortalApp;
