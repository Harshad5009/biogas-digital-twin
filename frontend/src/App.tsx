import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { useWebSocket } from './hooks/useWebSocket';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

import { Dashboard } from './pages/Dashboard';
import { SensorsPage } from './pages/SensorsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnomalyPage } from './pages/AnomalyPage';
import { PredictionPage } from './pages/PredictionPage';
import { WhatIfPage } from './pages/WhatIfPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const { twinState, connected } = useWebSocket();

  return (
    <Router>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100vw',
          background: 'var(--bg-main)',
        }}
      >
        {/* Top Header Bar */}
        <Header twinState={twinState} connected={connected} />

        {/* Main Content Area: Sidebar + Body */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <Sidebar connected={connected} twinState={twinState} />

          <main
            style={{
              flex: 1,
              height: 'calc(100vh - 60px)',
              overflowY: 'auto',
              background: 'var(--bg-main)',
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard twinState={twinState} connected={connected} />} />
              <Route path="/twin" element={<Dashboard twinState={twinState} connected={connected} />} />

              <Route
                path="/sensors"
                element={<SensorsPage twinState={twinState} />}
              />

              <Route path="/history" element={<HistoryPage />} />
              <Route path="/analytics" element={<HistoryPage />} />

              <Route
                path="/prediction"
                element={<PredictionPage twinState={twinState} />}
              />

              <Route
                path="/anomalies"
                element={<AnomalyPage twinState={twinState} />}
              />

              <Route
                path="/whatif"
                element={<WhatIfPage twinState={twinState} />}
              />

              <Route path="/reports" element={<HistoryPage />} />

              <Route
                path="/settings"
                element={
                  <SettingsPage
                    twinState={twinState}
                    connected={connected}
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
