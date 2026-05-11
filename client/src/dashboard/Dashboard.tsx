/**
 * @file client/src/dashboard/Dashboard.tsx
 * @description Main Dashboard page - Sci-Fi themed monitoring interface
 */

import { WorldProvider } from './context/WorldContext';
import { WorldStatusHeader } from './components/WorldStatusHeader';
import { RegionGrid } from './components/RegionGrid';
import { EventLog } from './components/EventLog';
import { ToastContainer } from './components/Toast';

function DashboardContent() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Arelorian Engine Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Real-time world state monitoring
        </p>
      </header>

      {/* World Status Header */}
      <WorldStatusHeader />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Region Grid - Takes 3 columns */}
        <div className="lg:col-span-3">
          <h2 className="text-xl font-bold text-gray-300 mb-3 flex items-center gap-2">
            <span className="text-xl">🗺️</span> Regions
          </h2>
          <RegionGrid />
        </div>

        {/* Event Log - Takes 1 column */}
        <div className="lg:col-span-1">
          <EventLog />
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export function Dashboard() {
  return (
    <WorldProvider>
      <DashboardContent />
    </WorldProvider>
  );
}

export default Dashboard;