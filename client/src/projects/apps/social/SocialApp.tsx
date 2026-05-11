/**
 * Social Hub - Community Platform
 */

import React, { useState } from 'react';

export function SocialApp() {
  const [activeTab, setActiveTab] = useState('feed');
  const posts = [
    { id: 1, user: 'Hans M.', content: 'Great progress on the new module!', likes: 24, time: '2h ago' },
    { id: 2, user: 'Anna S.', content: 'Looking forward to the update', likes: 18, time: '3h ago' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">🌐 Social Hub</h1>
        <div className="flex gap-2 mb-6">
          {['feed', 'messages', 'notifications'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 rounded-lg ${activeTab === t ? 'bg-indigo-600' : 'bg-slate-800'}`}>{t}</button>
          ))}
        </div>
        <div className="space-y-4">
          {posts.map(p => (
            <div key={p.id} className="bg-slate-800 p-4 rounded-xl">
              <div className="font-bold">{p.user}</div>
              <div className="text-slate-300">{p.content}</div>
              <div className="flex justify-between mt-2 text-sm text-slate-400">
                <span>❤️ {p.likes}</span>
                <span>{p.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SocialApp;
