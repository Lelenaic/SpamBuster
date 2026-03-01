"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Mail, Settings, Plus, Shield, RefreshCw, BarChart3 } from "lucide-react";
import { checkForNewerVersion } from "@/lib/versionChecker";
import { useUpdateNotification } from "@/lib/contexts/UpdateNotificationContext";

export default function Sidebar() {
  const [version, setVersion] = useState<string>('0.0.0');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const pathname = usePathname();
  const { showNotification } = useUpdateNotification();

  useEffect(() => {
    const loadVersion = async () => {
      if (typeof window !== "undefined" && window.packageAPI) {
        const packageInfo = await window.packageAPI.getInfo();
        setVersion(packageInfo.currentVersion || '0.0.0');
      }
    };
    loadVersion();
  }, []);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await checkForNewerVersion();
      showNotification(result);
    } catch (error) {
      // Error is handled in the notification
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  if (pathname.startsWith('/wizard')) return null;

  return (
    <TooltipProvider>
      <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-sidebar-border text-card-foreground flex flex-col">
      {/* Add Account Button */}
      <div className="p-4 border-b border-sidebar-border">
        <div
          className="cursor-pointer hover:bg-sidebar-accent p-2 rounded flex items-center space-x-3"
          onClick={() => { if (typeof window !== 'undefined' && window.electronAPI) window.electronAPI.send('open-wizard-window'); }}
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm text-sidebar-foreground">Add an account</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col justify-between p-4">
        {/* Top */}
        <div>
          <Link href="/">
            <Button
              variant="ghost"
              className={`w-full justify-start cursor-pointer transition-colors mb-2 ${
                pathname === "/"
                  ? 'bg-white text-black hover:bg-white'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Mail className="w-5 h-5 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link href="/rules">
            <Button
              variant="ghost"
              className={`w-full justify-start cursor-pointer transition-colors mb-2 ${
                pathname === "/rules"
                  ? 'bg-white text-black hover:bg-white'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Shield className="w-5 h-5 mr-2" />
              Rules
            </Button>
          </Link>
          <Link href="/stats">
            <Button
              variant="ghost"
              className={`w-full justify-start cursor-pointer transition-colors ${
                pathname === "/stats"
                  ? 'bg-white text-black hover:bg-white'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Stats
            </Button>
          </Link>
        </div>

        {/* Bottom */}
        <div>
          <Link href="/settings">
            <Button
              variant="ghost"
              className={`w-full justify-start cursor-pointer transition-colors ${
                pathname === "/settings"
                  ? 'bg-white text-black hover:bg-white'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-5 h-5 mr-2" />
              Settings
            </Button>
          </Link>
          <Separator className="my-2" />
          <div className="flex items-center justify-center gap-2 text-xs text-sidebar-foreground/70">
            <span>SpamBuster v{version}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-sidebar-accent"
                  onClick={handleCheckUpdate}
                  disabled={isCheckingUpdate}
                >
                  <RefreshCw className={`h-3 w-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Check for updates</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}

