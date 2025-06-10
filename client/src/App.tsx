import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Monitoring from "@/pages/Monitoring";
import Evaluations from "@/pages/Evaluations";
import Ranking from "@/pages/Ranking";
import Reports from "@/pages/Reports";
import Companies from "@/pages/Companies";
import Users from "@/pages/Users";
import EvaluationCriteria from "@/pages/EvaluationCriteria";
import Campaigns from "@/pages/Campaigns";
import RewardsStore from "@/pages/RewardsStore";
import LGPDCompliance from "@/pages/LGPDCompliance";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ProtectedRoute from "@/components/ProtectedRoute";



function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-shimmer w-32 h-8 rounded"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/monitoring" component={() => (
              <ProtectedRoute allowedRoles={['admin', 'supervisor', 'evaluator']}>
                <Monitoring />
              </ProtectedRoute>
            )} />
            <Route path="/evaluations" component={Evaluations} />
            <Route path="/evaluation-criteria">
              <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                <EvaluationCriteria />
              </ProtectedRoute>
            </Route>
            <Route path="/ranking" component={Ranking} />
            <Route path="/reports">
              <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                <Reports />
              </ProtectedRoute>
            </Route>
            <Route path="/campaigns">
              <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                <Campaigns />
              </ProtectedRoute>
            </Route>
            <Route path="/rewards" component={RewardsStore} />
            <Route path="/companies">
              <ProtectedRoute allowedRoles={['admin']}>
                <Companies />
              </ProtectedRoute>
            </Route>
            <Route path="/users">
              <ProtectedRoute allowedRoles={['admin']}>
                <Users />
              </ProtectedRoute>
            </Route>
            <Route path="/lgpd" component={LGPDCompliance} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
