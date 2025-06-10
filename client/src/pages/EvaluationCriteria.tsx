import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ClipboardCheck, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { EvaluationCriteria, Company } from "@/types";

export default function EvaluationCriteriaPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<EvaluationCriteria | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    weight: 10,
    maxScore: 10,
    companyId: 0
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: criteria, isLoading } = useQuery<EvaluationCriteria[]>({
    queryKey: ['/api/evaluation-criteria', selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/evaluation-criteria', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evaluation-criteria'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Critério de avaliação criado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar critério. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return await apiRequest('PUT', `/api/evaluation-criteria/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evaluation-criteria'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Critério atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar critério. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/evaluation-criteria/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evaluation-criteria'] });
      toast({
        title: "Sucesso",
        description: "Critério removido com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover critério. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      weight: 10,
      maxScore: 10,
      companyId: selectedCompanyId ? parseInt(selectedCompanyId) : 0
    });
    setSelectedCriteria(null);
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !selectedCompanyId) {
      toast({
        title: "Erro",
        description: "Nome do critério e empresa são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ ...formData, companyId: parseInt(selectedCompanyId) });
  };

  const handleUpdate = () => {
    if (!selectedCriteria || !formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do critério é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: selectedCriteria.id, data: formData });
  };

  const handleEdit = (criteriaItem: EvaluationCriteria) => {
    setSelectedCriteria(criteriaItem);
    setFormData({
      name: criteriaItem.name,
      description: criteriaItem.description || "",
      weight: criteriaItem.weight,
      maxScore: criteriaItem.maxScore,
      companyId: criteriaItem.companyId
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este critério?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewCriteria = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const totalWeight = criteria?.reduce((sum, criterion) => sum + criterion.weight, 0) || 0;

  if (user?.role !== 'admin' && user?.role !== 'supervisor') {
    return (
      <div className="p-6">
        <Card className="akig-card-shadow">
          <CardContent className="pt-6 text-center">
            <div className="py-12">
              <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Acesso Restrito
              </h3>
              <p className="text-muted-foreground">
                Apenas administradores e supervisores podem gerenciar critérios de avaliação.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header 
        title="Critérios de Avaliação"
        subtitle="Configure critérios personalizados para cada empresa"
        action={selectedCompanyId ? {
          label: "Novo Critério",
          onClick: handleNewCriteria
        } : undefined}
      />

      <div className="mt-6">
        <Card className="akig-card-shadow mb-6">
          <CardHeader>
            <CardTitle>Selecionar Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma empresa para configurar critérios" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
                {(!companies || companies.length === 0) && (
                  <SelectItem value="placeholder" disabled>
                    Nenhuma empresa encontrada
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedCompanyId && (
          <>
            {totalWeight > 0 && (
              <Card className="mb-6 akig-card-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Peso Total: {totalWeight}%</h3>
                      <p className="text-sm text-muted-foreground">
                        {totalWeight === 100 ? "✓ Configuração completa" : 
                         totalWeight > 100 ? "⚠ Peso excede 100%" : 
                         "⚠ Peso menor que 100%"}
                      </p>
                    </div>
                    <Badge variant={totalWeight === 100 ? "default" : "secondary"}>
                      {totalWeight}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="akig-card-shadow">
                    <CardContent className="pt-6">
                      <div className="loading-shimmer h-32 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : criteria && criteria.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {criteria.map((criteriaItem) => (
                  <Card key={criteriaItem.id} className="akig-card-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{criteriaItem.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {criteriaItem.description}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {criteriaItem.weight}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Pontuação Máxima:</span>
                          <span className="font-medium">{criteriaItem.maxScore}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEdit(criteriaItem)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(criteriaItem.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="akig-card-shadow">
                <CardContent className="pt-6 text-center">
                  <div className="py-12">
                    <ClipboardCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Nenhum critério configurado
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Configure critérios de avaliação personalizados para esta empresa
                    </p>
                    <Button onClick={handleNewCriteria} className="akig-bg-primary hover:opacity-90">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Critério
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Critério de Avaliação</DialogTitle>
            <DialogDescription>
              Configure um novo critério personalizado para avaliação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Critério *</Label>
              <Input
                id="name"
                placeholder="Ex: Cordialidade no atendimento"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição detalhada do critério..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Peso (%)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div>
                <Label htmlFor="maxScore">Pontuação Máxima</Label>
                <Input
                  id="maxScore"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createMutation.isPending}
              className="akig-bg-primary hover:opacity-90"
            >
              {createMutation.isPending ? "Criando..." : "Criar Critério"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Critério</DialogTitle>
            <DialogDescription>
              Atualize as informações do critério de avaliação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome do Critério *</Label>
              <Input
                id="edit-name"
                placeholder="Ex: Cordialidade no atendimento"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                placeholder="Descrição detalhada do critério..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-weight">Peso (%)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-maxScore">Pontuação Máxima</Label>
                <Input
                  id="edit-maxScore"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateMutation.isPending}
              className="akig-bg-primary hover:opacity-90"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}