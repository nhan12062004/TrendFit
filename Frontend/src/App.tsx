import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Dashboard from './Dashboard';
import Overview from './Overview';
import WorkoutBuilder from './WorkoutBuilder';
import DietPlan from './DietPlan';
import Exercises from './Exercises';
import WorkoutTimer from './WorkoutTimer';
import Goals from './Goals';

const PlaceholderPage = lazy(() => import('./PlaceholderPage'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen w-full bg-bg-primary text-text-primary font-sans selection:bg-[#a3e635] selection:text-black flex">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Dashboard />}>
                <Route index element={<Navigate to="/overview" replace />} />
                <Route path="overview" element={<Overview />} />
                <Route path="smart-planner" element={<PlaceholderPage title="Lập kế hoạch AI" />} />
                <Route path="exercises" element={<Exercises />} />
                <Route path="diet-plan" element={<DietPlan />} />
                <Route path="workout-timer" element={<WorkoutTimer />} />
                <Route path="goals" element={<Goals />} />
                <Route path="achievements" element={<PlaceholderPage title="Thành tích" />} />
                <Route path="workout-builder" element={<WorkoutBuilder />} />
                <Route path="progress" element={<PlaceholderPage title="Tiến độ" />} />
                <Route path="admin-panel" element={<PlaceholderPage title="Quản trị viên" />} />
              </Route>
            </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
