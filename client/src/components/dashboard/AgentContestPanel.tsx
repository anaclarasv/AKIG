import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageSquare, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AgentContestPanel() {
  const { user } = useAuth();

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['/api/my-evaluations'],
    enabled: user?.role === 'agent',
  });

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <CardContent className="pt-6">
          <div className="animate-pulse h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const signedEvaluations = evaluations.filter((evaluation: any) => evaluation.status === 'signed');
  const pendingEvaluations = evaluations.filter((evaluation: any) => evaluation.status === 'pending');
  const totalEvaluations = evaluations.length;

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-600" />
          Contestação de Avaliações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                {totalEvaluations}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">Total</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-lg font-bold text-green-800 dark:text-green-200">
                {signedEvaluations.length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-300">Assinadas</p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                {pendingEvaluations.length}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-300">Pendentes</p>
            </div>
          </div>

          {/* Available Actions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Ações Disponíveis</h4>
            
            {signedEvaluations.length > 0 ? (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Você pode contestar avaliações assinadas
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                      {signedEvaluations.length} avaliação(ões) disponível(eis) para contestação
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                  onClick={() => {
                    window.location.href = '/my-evaluations';
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Minhas Avaliações
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Nenhuma avaliação assinada ainda
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      As contestações estarão disponíveis após você assinar suas avaliações
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contest Process Info */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Como Funciona</h4>
            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Assine a avaliação na página "Minhas Avaliações"</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>Clique em "Contestar" se discordar da avaliação</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Aguarde a análise do supervisor</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}