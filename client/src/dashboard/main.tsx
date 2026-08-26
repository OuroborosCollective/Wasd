import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tailwind.css';
import Dashboard from './Dashboard';

const root = document.getElementById('admin-dashboard-root');

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <Dashboard />
    </React.StrictMode>,
  );
}
