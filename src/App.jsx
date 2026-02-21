import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import VideoAdvertCreator from './pages/VideoAdvertCreator';
import SetupKeys from './pages/SetupKeys';
import CampaignsPage from './pages/CampaignsPage';
import CampaignsNewPage from './pages/CampaignsNewPage'; // New import
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0EDEE] to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0EDEE] to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <VideoAdvertCreator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/setup"
            element={
              <PublicRoute>
                <SetupKeys />
              </PublicRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <CampaignsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/new"
            element={
              <ProtectedRoute>
                <CampaignsNewPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
