import React, { useState, useEffect, useCallback } from 'react';

interface AppState {
  data: string[];
  isLoading: boolean;
  error: string | null;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    data: [],
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const response = await fetch('/api/data');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = (await response.json()) as string[];
      
      setState({
        data: result,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      setState({
        data: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      if (isMounted) {
        await fetchData();
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span>Loading...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        <span>Error: {state.error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Application Dashboard</h1>
      </header>
      <main>
        <ul className="space-y-2">
          {state.data && state.data.length > 0 ? (
            state.data.map((item: string, index: number) => (
              <li 
                key={`${index}-${item}`} 
                className="p-3 bg-white shadow rounded border border-gray-200"
              >
                {item}
              </li>
            ))
          ) : (
            <li className="p-3 text-gray-500 italic">No data available</li>
          )}
        </ul>
      </main>
    </div>
  );
};

export default App;