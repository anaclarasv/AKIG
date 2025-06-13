import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building, Plus, Edit, Trash2, Users, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Company } from "@/types";

export default function Companies() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/companies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", logoUrl: "", isActive: true });
      toast({
        title: "Sucesso",
        description: "Empresa criada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar empresa. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      return await apiRequest('PUT', `/api/companies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsEditDialogOpen(false);
      setSelectedCompany(null);
      setFormData({ name: "", logoUrl: "", isActive: true });
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar empresa. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleCreateCompany = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da empresa é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      logoUrl: company.logoUrl || "",
      isActive: company.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCompany = () => {
    if (!selectedCompany || !formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da empresa é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: selectedCompany.id, data: formData });
  };

  const handleNewCompany = () => {
    setFormData({ name: "", logoUrl: "", isActive: true });
    setIsCreateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Header 
          title="Empresas"
          subtitle="Gerenciamento de empresas do sistema"
        />
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="akig-card-shadow">
              <CardContent className="pt-6">
                <div className="loading-shimmer h-32 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header 
        title="Empresas"
        subtitle="Gerenciamento de empresas do sistema"
        action={{
          label: "Nova Empresa",
          onClick: handleNewCompany
        }}
      />

      <div className="mt-6">
        {companies && companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Card key={company.id} className="akig-card-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                        {company.logoUrl ? (
                          <img src={company.logoUrl} alt={company.name} className="w-8 h-8 object-contain" />
                        ) : (
                          <Building className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">ID: {company.id}</p>
                      </div>
                    </div>
                    <Badge variant={company.isActive ? "default" : "secondary"}>
                      {company.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-muted rounded-lg">
                        <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                        <p className="text-sm font-medium">{company.activeUserCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Usuários</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <BarChart3 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <p className="text-sm font-medium">{company.campaignCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Campanhas</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditCompany(company)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
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
                <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhuma empresa cadastrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando a primeira empresa ao sistema
                </p>
                <Button onClick={handleNewCompany} className="akig-bg-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Empresa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Company Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
            <DialogDescription>
              Adicione uma nova empresa ao sistema de monitoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite o nome da empresa"
              />
            </div>
            <div>
              <Label htmlFor="logoUrl">URL do Logo (opcional)</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Empresa ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCompany}
              disabled={createMutation.isPending}
              className="akig-bg-primary hover:opacity-90"
            >
              {createMutation.isPending ? "Criando..." : "Criar Empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Atualize as informações da empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome da Empresa *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite o nome da empresa"
              />
            </div>
            <div>
              <Label htmlFor="edit-logoUrl">URL do Logo (opcional)</Label>
              <Input
                id="edit-logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="edit-isActive">Empresa ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateCompany}
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
