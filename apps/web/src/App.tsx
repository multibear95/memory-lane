import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<p style={{ padding: '2rem' }}>Not found</p>} />
    </Routes>
  );
}
