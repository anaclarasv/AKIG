import { useState, useEffect } from "react";
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
import { Plus, Edit, Trash2, Gift, Coins, ShoppingCart, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Reward, Company, RewardPurchase } from "@/types";

export default function RewardsStore() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cost: 0,
    imageUrl: "",
    companyId: 0
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'evaluator',
  });

  // For agents, use their companyId; for admins/evaluators, use selectedCompanyId
  const companyIdForQuery = user?.role === 'agent' ? user.companyId?.toString() : selectedCompanyId;

  const { data: rewards, isLoading } = useQuery<Reward[]>({
    queryKey: ['/api/rewards', companyIdForQuery],
    queryFn: async () => {
      const url = (user?.role === 'admin' || user?.role === 'evaluator') && companyIdForQuery 
        ? `/api/rewards?companyId=${companyIdForQuery}`
        : '/api/rewards';
      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch rewards');
      return response.json();
    },
    enabled: !!companyIdForQuery && !!user,
  });

  const { data: userPurchases } = useQuery<RewardPurchase[]>({
    queryKey: ['/api/user/purchases'],
    enabled: !!user && user.role !== 'admin',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/rewards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Recompensa criada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar recompensa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return await apiRequest('PUT', `/api/rewards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Recompensa atualizada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar recompensa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/rewards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
      toast({
        title: "Sucesso",
        description: "Recompensa removida com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover recompensa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      return await apiRequest('POST', `/api/rewards/${rewardId}/purchase`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setIsPurchaseDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Recompensa resgatada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Moedas insuficientes ou erro no resgate.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      cost: 0,
      imageUrl: "",
      companyId: selectedCompanyId ? parseInt(selectedCompanyId) : 0
    });
    setSelectedReward(null);
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !selectedCompanyId) {
      toast({
        title: "Erro",
        description: "Nome da recompensa e empresa são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ ...formData, companyId: parseInt(selectedCompanyId) });
  };

  const handleUpdate = () => {
    if (!selectedReward || !formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da recompensa é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: selectedReward.id, data: formData });
  };

  const handleEdit = (reward: Reward) => {
    setSelectedReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || "",
      cost: reward.cost,
      imageUrl: reward.imageUrl || "",
      companyId: reward.companyId
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta recompensa?")) {
      deleteMutation.mutate(id);
    }
  };

  const handlePurchase = (reward: Reward) => {
    setSelectedReward(reward);
    setIsPurchaseDialogOpen(true);
  };

  const confirmPurchase = () => {
    if (selectedReward) {
      purchaseMutation.mutate(selectedReward.id);
    }
  };

  const handleNewReward = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const hasUserPurchased = (rewardId: number) => {
    return userPurchases?.some(purchase => purchase.rewardId === rewardId);
  };

  const canUserAfford = (cost: number) => {
    return user?.virtualCoins && user.virtualCoins >= cost;
  };

  const isAdmin = user?.role === 'admin';
  const isEvaluator = user?.role === 'evaluator';
  const canManageRewards = isAdmin || isEvaluator;

  // Auto-select first company if none selected
  useEffect(() => {
    if (canManageRewards && companies && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id.toString());
    }
  }, [companies, selectedCompanyId, canManageRewards]);

  return (
    <div className="p-6">
      <Header 
        title="Loja de Recompensas"
        subtitle={canManageRewards ? "Gerenciar recompensas do sistema" : `Suas moedas virtuais: ${user?.virtualCoins || 0}`}
        action={canManageRewards && selectedCompanyId ? {
          label: "Nova Recompensa",
          onClick: handleNewReward
        } : undefined}
      />

      <div className="mt-6">
        {canManageRewards && (
          <Card className="akig-card-shadow mb-6">
            <CardHeader>
              <CardTitle>Selecionar Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma empresa para gerenciar recompensas" />
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
        )}

        {!isAdmin && (
          <Card className="mb-6 akig-card-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg flex items-center justify-center">
                    <Coins className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Suas Moedas Virtuais</h3>
                    <p className="text-sm text-muted-foreground">
                      Ganhe mais moedas com boas avaliações
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {user?.virtualCoins || 0} moedas
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {(selectedCompanyId || !isAdmin) && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="akig-card-shadow">
                    <CardContent className="pt-6">
                      <div className="loading-shimmer h-48 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : rewards && rewards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((reward) => (
                  <Card key={reward.id} className="akig-card-shadow">
                    <CardHeader>
                      <div className="aspect-video bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg flex items-center justify-center mb-4">
                        {reward.imageUrl ? (
                          <img 
                            src={reward.imageUrl} 
                            alt={reward.name} 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Gift className="w-16 h-16 text-purple-600" />
                        )}
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{reward.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {reward.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <Coins className="w-3 h-3" />
                          <span>{reward.cost}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {!isAdmin && (
                          <>
                            {hasUserPurchased(reward.id) ? (
                              <Badge className="w-full justify-center py-2">
                                <Star className="w-4 h-4 mr-2" />
                                Já Resgatado
                              </Badge>
                            ) : (
                              <Button
                                className="w-full akig-bg-primary hover:opacity-90"
                                onClick={() => handlePurchase(reward)}
                                disabled={!canUserAfford(reward.cost)}
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                {canUserAfford(reward.cost) ? "Resgatar" : "Moedas Insuficientes"}
                              </Button>
                            )}
                          </>
                        )}

                        {isAdmin && (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEdit(reward)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(reward.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="akig-card-shadow">
                <CardContent className="pt-6 text-center">
                  <div className="py-12">
                    <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {isAdmin ? "Nenhuma recompensa configurada" : "Nenhuma recompensa disponível"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {isAdmin 
                        ? "Configure recompensas para motivar sua equipe"
                        : "Aguarde novas recompensas serem adicionadas"
                      }
                    </p>
                    {isAdmin && (
                      <Button onClick={handleNewReward} className="akig-bg-primary hover:opacity-90">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeira Recompensa
                      </Button>
                    )}
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
            <DialogTitle>Nova Recompensa</DialogTitle>
            <DialogDescription>
              Crie uma nova recompensa para motivar sua equipe.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Recompensa *</Label>
              <Input
                id="name"
                placeholder="Ex: Vale-presente R$ 50"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição da recompensa..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="cost">Custo (Moedas Virtuais) *</Label>
              <Input
                id="cost"
                type="number"
                min="1"
                placeholder="Ex: 100"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="imageUrl">URL da Imagem</Label>
              <Input
                id="imageUrl"
                placeholder="https://exemplo.com/imagem.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
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
              {createMutation.isPending ? "Criando..." : "Criar Recompensa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Recompensa</DialogTitle>
            <DialogDescription>
              Atualize as informações da recompensa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome da Recompensa *</Label>
              <Input
                id="edit-name"
                placeholder="Ex: Vale-presente R$ 50"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                placeholder="Descrição da recompensa..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-cost">Custo (Moedas Virtuais) *</Label>
              <Input
                id="edit-cost"
                type="number"
                min="1"
                placeholder="Ex: 100"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="edit-imageUrl">URL da Imagem</Label>
              <Input
                id="edit-imageUrl"
                placeholder="https://exemplo.com/imagem.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
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

      {/* Purchase Confirmation Dialog */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Resgate</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja resgatar esta recompensa?
            </DialogDescription>
          </DialogHeader>
          
          {selectedReward && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedReward.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedReward.description}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm">Custo:</span>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Coins className="w-3 h-3" />
                    <span>{selectedReward.cost} moedas</span>
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Suas moedas atuais:</span>
                <span className="font-medium">{user?.virtualCoins || 0}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Moedas após resgate:</span>
                <span className="font-medium">
                  {(user?.virtualCoins || 0) - selectedReward.cost}
                </span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPurchaseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmPurchase} 
              disabled={purchaseMutation.isPending}
              className="akig-bg-primary hover:opacity-90"
            >
              {purchaseMutation.isPending ? "Resgatando..." : "Confirmar Resgate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}