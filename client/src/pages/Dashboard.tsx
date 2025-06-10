import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Header from "@/components/layout/Header";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import AIMonitoringPanel from "@/components/dashboard/AIMonitoringPanel";
import RankingPanel from "@/components/dashboard/RankingPanel";
import EvaluationForm from "@/components/dashboard/EvaluationForm";
import ActivityTable from "@/components/dashboard/ActivityTable";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const handleNewMonitoring = () => {
    setLocation("/monitoring");
  };

  // Check if user can create monitoring sessions
  const canCreateMonitoring = user?.role === 'admin' || user?.role === 'evaluator';
  
  // Check if user can view activities
  const canViewActivities = user?.role !== 'agent';

  return (
    <div className="p-6">
      <Header 
        title="Dashboard"
        subtitle="Visão geral do sistema de monitoria"
        action={canCreateMonitoring ? {
          label: "Nova Monitoria",
          onClick: handleNewMonitoring
        } : undefined}
      />

      <div className="mt-6">
        <MetricsGrid />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {canViewActivities && <AIMonitoringPanel />}
          <RankingPanel />
        </div>

        <EvaluationForm />
        {canViewActivities && <ActivityTable />}
      </div>
    </div>
  );
}
