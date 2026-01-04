import { Button } from "@/components/ui/button";
import { Settings, Database, FileText, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeView: 'dashboard' | 'workspace' | 'audit' | 'config';
  onViewChange: (view: 'dashboard' | 'workspace' | 'audit' | 'config') => void;
}

export function Header({ activeView, onViewChange }: HeaderProps) {
  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Database className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">SKU Agent</span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange('dashboard')}
              className={cn(
                "h-9",
                activeView === 'dashboard' && "bg-muted text-foreground"
              )}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange('audit')}
              className={cn(
                "h-9",
                activeView === 'audit' && "bg-muted text-foreground"
              )}
            >
              <FileText className="w-4 h-4 mr-2" />
              Audit Log
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange('config')}
              className={cn(
                "h-9",
                activeView === 'config' && "bg-muted text-foreground"
              )}
            >
              <Settings className="w-4 h-4 mr-2" />
              Config
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">v1.0.0</span>
        </div>
      </div>
    </header>
  );
}
