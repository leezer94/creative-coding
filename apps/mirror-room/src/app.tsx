import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const HostPage = lazy(() => import('@/routes/host-page'));
const GuestPage = lazy(() => import('@/routes/guest-page'));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HostPage />} />
        <Route path="/g/:sessionId" element={<GuestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
