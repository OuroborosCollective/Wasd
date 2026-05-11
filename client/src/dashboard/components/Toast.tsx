/**
 * @file client/src/dashboard/components/Toast.tsx
 * @description Toast notifications for evolution events
 */

import { useState, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleAlert = (e: CustomEvent) => {
      const event = e.detail;
      const message = `Region ${event.regionId}: ${event.previousPhase} → ${event.newPhase}`;
      
      const type = event.newPhase.includes('COLLAPSE') ? 'error' :
                  event.newPhase.includes('CRITICAL') ? 'warning' :
                  event.newPhase.includes('STABLE') ? 'success' : 'info';

      const id = `${event.regionId}-${Date.now()}`;
      setToasts(prev => [...prev, { id, message, type }]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };

    window.addEventListener('evolution-alert', handleAlert as EventListener);
    return () => window.removeEventListener('evolution-alert', handleAlert as EventListener);
  }, []);

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'error': return 'bg-red-900/90 border-red-500 text-red-100';
      case 'warning': return 'bg-orange-900/90 border-orange-500 text-orange-100';
      case 'success': return 'bg-green-900/90 border-green-500 text-green-100';
      default: return 'bg-blue-900/90 border-blue-500 text-blue-100';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg border-l-4 shadow-lg animate-slide-in ${getToastStyles(toast.type)}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {toast.type === 'error' ? '💀' : 
               toast.type === 'warning' ? '⚠️' : 
               toast.type === 'success' ? '✅' : '📡'}
            </span>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}