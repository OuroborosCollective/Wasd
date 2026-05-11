/**
 * School Portal - Full Educational Management System
 * For German Minister of Education
 */

import React, { useState } from 'react';

interface Student {
  id: string;
  name: string;
  grade: string;
  attendance: number;
  grades: { subject: string; grade: number }[];
  behavior: number;
}

const initialStudents: Student[] = [
  { id: 'S001', name: 'Max Mustermann', grade: '10A', attendance: 95, grades: [{ subject: 'Math', grade: 1.7 }, { subject: 'German', grade: 2.0 }, { subject: 'English', grade: 1.3 }], behavior: 92 },
  { id: 'S002', name: 'Anna Müller', grade: '10A', attendance: 88, grades: [{ subject: 'Math', grade: 2.3 }, { subject: 'German', grade: 1.7 }, { subject: 'English', grade: 2.0 }], behavior: 95 },
  { id: 'S003', name: 'Lena Schmidt', grade: '10B', attendance: 92, grades: [{ subject: 'Math', grade: 1.3 }, { subject: 'German', grade: 1.3 }, { subject: 'English', grade: 1.7 }], behavior: 98 },
  { id: 'S004', name: 'Tom Weber', grade: '10B', attendance: 78, grades: [{ subject: 'Math', grade: 3.0 }, { subject: 'German', grade: 2.7 }, { subject: 'English', grade: 3.3 }], behavior: 85 },
  { id: 'S005', name: 'Sophie Fischer', grade: '11A', attendance: 96, grades: [{ subject: 'Math', grade: 1.0 }, { subject: 'German', grade: 1.7 }, { subject: 'Physics', grade: 1.3 }], behavior: 97 },
  { id: 'S006', name: 'Lukas Wagner', grade: '11A', attendance: 91, grades: [{ subject: 'Math', grade: 2.0 }, { subject: 'German', grade: 2.3 }, { subject: 'Physics', grade: 2.0 }], behavior: 90 },
];

const teachers = [
  { id: 'T001', name: 'Dr. Hansen', subject: 'Mathematics', students: 145 },
  { id: 'T002', name: 'Frau Schmidt', subject: 'German', students: 120 },
  { id: 'T003', name: 'Mr. Brown', subject: 'English', students: 95 },
  { id: 'T004', name: 'Dr. Weber', subject: 'Physics', students: 80 },
];

export function SchoolPortalApp() {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'grades' | 'attendance'>('students');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <div className="text-6xl mb-4">🏫</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            School Portal Deutschland
          </h1>
          <p className="text-blue-300 mt-2">Educational Management • ARE-Logic Powered</p>
        </header>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-800/50 border border-blue-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">1,245</div>
            <div className="text-sm text-blue-300">Students</div>
          </div>
          <div className="bg-blue-800/50 border border-blue-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">45</div>
            <div className="text-sm text-blue-300">Teachers</div>
          </div>
          <div className="bg-blue-800/50 border border-blue-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">32</div>
            <div className="text-sm text-blue-300">Classes</div>
          </div>
          <div className="bg-blue-800/50 border border-blue-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-green-400">2.1</div>
            <div className="text-sm text-blue-300">Avg Grade</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['students', 'teachers', 'grades', 'attendance'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-lg font-bold capitalize ${activeTab === tab ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'students' && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr><th className="p-4 text-left">ID</th><th className="p-4 text-left">Name</th><th className="p-4 text-left">Grade</th><th className="p-4 text-left">Attendance</th><th className="p-4 text-left">Avg</th></tr>
              </thead>
              <tbody>
                {initialStudents.map(s => (
                  <tr key={s.id} className="border-t border-slate-700 hover:bg-slate-700/50 cursor-pointer" onClick={() => setSelectedStudent(s)}>
                    <td className="p-4">{s.id}</td>
                    <td className="p-4 font-bold">{s.name}</td>
                    <td className="p-4">{s.grade}</td>
                    <td className="p-4"><span className={s.attendance < 85 ? 'text-red-400' : s.attendance < 90 ? 'text-yellow-400' : 'text-green-400'}>{s.attendance}%</span></td>
                    <td className="p-4">{(s.grades.reduce((a, g) => a + g.grade, 0) / s.grades.length).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="grid grid-cols-2 gap-4">
            {teachers.map(t => (
              <div key={t.id} className="bg-slate-800 p-6 rounded-xl flex items-center gap-4">
                <div className="text-4xl">👨‍🏫</div>
                <div>
                  <div className="font-bold text-lg">{t.name}</div>
                  <div className="text-slate-400">{t.subject}</div>
                  <div className="text-cyan-400">{t.students} students</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="bg-slate-800 rounded-xl p-6">
            {['Mathematics', 'German', 'English', 'Physics', 'Chemistry'].map(subject => (
              <div key={subject} className="flex justify-between p-3 bg-slate-700 rounded-lg mb-2">
                <span>{subject}</span>
                <span className="text-green-400">{(1.5 + Math.random() * 1.5).toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="grid grid-cols-5 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
              <div key={day} className="text-center p-4 bg-slate-700 rounded-lg">
                <div className="font-bold">{day}</div>
                <div className="text-2xl text-green-400">{92 + Math.floor(Math.random() * 7)}%</div>
              </div>
            ))}
          </div>
        )}

        {selectedStudent && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-8" onClick={() => setSelectedStudent(null)}>
            <div className="bg-slate-800 p-8 rounded-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                  <p className="text-slate-400">{selectedStudent.id} • {selectedStudent.grade}</p>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="text-slate-400">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700 p-4 rounded-lg text-center">
                  <div className="text-3xl text-green-400">{selectedStudent.attendance}%</div>
                  <div className="text-sm text-slate-400">Attendance</div>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg text-center">
                  <div className="text-3xl text-cyan-400">{selectedStudent.behavior}%</div>
                  <div className="text-sm text-slate-400">Behavior</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-400">🟦 Powered by ARE-Logic • German Education Standard</div>
      </div>
    </div>
  );
}

export default SchoolPortalApp;