import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewLive from "./pages/InterviewLive";
import FeedbackDashboard from "./pages/FeedbackDashboard";
import NotFound from "./pages/NotFound";
import AuthComplete from "./pages/AuthComplete";
import ResetPassword from "./pages/ResetPassword";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import SchedulePractice from "./pages/SchedulePractice";
import RequireAuth from "@/components/RequireAuth";
import { InterviewProvider } from "@/lib/InterviewContext";
import { AuthProvider } from "@/lib/AuthContext";
import { GoogleDriveProvider } from "@/lib/GoogleDriveContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GoogleDriveProvider>
        <TooltipProvider>
          <InterviewProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/auth/complete" element={<AuthComplete />} />
            <Route path="/auth/reset" element={<ResetPassword />} />
            <Route path="/google-auth-callback" element={<GoogleAuthCallback />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/interview-setup" element={<RequireAuth><InterviewSetup /></RequireAuth>} />
            <Route path="/start-session" element={<RequireAuth><InterviewSetup /></RequireAuth>} />
            <Route path="/interview-live" element={<RequireAuth><InterviewLive /></RequireAuth>} />
            <Route path="/feedback" element={<RequireAuth><FeedbackDashboard /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/schedule-practice" element={<RequireAuth><SchedulePractice /></RequireAuth>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </InterviewProvider>
    </TooltipProvider>
      </GoogleDriveProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
