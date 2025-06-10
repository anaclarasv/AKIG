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

  // Check if user can create monitoring sessions - only supervisors and evaluators
  const canCreateMonitoring = user?.role === 'supervisor' || user?.role === 'evaluator';
  
  // Check if user can view activities
  const canViewActivities = user?.role !== 'agent';

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
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">Status</h3>
                <p className="text-lg font-semibold text-green-600">Ativo</p>
                <p className="text-sm text-green-700 mt-1">Pronto para avaliações</p>
              </div>
            </div>
          </div>

          {/* Performance and Contest Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Evolução de Desempenho</h3>
              <p className="text-muted-foreground">Gráfico de evolução será implementado em breve</p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Contestação de Avaliações</h3>
              <p className="text-muted-foreground">Sistema de contestação será implementado em breve</p>
            </div>
          </div>

          {/* Evaluation Section */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Formulário de Avaliação</h2>
            <EvaluationForm />
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

        <EvaluationForm />
        {canViewActivities && <ActivityTable />}
      </div>
    </div>
  );
}
