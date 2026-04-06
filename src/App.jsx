import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CommandCenterProvider } from '@/contexts/CommandCenterContext';
import ChatBubble from '@/components/command-center/ChatBubble';
import CommandCenterPage from './pages/CommandCenterPage';

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
import QueuePage from './pages/QueuePage';
import LongformWorkbenchPage from './pages/LongformWorkbenchPage';
import PublishQueuePage from './pages/PublishQueuePage';
import ProposalPage from './pages/ProposalPage';
import ProposalsIndexPage from './pages/ProposalsIndexPage';
import MovinMartinMockupPage from './pages/MovinMartinMockupPage';
import LinkedInPage from './pages/LinkedInPage';
import LinkedInPostEditor from './components/linkedin/LinkedInPostEditor';
import CarouselPage from './pages/CarouselPage';
import StoryboardsPage from './pages/StoryboardsPage';
import StoryboardGuidePage from './pages/StoryboardGuidePage';
import StoryboardWorkspace from './pages/StoryboardWorkspace';
import StoryboardReviewPage from './pages/StoryboardReviewPage';
import SettingsAccountsPage from './pages/SettingsAccountsPage';
import AdsManagerPage from './pages/AdsManagerPage';
import AdCampaignEditor from './pages/AdCampaignEditor';
import LoraGuidePage from './pages/LoraGuidePage';
import TurnaroundGuidePage from './pages/TurnaroundGuidePage';
import CarouselGuidePage from './pages/CarouselGuidePage';
import AdsManagerGuidePage from './pages/AdsManagerGuidePage';
import MotionTransferGuidePage from './pages/MotionTransferGuidePage';
import SetupKeys from './pages/SetupKeys';
import EducatePage from './pages/EducatePage';
import LearnPage from './pages/LearnPage';
import FlowsListPage from './pages/FlowsListPage';
import FlowBuilderPage from './pages/FlowBuilderPage';
import AdDiscoveryPage from './pages/AdDiscoveryPage';
import AdIntelligencePage from './pages/AdIntelligencePage';
import AgencyPage from './pages/AgencyPage';
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
      <ThemeProvider>
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

          {/* Public storyboard review — no auth */}
          <Route path="/review/:token" element={<StoryboardReviewPage />} />

          {/* Public proposal pages — no auth, isolated from app */}
          <Route path="/proposal" element={<Navigate to="/proposal/hamilton-city-council" replace />} />
          <Route path="/proposals/movin-martin-website-mockup" element={<MovinMartinMockupPage />} />
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
            path="/queue"
            element={
              <ProtectedRoute>
                <QueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/longform/workbench"
            element={
              <ProtectedRoute>
                <LongformWorkbenchPage />
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

          <Route path="/storyboards/guide" element={<Navigate to="/learn?tab=storyboards" replace />} />
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

          <Route path="/ads/intelligence" element={<ProtectedRoute><AdIntelligencePage /></ProtectedRoute>} />
          <Route path="/ads/discover" element={<ProtectedRoute><AdIntelligencePage /></ProtectedRoute>} />
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

          {/* Command Center */}
          <Route path="/command-center" element={<ProtectedRoute><CommandCenterPage /></ProtectedRoute>} />

          {/* Unified learn page */}
          <Route
            path="/learn"
            element={
              <ProtectedRoute>
                <LearnPage />
              </ProtectedRoute>
            }
          />

          {/* Motion Transfer guide — also accessible via /learn?tab=motion */}
          <Route path="/motion" element={<Navigate to="/learn?tab=motion" replace />} />

          {/* Redirects from old guide routes to /learn */}
          <Route path="/lora" element={<Navigate to="/learn?tab=lora" replace />} />
          <Route path="/carousel-educate" element={<Navigate to="/learn?tab=carousels" replace />} />
          <Route path="/turnaround-educate" element={<Navigate to="/learn?tab=turnaround" replace />} />
          <Route path="/adsmanager-educate" element={<Navigate to="/learn?tab=ads" replace />} />
          <Route path="/educate" element={<Navigate to="/learn" replace />} />
          <Route path="/video-production" element={<Navigate to="/learn?tab=video" replace />} />

          <Route
            path="/settings/accounts"
            element={
              <ProtectedRoute>
                <SettingsAccountsPage />
              </ProtectedRoute>
            }
          />

          {/* Agency Mode */}
          <Route path="/agency" element={<ProtectedRoute><AgencyPage /></ProtectedRoute>} />

          {/* Automation Flows */}
          <Route path="/flows" element={<ProtectedRoute><FlowsListPage /></ProtectedRoute>} />
          <Route path="/flows/new" element={<ProtectedRoute><FlowBuilderPage /></ProtectedRoute>} />
          <Route path="/flows/:id" element={<ProtectedRoute><FlowBuilderPage /></ProtectedRoute>} />
          <Route path="/flows/:id/run/:executionId" element={<ProtectedRoute><FlowBuilderPage /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" />
        <AuthenticatedChatBubble />
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

// Only render the chat bubble for authenticated users with API keys
function AuthenticatedChatBubble() {
  const { user, hasKeys } = useAuth();
  if (!user || !hasKeys) return null;
  return (
    <CommandCenterProvider>
      <ChatBubble />
    </CommandCenterProvider>
  );
}

export default App;
