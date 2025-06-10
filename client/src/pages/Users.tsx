import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Crown, 
  Shield, 
  ClipboardCheck, 
  Headphones,
  MoreHorizontal,
  UserPlus
} from "lucide-react";
import type { User, Company } from "@/types";

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "agent",
    companyId: "",
    isActive: true
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch users from API
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch companies for dropdown
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof formData) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar usuário",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir usuário",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "agent",
      companyId: "",
      isActive: true
    });
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({
      username: userToEdit.email || "",
      email: userToEdit.email,
      password: "",
      firstName: userToEdit.firstName,
      lastName: userToEdit.lastName,
      role: userToEdit.role,
      companyId: userToEdit.companyId?.toString() || "",
      isActive: userToEdit.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (userId: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleSubmit = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: {
          ...formData,
          companyId: formData.companyId ? parseInt(formData.companyId) : undefined
        }
      });
    } else {
      createUserMutation.mutate({
        ...formData,
        companyId: formData.companyId ? parseInt(formData.companyId) : undefined
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesCompany = selectedCompany === "all" || user.companyId?.toString() === selectedCompany;
    const matchesTab = activeTab === "all" || 
                      (activeTab === "active" && user.isActive) ||
                      (activeTab === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesCompany && matchesTab;
  });

  if (usersLoading) {
    return (
      <div className="p-6">
        <Header 
          title="Gerenciamento de Usuários"
          subtitle="Administre usuários do sistema"
        />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="akig-card-shadow">
              <CardContent className="pt-6">
                <div className="loading-shimmer h-40 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getUserRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case "supervisor":
        return <Shield className="w-4 h-4 text-blue-600" />;
      case "evaluator":
        return <ClipboardCheck className="w-4 h-4 text-green-600" />;
      case "agent":
        return <Headphones className="w-4 h-4 text-purple-600" />;
      default:
        return <UsersIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getUserRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-yellow-100 text-yellow-800">Admin</Badge>;
      case "supervisor":
        return <Badge className="bg-blue-100 text-blue-800">Supervisor</Badge>;
      case "evaluator":
        return <Badge className="bg-green-100 text-green-800">Avaliador</Badge>;
      case "agent":
        return <Badge className="bg-purple-100 text-purple-800">Agente</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <Header 
        title="Gerenciamento de Usuários"
        subtitle="Administre usuários do sistema"
        action={{
          label: "Novo Usuário",
          onClick: () => setIsCreateDialogOpen(true)
        }}
      />

      {/* Search and Filters */}
      <div className="mt-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Pesquisar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="supervisor">Supervisor</SelectItem>
            <SelectItem value="evaluator">Avaliador</SelectItem>
            <SelectItem value="agent">Agente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id.toString()}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos ({users.length})</TabsTrigger>
            <TabsTrigger value="active">Ativos ({users.filter(u => u.isActive).length})</TabsTrigger>
            <TabsTrigger value="inactive">Inativos ({users.filter(u => !u.isActive).length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="akig-card-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {user.firstName[0]}{user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">
                            {user.firstName} {user.lastName}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {getUserRoleIcon(user.role)}
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Role:</span>
                        {getUserRoleBadge(user.role)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Moedas:</span>
                        <span className="font-medium">{user.virtualCoins}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Tente ajustar os filtros ou criar um novo usuário.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit User Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingUser(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuário" : "Criar Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? "Edite as informações do usuário." : "Adicione um novo usuário ao sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Digite o nome"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Digite o sobrenome"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Digite o nome de usuário"
              />
            </div>

            {!editingUser && (
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Digite a senha"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="evaluator">Avaliador</SelectItem>
                    <SelectItem value="agent">Agente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="company">Empresa</Label>
                <Select value={formData.companyId} onValueChange={(value) => setFormData(prev => ({ ...prev, companyId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Usuário ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setEditingUser(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {editingUser ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}