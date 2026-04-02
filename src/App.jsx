import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Silence all non-error toasts — only show toast.error() and toast.warning()
toast.success = () => {};
toast.info = () => {};
import HomePage from './pages/HomePage';
import VideoAdvertCreator from './pages/VideoAdvertCreator';
import CampaignsPage from './pages/CampaignsPage';
import CampaignsNewPage from './pages/CampaignsNewPage';
import TemplatesPage from './pages/TemplatesPage';
import CostDashboardPage from './pages/CostDashboardPage';
import ShortsWizardPage from './pages/ShortsWizardPage';
import ShortsDraftPage from './pages/ShortsDraftPage';
import ShortsWorkbenchPage from './pages/ShortsWorkbenchPage';
import BatchQueuePage from './pages/BatchQueuePage';
import PublishQueuePage from './pages/PublishQueuePage';
import ProposalPage from './pages/ProposalPage';
import ProposalsIndexPage from './pages/ProposalsIndexPage';
import LinkedInPage from './pages/LinkedInPage';
import LinkedInPostEditor from './components/linkedin/LinkedInPostEditor';
import CarouselPage from './pages/CarouselPage';
import StoryboardsPage from './pages/StoryboardsPage';
import StoryboardGuidePage from './pages/StoryboardGuidePage';
import StoryboardWorkspace from './pages/StoryboardWorkspace';
import SettingsAccountsPage from './pages/SettingsAccountsPage';
import AdsManagerPage from './pages/AdsManagerPage';
import AdCampaignEditor from './pages/AdCampaignEditor';
import LoraGuidePage from './pages/LoraGuidePage';
import TurnaroundGuidePage from './pages/TurnaroundGuidePage';
import CarouselGuidePage from './pages/CarouselGuidePage';
import SetupKeys from './pages/SetupKeys';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading, hasKeys } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasKeys === false) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const { user, loading, hasKeys } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (user && hasKeys) {
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

          {/* Login / signup + API key setup */}
          <Route path="/login" element={<SetupKeys />} />
          <Route path="/setup" element={<Navigate to="/login" replace />} />

          {/* Public proposal pages — no auth, isolated from app */}
          <Route path="/proposal" element={<Navigate to="/proposal/hamilton-city-council" replace />} />
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
            path="/shorts/workbench"
            element={
              <ProtectedRoute>
                <ShortsWorkbenchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shorts/batch"
            element={
              <ProtectedRoute>
                <BatchQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shorts/batch/:batchId"
            element={
              <ProtectedRoute>
                <BatchQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/publish"
            element={
              <ProtectedRoute>
                <PublishQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shorts/new"
            element={<Navigate to="/shorts/workbench" replace />}
          />
          <Route
            path="/shorts/draft/:draftId"
            element={
              <ProtectedRoute>
                <ShortsDraftPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/linkedin"
            element={
              <ProtectedRoute>
                <LinkedInPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/linkedin/:id"
            element={
              <ProtectedRoute>
                <LinkedInPostEditor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/carousels/:id"
            element={
              <ProtectedRoute>
                <CarouselPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/carousels"
            element={
              <ProtectedRoute>
                <CarouselPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/storyboards/guide"
            element={
              <ProtectedRoute>
                <StoryboardGuidePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storyboards/:id"
            element={
              <ProtectedRoute>
                <StoryboardWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storyboards"
            element={
              <ProtectedRoute>
                <StoryboardsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ads"
            element={
              <ProtectedRoute>
                <AdsManagerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ads/:id"
            element={
              <ProtectedRoute>
                <AdCampaignEditor />
              </ProtectedRoute>
            }
          />

          {/* Admin guide — password-gated internally, no Supabase auth needed */}
          <Route path="/lora" element={<LoraGuidePage />} />
          <Route
            path="/carousel-educate"
            element={
              <ProtectedRoute>
                <CarouselGuidePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/turnaround-educate"
            element={
              <ProtectedRoute>
                <TurnaroundGuidePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings/accounts"
            element={
              <ProtectedRoute>
                <SettingsAccountsPage />
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
