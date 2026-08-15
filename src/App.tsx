import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Account from "./pages/Account.tsx";
import CheckIn from "./pages/CheckIn.tsx";
import Calendar from "./pages/Calendar.tsx";
import Rewards from "./pages/Rewards.tsx";
import Ledger from "./pages/Ledger.tsx";
import Setup from "./pages/Setup.tsx";
import Shop from "./pages/Shop.tsx";
import CoinRules from "./pages/CoinRules.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <TooltipProvider>
      <Sonner position="bottom-right" closeButton />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Index />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/coin-rules" element={<CoinRules />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/account" element={<Account />} />
          </Route>
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
