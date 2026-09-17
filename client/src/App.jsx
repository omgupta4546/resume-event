import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentPage from './pages/StudentPage';
import PresenterPage from './pages/PresenterPage';
import AdminPage from './pages/AdminPage';
import ResultsPage from './pages/ResultsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/student" element={<StudentPage />} />
        <Route path="/presenter" element={<PresenterPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
