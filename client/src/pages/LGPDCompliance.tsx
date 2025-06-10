import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Shield, 
  Download, 
  Edit, 
  Trash2, 
  FileText, 
  Lock, 
  Eye,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function LGPDCompliance() {
  const { toast } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Buscar dados de consentimento
  const { data: consentData, isLoading: loadingConsent } = useQuery({
    queryKey: ["/api/lgpd/consent"],
  });

  // Buscar relatório de atividades
  const { data: activityReport, isLoading: loadingReport } = useQuery({
    queryKey: ["/api/lgpd/activity-report"],
  });

  // Mutação para exportar dados
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/lgpd/export-data");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Dados exportados",
        description: `Seus dados foram preparados para download. ID: ${data.exportId}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir dados
  const deleteDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/lgpd/delete-data", {
        confirmation: deleteConfirmation,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dados excluídos",
        description: "Todos os seus dados foram removidos permanentemente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error) => {
      toast({
        title: "Erro na exclusão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para revogar consentimento
  const revokeConsentMutation = useMutation({
    mutationFn: async (consentType: string) => {
      const response = await apiRequest("POST", "/api/lgpd/revoke-consent", {
        consentType,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consentimento revogado",
        description: "Suas preferências foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lgpd/consent"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao revogar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conformidade LGPD</h1>
        <p className="text-muted-foreground">
          Gerencie seus dados pessoais e exercite seus direitos conforme a Lei Geral de Proteção de Dados
        </p>
      </div>

      <Tabs defaultValue="rights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rights">Meus Direitos</TabsTrigger>
          <TabsTrigger value="consent">Consentimentos</TabsTrigger>
          <TabsTrigger value="activity">Atividades</TabsTrigger>
          <TabsTrigger value="data">Gestão de Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="rights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Seus Direitos LGPD
              </CardTitle>
              <CardDescription>
                A Lei Geral de Proteção de Dados garante os seguintes direitos sobre seus dados pessoais:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-medium">Acesso aos Dados</h4>
                    <p className="text-sm text-muted-foreground">
                      Confirmação sobre o tratamento e acesso aos seus dados
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Edit className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-medium">Correção</h4>
                    <p className="text-sm text-muted-foreground">
                      Correção de dados incompletos, inexatos ou desatualizados
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-purple-500 mt-1" />
                  <div>
                    <h4 className="font-medium">Portabilidade</h4>
                    <p className="text-sm text-muted-foreground">
                      Portabilidade dos dados a outro fornecedor
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-red-500 mt-1" />
                  <div>
                    <h4 className="font-medium">Exclusão</h4>
                    <p className="text-sm text-muted-foreground">
                      Eliminação dos dados tratados com consentimento
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Consentimentos</CardTitle>
              <CardDescription>
                Visualize e gerencie suas autorizações para tratamento de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConsent ? (
                <div>Carregando consentimentos...</div>
              ) : (
                <div className="space-y-4">
                  {consentData?.consent && Object.entries(consentData.consent).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                        <p className="text-sm text-muted-foreground">
                          {key === 'marketing' && 'Receber comunicações promocionais'}
                          {key === 'analytics' && 'Análise de desempenho e métricas'}
                          {key === 'notifications' && 'Notificações do sistema'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={value ? "default" : "secondary"}>
                          {value ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Autorizado</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Revogado</>
                          )}
                        </Badge>
                        {value && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeConsentMutation.mutate(key)}
                            disabled={revokeConsentMutation.isPending}
                          >
                            Revogar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório de Atividades de Tratamento
              </CardTitle>
              <CardDescription>
                Transparência sobre como seus dados são utilizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReport ? (
                <div>Carregando relatório...</div>
              ) : (
                <div className="space-y-6">
                  {activityReport?.dataProcessingActivities?.map((activity: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{activity.purpose}</h4>
                      <div className="grid gap-2 text-sm">
                        <div>
                          <span className="font-medium">Base Legal:</span> {activity.legalBasis}
                        </div>
                        <div>
                          <span className="font-medium">Tipos de Dados:</span>{" "}
                          {activity.dataTypes?.join(", ")}
                        </div>
                        <div>
                          <span className="font-medium">Retenção:</span> {activity.retention}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {activityReport?.dataController && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Controlador de Dados</h4>
                      <div className="text-sm space-y-1">
                        <div>Nome: {activityReport.dataController.name}</div>
                        <div>Contato: {activityReport.dataController.contact}</div>
                        <div>Endereço: {activityReport.dataController.address}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Exportar Dados
                </CardTitle>
                <CardDescription>
                  Baixe uma cópia completa de todos os seus dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => exportDataMutation.mutate()}
                  disabled={exportDataMutation.isPending}
                  className="w-full"
                >
                  {exportDataMutation.isPending ? "Exportando..." : "Exportar Meus Dados"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  Excluir Dados
                </CardTitle>
                <CardDescription>
                  Remove permanentemente todos os seus dados (irreversível)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="confirmation">
                    Digite "CONFIRMO_EXCLUSAO_DEFINITIVA" para confirmar:
                  </Label>
                  <Input
                    id="confirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="CONFIRMO_EXCLUSAO_DEFINITIVA"
                  />
                </div>
                <Button 
                  variant="destructive"
                  onClick={() => deleteDataMutation.mutate()}
                  disabled={deleteConfirmation !== "CONFIRMO_EXCLUSAO_DEFINITIVA" || deleteDataMutation.isPending}
                  className="w-full"
                >
                  {deleteDataMutation.isPending ? "Excluindo..." : "Excluir Todos os Dados"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}