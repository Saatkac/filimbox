import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminSettingsProvider } from "@/hooks/useAdminSettings";
import ProtectedRoute from "./components/ProtectedRoute";
import { ExtensionPopup } from "./components/ExtensionPopup";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import { PageSkeleton } from "./components/ContentSkeleton";

// Eager: landing + 404 for fast first paint
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy: route-level code splitting cuts initial bundle significantly
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const Categories = lazy(() => import("./pages/Categories"));
const Search = lazy(() => import("./pages/Search"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Favorites = lazy(() => import("./pages/Favorites"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AdminSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ExtensionPopup />
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/movie/:id" element={<MovieDetail />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/search" element={<Search />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/account-settings" element={<AccountSettings />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AdminSettingsProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
