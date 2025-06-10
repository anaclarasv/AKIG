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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Megaphone, Building } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Campaign, Company } from "@/types";

export default function Campaigns() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    companyId: 0,
    isActive: true
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/campaigns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Campanha criada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar campanha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return await apiRequest('PUT', `/api/campaigns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Campanha atualizada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar campanha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({
        title: "Sucesso",
        description: "Campanha removida com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover campanha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      companyId: 0,
      isActive: true
    });
    setSelectedCampaign(null);
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.companyId) {
      toast({
        title: "Erro",
        description: "Nome da campanha e empresa são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedCampaign || !formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da campanha é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: selectedCampaign.id, data: formData });
  };

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      companyId: campaign.companyId,
      isActive: campaign.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta campanha?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewCampaign = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const getCompanyName = (companyId: number) => {
    return companies?.find(c => c.id === companyId)?.name || "Empresa não encontrada";
  };

  if (user?.role !== 'admin' && user?.role !== 'supervisor') {
    return (
      <div className="p-6">
        <Card className="akig-card-shadow">
          <CardContent className="pt-6 text-center">
            <div className="py-12">
              <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Acesso Restrito
              </h3>
              <p className="text-muted-foreground">
                Apenas administradores e supervisores podem gerenciar campanhas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Header 
          title="Campanhas"
          subtitle="Gerenciamento de campanhas do sistema"
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
        title="Campanhas"
        subtitle="Gerenciamento de campanhas do sistema"
        action={{
          label: "Nova Campanha",
          onClick: handleNewCampaign
        }}
      />

      <div className="mt-6">
        {campaigns && campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="akig-card-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                        <Megaphone className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">ID: {campaign.id}</p>
                      </div>
                    </div>
                    <Badge variant={campaign.isActive ? "default" : "secondary"}>
                      {campaign.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground">
                        {campaign.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-2 text-sm">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {getCompanyName(campaign.companyId)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(campaign)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(campaign.id)}
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
                <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhuma campanha encontrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando sua primeira campanha
                </p>
                <Button onClick={handleNewCampaign} className="akig-bg-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Campanha
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
            <DialogDescription>
              Crie uma nova campanha para organizar suas monitorias.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Campanha *</Label>
              <Input
                id="name"
                placeholder="Ex: Atendimento Premium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição da campanha..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="company">Empresa *</Label>
              <Select value={formData.companyId.toString()} onValueChange={(value) => setFormData({ ...formData, companyId: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
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
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Campanha ativa</Label>
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
              {createMutation.isPending ? "Criando..." : "Criar Campanha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Campanha</DialogTitle>
            <DialogDescription>
              Atualize as informações da campanha.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome da Campanha *</Label>
              <Input
                id="edit-name"
                placeholder="Ex: Atendimento Premium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                placeholder="Descrição da campanha..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-company">Empresa *</Label>
              <Select value={formData.companyId.toString()} onValueChange={(value) => setFormData({ ...formData, companyId: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">Campanha ativa</Label>
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