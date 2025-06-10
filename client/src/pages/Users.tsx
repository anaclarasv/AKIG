import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [activeTab, setActiveTab] = useState("all");

  const { toast } = useToast();

  // Mock data - in real app this would come from API
  const mockUsers: User[] = [
    {
      id: "user-1",
      email: "admin@akig.com",
      firstName: "Administrator",
      lastName: "AKIG",
      role: "admin",
      virtualCoins: 0,
      isActive: true
    },
    {
      id: "user-2", 
      email: "supervisor@empresa.com",
      firstName: "Carlos",
      lastName: "Silva",
      role: "supervisor",
      companyId: 1,
      virtualCoins: 0,
      isActive: true
    },
    {
      id: "user-3",
      email: "avaliador@empresa.com", 
      firstName: "Ana",
      lastName: "Santos",
      role: "evaluator",
      companyId: 1,
      virtualCoins: 0,
      isActive: true
    },
    {
      id: "user-4",
      email: "atendente@empresa.com",
      firstName: "Maria",
      lastName: "Oliveira", 
      role: "agent",
      companyId: 1,
      virtualCoins: 245,
      isActive: true
    }
  ];

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "supervisor":
        return <Shield className="w-4 h-4 text-blue-500" />;
      case "evaluator":
        return <ClipboardCheck className="w-4 h-4 text-green-500" />;
      case "agent":
        return <Headphones className="w-4 h-4 text-purple-500" />;
      default:
        return <UsersIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: "Admin AKIG", className: "bg-yellow-100 text-yellow-800" },
      supervisor: { label: "Supervisor", className: "bg-blue-100 text-blue-800" },
      evaluator: { label: "Avaliador", className: "bg-green-100 text-green-800" },
      agent: { label: "Atendente", className: "bg-purple-100 text-purple-800" }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || { label: role, className: "bg-gray-100 text-gray-800" };
    
    return (
      <Badge className={config.className}>
        {getRoleIcon(role)}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesCompany = selectedCompany === "all" || user.companyId?.toString() === selectedCompany;
    const matchesTab = activeTab === "all" || 
      (activeTab === "active" && user.isActive) ||
      (activeTab === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesCompany && matchesTab;
  });

  const handleNewUser = () => {
    setIsCreateDialogOpen(true);
  };

  const userStats = {
    total: mockUsers.length,
    active: mockUsers.filter(u => u.isActive).length,
    inactive: mockUsers.filter(u => !u.isActive).length,
    byRole: {
      admin: mockUsers.filter(u => u.role === 'admin').length,
      supervisor: mockUsers.filter(u => u.role === 'supervisor').length,
      evaluator: mockUsers.filter(u => u.role === 'evaluator').length,
      agent: mockUsers.filter(u => u.role === 'agent').length,
    }
  };

  return (
    <div className="p-6">
      <Header 
        title="Usuários"
        subtitle="Gerenciamento de usuários do sistema"
        action={{
          label: "Novo Usuário",
          onClick: handleNewUser
        }}
      />

      <div className="mt-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="akig-card-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total</p>
                  <p className="text-2xl font-bold">{userStats.total}</p>
                </div>
                <UsersIcon className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="akig-card-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
                </div>
                <Shield className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="akig-card-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Avaliadores</p>
                  <p className="text-2xl font-bold text-blue-600">{userStats.byRole.evaluator}</p>
                </div>
                <ClipboardCheck className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="akig-card-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Atendentes</p>
                  <p className="text-2xl font-bold text-purple-600">{userStats.byRole.agent}</p>
                </div>
                <Headphones className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="akig-card-shadow mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cargos</SelectItem>
                  <SelectItem value="admin">Admin AKIG</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="evaluator">Avaliador</SelectItem>
                  <SelectItem value="agent">Atendente</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Empresas</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setSelectedRole("all");
                setSelectedCompany("all");
              }}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="akig-card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Usuários</CardTitle>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="active">Ativos</TabsTrigger>
                  <TabsTrigger value="inactive">Inativos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cargo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Moedas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Avatar className="w-10 h-10 mr-3">
                            <AvatarImage src={user.profileImageUrl} />
                            <AvatarFallback>
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {user.role === 'admin' ? 'AKIG Solutions' : companies?.find(c => c.id === user.companyId)?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {user.role === 'agent' ? (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {user.virtualCoins} moedas
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UsersIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum usuário encontrado
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedRole !== "all" || selectedCompany !== "all" 
                    ? "Tente ajustar os filtros de busca" 
                    : "Comece adicionando o primeiro usuário ao sistema"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Novo Usuário
            </DialogTitle>
            <DialogDescription>
              Adicione um novo usuário ao sistema de monitoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nome *</Label>
                <Input id="firstName" placeholder="Nome" />
              </div>
              <div>
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input id="lastName" placeholder="Sobrenome" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="usuario@empresa.com" />
            </div>
            <div>
              <Label htmlFor="role">Cargo *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="evaluator">Avaliador</SelectItem>
                  <SelectItem value="agent">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="company">Empresa *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
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
              <Switch id="active" defaultChecked />
              <Label htmlFor="active">Usuário ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="akig-bg-primary hover:opacity-90">
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
