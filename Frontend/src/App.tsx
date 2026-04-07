/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Overview from './Overview';
import PlaceholderPage from './PlaceholderPage';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bg-primary text-text-primary font-sans selection:bg-[#a3e635] selection:text-black flex">
          <Routes>
            <Route path="/" element={<Dashboard />}>
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="smart-planner" element={<PlaceholderPage title="Smart Planner" />} />
              <Route path="exercises" element={<PlaceholderPage title="Exercises" />} />
              <Route path="diet-plan" element={<PlaceholderPage title="Diet Plan" />} />
              <Route path="workout-timer" element={<PlaceholderPage title="Workout Timer" />} />
              <Route path="goals" element={<PlaceholderPage title="Goals" />} />
              <Route path="achievements" element={<PlaceholderPage title="Achievements" />} />
              <Route path="workout-builder" element={<PlaceholderPage title="Workout Builder" />} />
              <Route path="progress" element={<PlaceholderPage title="Progress" />} />
              <Route path="admin-panel" element={<PlaceholderPage title="Admin Panel" />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
