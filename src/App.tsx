import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Verification from "./pages/Verification.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import DashboardRouter from "./pages/dashboard/DashboardRouter.tsx";
import ProducerProfile from "./pages/dashboard/ProducerProfile.tsx";
import ProducerLots from "./pages/dashboard/ProducerLots.tsx";
import ProducerLotEdit from "./pages/dashboard/ProducerLotEdit.tsx";
import BuyerProfile from "./pages/dashboard/BuyerProfile.tsx";
import Discover from "./pages/dashboard/Discover.tsx";
import Favorites from "./pages/dashboard/Favorites.tsx";
import Messages from "./pages/dashboard/Messages.tsx";
import ConversationView from "./pages/dashboard/ConversationView.tsx";
import BaristaDashboard from "./pages/dashboard/BaristaDashboard.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/dashboard/producer" element={<ProducerProfile />} />
            <Route path="/dashboard/producer/lots" element={<ProducerLots />} />
            <Route path="/dashboard/producer/lots/new" element={<ProducerLotEdit />} />
            <Route path="/dashboard/producer/lots/:id" element={<ProducerLotEdit />} />
            <Route path="/dashboard/buyer" element={<BuyerProfile />} />
            <Route path="/dashboard/buyer/discover" element={<Discover />} />
            <Route path="/dashboard/buyer/favorites" element={<Favorites />} />
            <Route path="/dashboard/barista" element={<BaristaDashboard />} />
            <Route path="/dashboard/messages" element={<Messages />} />
            <Route path="/dashboard/messages/:id" element={<ConversationView />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
