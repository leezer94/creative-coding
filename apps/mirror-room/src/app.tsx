import { Navigate, Route, Routes } from 'react-router-dom';
import GuestPage from '@/routes/guest-page';
import HostPage from '@/routes/host-page';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HostPage />} />
      <Route path="/g/:sessionId" element={<GuestPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
