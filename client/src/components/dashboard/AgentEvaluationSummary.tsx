import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Bell, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export default function AgentEvaluationSummary() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: evaluations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/my-evaluations'],
    enabled: user?.role === 'agent',
  });

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
        <div className="animate-pulse h-20 bg-green-100 rounded"></div>
      </div>
    );
  }

  const pendingEvaluations = Array.isArray(evaluations) ? evaluations.filter((e: any) => e.status === 'pending') : [];
  const signedEvaluations = Array.isArray(evaluations) ? evaluations.filter((e: any) => e.status === 'signed') : [];
  const totalEvaluations = Array.isArray(evaluations) ? evaluations.length : 0;

  const hasPendingEvaluations = pendingEvaluations.length > 0;

  return (
    <div className={`bg-gradient-to-r p-6 rounded-lg border ${
      hasPendingEvaluations 
        ? 'from-yellow-50 to-orange-50 border-yellow-200' 
        : 'from-green-50 to-emerald-50 border-green-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {hasPendingEvaluations ? (
            <Bell className="w-5 h-5 text-yellow-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          <h3 className={`font-semibold ${
            hasPendingEvaluations ? 'text-yellow-900' : 'text-green-900'
          }`}>
            Minhas Avaliações
          </h3>
        </div>
        {hasPendingEvaluations && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-yellow-700 font-medium">
              {pendingEvaluations.length} pendente{pendingEvaluations.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white bg-opacity-50 p-2 rounded">
            <p className="text-lg font-bold text-gray-800">{totalEvaluations}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <div className="bg-white bg-opacity-50 p-2 rounded">
            <p className="text-lg font-bold text-yellow-800">{pendingEvaluations.length}</p>
            <p className="text-xs text-yellow-600">Pendentes</p>
          </div>
          <div className="bg-white bg-opacity-50 p-2 rounded">
            <p className="text-lg font-bold text-green-800">{signedEvaluations.length}</p>
            <p className="text-xs text-green-600">Assinadas</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setLocation('/my-evaluations')}
          className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            hasPendingEvaluations
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {hasPendingEvaluations ? (
            <span className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Revisar Avaliações Pendentes
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Ver Todas as Avaliações
            </span>
          )}
        </button>

        {/* Status Description */}
        <p className={`text-xs text-center ${
          hasPendingEvaluations ? 'text-yellow-700' : 'text-green-700'
        }`}>
          {hasPendingEvaluations
            ? `Você tem ${pendingEvaluations.length} avaliação(ões) aguardando sua assinatura`
            : 'Todas as suas avaliações estão em dia'
          }
        </p>
      </div>
    </div>
  );
}