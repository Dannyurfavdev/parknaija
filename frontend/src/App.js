import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/ui/Navbar';
import HomePage        from './pages/HomePage';
import FindParkingPage from './pages/FindParkingPage';
import MapPage         from './pages/MapPage';
import SubmitSpacePage from './pages/SubmitSpacePage';
import ExtractPage     from './pages/ExtractPage';
import AdminPage       from './pages/AdminPage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1c1c1c',
              color: '#f0f0f0',
              border: '1px solid #2a2a2a',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9rem',
            },
            success: { iconTheme: { primary: '#b8f225', secondary: '#0a0a0a' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#0a0a0a' } },
          }}
        />
        <Navbar />
        <Routes>
          <Route path="/"         element={<HomePage />} />
          <Route path="/find"     element={<FindParkingPage />} />
          <Route path="/map"      element={<MapPage />} />
          <Route path="/submit"   element={<SubmitSpacePage />} />
          <Route path="/extract"  element={<ExtractPage />} />
          <Route path="/admin"    element={<AdminPage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
