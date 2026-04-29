import React from 'react';
import OuroborosInterface from './components/OuroborosInterface';

const App: React.FC = () => {
    return (
        <>
            <style>
                {`
                    * {
                        box-sizing: border-box;
                    }
                    body, html {
                        margin: 0;
                        padding: 0;
                        width: 100vw;
                        height: 100vh;
                        overflow: hidden;
                        background-color: #000;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    }
                    #root {
                        width: 100%;
                        height: 100%;
                    }
                `}
            </style>
            <OuroborosInterface />
        </>
    );
};

export default App;