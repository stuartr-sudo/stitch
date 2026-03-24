import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import HomePage from './pages/HomePage';
import VideoAdvertCreator from './pages/VideoAdvertCreator';
import CampaignsPage from './pages/CampaignsPage';
import CampaignsNewPage from './pages/CampaignsNewPage';
import TemplatesPage from './pages/TemplatesPage';
import CostDashboardPage from './pages/CostDashboardPage';
import ShortsWizardPage from './pages/ShortsWizardPage';
import ShortsDraftPage from './pages/ShortsDraftPage';
import ProposalPage from './pages/ProposalPage';
import ProposalsIndexPage from './pages/ProposalsIndexPage';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/studio" replace />;
  }

  return children;
}

function YouTubeRedirectHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('youtube_connected') === '1') {
      toast.success(`YouTube connected for ${searchParams.get('brand') || 'brand'}!`);
      navigate(window.location.pathname, { replace: true });
    }
    if (searchParams.get('youtube_error')) {
      toast.error(`YouTube connection failed: ${searchParams.get('youtube_error')}`);
      navigate(window.location.pathname, { replace: true });
    }
  }, [searchParams, navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <YouTubeRedirectHandler />
        <Routes>
          {/* Public home / login */}
          <Route
            path="/"
            element={
              <GuestRoute>
                <HomePage />
              </GuestRoute>
            }
          />

          {/* Legacy /setup alias */}
          <Route path="/setup" element={<Navigate to="/" replace />} />

          {/* Public proposal pages — no auth, isolated from app */}
          <Route path="/proposals" element={<Navigate to="/proposal/hamilton-city-council" replace />} />
          <Route path="/proposal/hamilton-city-council" element={<ProposalPage />} />

          {/* Protected studio */}
          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <VideoAdvertCreator />
              </ProtectedRoute>
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

          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <TemplatesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/costs"
            element={
              <ProtectedRoute>
                <CostDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/shorts/new"
            element={<Navigate to="/campaigns/new?type=shorts" replace />}
          />
          <Route
            path="/shorts/draft/:draftId"
            element={
              <ProtectedRoute>
                <ShortsDraftPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
