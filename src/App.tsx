import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import CheckIn from "./pages/CheckIn.tsx";
import Calendar from "./pages/Calendar.tsx";
import Rewards from "./pages/Rewards.tsx";
import Ledger from "./pages/Ledger.tsx";
import Setup from "./pages/Setup.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="bottom-right" closeButton />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
            <Route path="/setup" element={<Setup />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
