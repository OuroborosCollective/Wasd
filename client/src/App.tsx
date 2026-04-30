import React from 'react';
import { SharedComponent } from '@app/shared';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <h1>Welcome to the Application</h1>
      <SharedComponent />
    </div>
  );
};

export default App;