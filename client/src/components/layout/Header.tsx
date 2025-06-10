import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NotificationPanel from "./NotificationPanel";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function Header({ 
  title = "Dashboard", 
  subtitle = "Visão geral do sistema de monitoria",
  action
}: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          <NotificationPanel />
          {action && (
            <Button onClick={action.onClick} className="akig-bg-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
