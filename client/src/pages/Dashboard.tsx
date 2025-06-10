import Header from "@/components/layout/Header";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import AIMonitoringPanel from "@/components/dashboard/AIMonitoringPanel";
import RankingPanel from "@/components/dashboard/RankingPanel";
import EvaluationForm from "@/components/dashboard/EvaluationForm";
import ActivityTable from "@/components/dashboard/ActivityTable";

export default function Dashboard() {
  const handleNewMonitoring = () => {
    console.log("Creating new monitoring session...");
    // Navigate to monitoring creation page or open modal
  };

  return (
    <div className="p-6">
      <Header 
        title="Dashboard"
        subtitle="Visão geral do sistema de monitoria"
        action={{
          label: "Nova Monitoria",
          onClick: handleNewMonitoring
        }}
      />

      <div className="mt-6">
        <MetricsGrid />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <AIMonitoringPanel />
          <RankingPanel />
        </div>

        <EvaluationForm />
        <ActivityTable />
      </div>
    </div>
  );
}
