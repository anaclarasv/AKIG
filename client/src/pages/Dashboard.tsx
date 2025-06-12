import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Header from "@/components/layout/Header";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import AIMonitoringPanel from "@/components/dashboard/AIMonitoringPanel";
import RankingPanel from "@/components/dashboard/RankingPanel";
import EvaluationForm from "@/components/dashboard/EvaluationForm";
import ActivityTable from "@/components/dashboard/ActivityTable";
import AgentPerformanceChart from "@/components/dashboard/AgentPerformanceChart";
import AgentContestPanel from "@/components/dashboard/AgentContestPanel";
import AgentEvaluationSummary from "@/components/dashboard/AgentEvaluationSummary";
import TeamRankingPanel from "@/components/dashboard/TeamRankingPanel";
import TeamPerformanceChart from "@/components/dashboard/TeamPerformanceChart";


export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const handleNewMonitoring = () => {
    setLocation("/monitoring");
  };

  // Check if user can create monitoring sessions - only supervisors and evaluators
  const canCreateMonitoring = user?.role === 'supervisor' || user?.role === 'evaluator';
  
  // Check if user can view activities
  const canViewActivities = user?.role !== 'agent';
  
  // Check if user should see evaluation form (only supervisors)
  const canViewEvaluationForm = user?.role === 'supervisor';

  // Agent-specific dashboard
  if (user?.role === 'agent') {
    return (
      <div className="p-6">
        <Header 
          title="Painel do Atendente"
          subtitle={`Bem-vindo, ${user.firstName}! Acompanhe seu desempenho e avaliações`}
        />

        <div className="mt-6 space-y-8">
          {/* Personal Performance Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <RankingPanel />
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Suas Moedas Virtuais</h3>
                <p className="text-3xl font-bold text-blue-600">{user.virtualCoins || 0}</p>
                <p className="text-sm text-blue-700 mt-1">Acumuladas no total</p>
              </div>
              <AgentEvaluationSummary />
            </div>
          </div>

          {/* Performance and Contest Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AgentPerformanceChart />
            <AgentContestPanel />
          </div>


        </div>
      </div>
    );
  }

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

        {/* Team Management Section for Supervisors */}
        {user?.role === 'supervisor' && (
          <div className="mt-8 space-y-6">
            <TeamRankingPanel />
            <TeamPerformanceChart />
          </div>
        )}
        {canViewActivities && <ActivityTable />}
      </div>
    </div>
  );
}
