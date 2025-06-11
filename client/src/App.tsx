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
import EvaluationsFixed from "@/pages/EvaluationsFixed";
import Ranking from "@/pages/Ranking";
import Reports from "@/pages/Reports";
import Companies from "@/pages/Companies";
import Users from "@/pages/Users";
import EvaluationCriteria from "@/pages/EvaluationCriteria";
import Campaigns from "@/pages/Campaigns";
import RewardsStore from "@/pages/RewardsStore";
import LGPDCompliance from "@/pages/LGPDCompliance";
import MyEvaluations from "@/pages/MyEvaluations";
import ArchivedSessions from "@/pages/ArchivedSessions";
import TestEvaluationForm from "@/pages/TestEvaluationForm";
import SimpleTestForm from "@/pages/SimpleTestForm";
import MonitoringDetails from "@/pages/MonitoringDetails";
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
        <Route path="/demo-evaluation" component={SimpleTestForm} />
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
            <Route path="/evaluations" component={EvaluationsFixed} />
            <Route path="/my-evaluations" component={() => (
              <ProtectedRoute allowedRoles={['agent']}>
                <MyEvaluations />
              </ProtectedRoute>
            )} />
            <Route path="/evaluation-criteria" component={() => (
              <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                <EvaluationCriteria />
              </ProtectedRoute>
            )} />
            <Route path="/ranking" component={Ranking} />
            <Route path="/reports" component={() => (
              <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                <Reports />
              </ProtectedRoute>
            )} />
            <Route path="/campaigns" component={() => (
              <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                <Campaigns />
              </ProtectedRoute>
            )} />
            <Route path="/rewards" component={RewardsStore} />
            <Route path="/companies" component={() => (
              <ProtectedRoute allowedRoles={['admin']}>
                <Companies />
              </ProtectedRoute>
            )} />
            <Route path="/users" component={() => (
              <ProtectedRoute allowedRoles={['admin']}>
                <Users />
              </ProtectedRoute>
            )} />
            <Route path="/lgpd" component={LGPDCompliance} />
            <Route path="/archived-sessions" component={() => (
              <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                <ArchivedSessions />
              </ProtectedRoute>
            )} />
            <Route path="/test-evaluation" component={() => (
              <ProtectedRoute allowedRoles={['admin', 'evaluator']}>
                <TestEvaluationForm />
              </ProtectedRoute>
            )} />
            <Route path="/monitoring/:id" component={() => (
              <ProtectedRoute allowedRoles={['admin', 'supervisor', 'agent']}>
                <MonitoringDetails />
              </ProtectedRoute>
            )} />
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
