import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthCallback from "./pages/AuthCallback";
import AuthError from "./pages/AuthError";
import Converter from "./pages/Converter";
import Admin from "./pages/Admin";
import Banks from "./pages/Banks";
import Profits from "./pages/Profits";
import Withdraw from "./pages/Withdraw";
import Deposit from "./pages/Deposit";
import PaymentSuccess from "./pages/PaymentSuccess";
import HistoryPage from "./pages/History";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          <Route path="/converter" element={<Converter />} />
          <Route path="/converter/:pair" element={<Converter />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/banks" element={<Banks />} />
          <Route path="/profits" element={<Profits />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;