import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BarChart3, 
  Headphones, 
  ClipboardCheck, 
  Trophy, 
  FileBarChart, 
  Building, 
  Users, 
  LogOut,
  Settings
} from "lucide-react";

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [currentRole, setCurrentRole] = useState(user?.role || 'agent');

  // Sync currentRole with user role when user changes
  useEffect(() => {
    if (user?.role) {
      setCurrentRole(user.role);
    }
  }, [user?.role]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/auth';
    }
  };

  const handleRoleSwitch = (role: string) => {
    setCurrentRole(role);
    // In a real implementation, this would make an API call to switch roles
    console.log(`Role switched to: ${role}`);
  };

  const getNavigationForRole = (role: string) => {
    const baseNavigation = [
      { name: 'Dashboard', href: '/', icon: BarChart3 },
    ];

    switch (role) {
      case 'admin':
        return [
          ...baseNavigation,
          { name: 'Monitorias', href: '/monitoring', icon: Headphones },
          { name: 'Avaliações', href: '/evaluations', icon: ClipboardCheck },
          { name: 'Ranking', href: '/ranking', icon: Trophy },
          { name: 'Relatórios', href: '/reports', icon: FileBarChart },
          { name: 'Empresas', href: '/companies', icon: Building },
          { name: 'Usuários', href: '/users', icon: Users },
        ];
      case 'supervisor':
        return [
          ...baseNavigation,
          { name: 'Monitorias', href: '/monitoring', icon: Headphones },
          { name: 'Avaliações', href: '/evaluations', icon: ClipboardCheck },
          { name: 'Ranking', href: '/ranking', icon: Trophy },
          { name: 'Relatórios', href: '/reports', icon: FileBarChart },
        ];
      case 'evaluator':
        return [
          ...baseNavigation,
          { name: 'Monitorias', href: '/monitoring', icon: Headphones },
          { name: 'Avaliações', href: '/evaluations', icon: ClipboardCheck },
          { name: 'Ranking', href: '/ranking', icon: Trophy },
        ];
      case 'agent':
        return [
          ...baseNavigation,
          { name: 'Monitorias', href: '/monitoring', icon: Headphones },
          { name: 'Ranking', href: '/ranking', icon: Trophy },
        ];
      default:
        return baseNavigation;
    }
  };

  const navigation = getNavigationForRole(currentRole);

  const roleNames = {
    admin: 'Admin AKIG',
    supervisor: 'Supervisor',
    evaluator: 'Avaliador',
    agent: 'Atendente',
  };

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-primary font-bold text-lg">A</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">AKIG Solutions</h1>
            <p className="text-sidebar-foreground/70 text-sm">Monitoria Inteligente</p>
          </div>
        </div>
      </div>

      {/* Role Switcher (Admin only) */}
      {user?.role === 'admin' && (
        <div className="p-4 border-b border-sidebar-border">
          <Select value={currentRole} onValueChange={handleRoleSwitch}>
            <SelectTrigger className="w-full bg-sidebar-accent text-sidebar-accent-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin AKIG</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="evaluator">Avaliador</SelectItem>
              <SelectItem value="agent">Atendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link href={item.href} className={`
                  flex items-center space-x-3 p-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'hover:bg-sidebar-accent/50'
                  }
                `}>
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.profileImageUrl ?? undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sidebar-foreground/70 text-sm">
              {roleNames[currentRole as keyof typeof roleNames]}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleLogout} 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}
