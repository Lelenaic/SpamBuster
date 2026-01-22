"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Mail, ChevronDown, Settings, Plus, Shield, RefreshCw } from "lucide-react";
import { checkForNewerVersion } from "@/lib/versionChecker";
import { toast } from "sonner";
import { Account, AccountStatus } from "@/lib/mail";

const getStatusColor = (status: AccountStatus) => {
  switch (status) {
    case 'working':
      return 'bg-green-500';
    case 'trouble':
      return 'bg-red-500';
    case 'disabled':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [version, setVersion] = useState<string>('0.0.0');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const loadAccounts = async () => {
      if (typeof window !== "undefined" && window.accountsAPI) {
        const storedAccounts = await window.accountsAPI.getAll();
        setAccounts(storedAccounts);
        if (storedAccounts.length > 0 && !currentAccount) {
          setCurrentAccount(storedAccounts[0]);
        }

        // Update current account if it exists in the new accounts list
        if (currentAccount) {
          const updatedCurrentAccount = storedAccounts.find(acc => acc.id === currentAccount.id);
          if (updatedCurrentAccount) {
            setCurrentAccount(updatedCurrentAccount);
          } else {
            // Current account was deleted, select the first available account or null
            const newCurrentAccount = storedAccounts.length > 0 ? storedAccounts[0] : null;
            setCurrentAccount(newCurrentAccount);
            // Close the dropdown if no accounts remain
            if (!newCurrentAccount) {
              setIsOpen(false);
            }
          }
        }
      }
    };
    const loadVersion = async () => {
      if (typeof window !== "undefined" && window.packageAPI) {
        const packageInfo = await window.packageAPI.getInfo();
        setVersion(packageInfo.currentVersion || '0.0.0');
      }
    };
    loadAccounts();
    loadVersion();
  }, [currentAccount]);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await checkForNewerVersion();
      if (result.hasUpdate) {
        toast.success(`New version ${result.latestVersion} available!`, {
          action: result.releaseUrl ? {
            label: "Update",
            onClick: () => window.shellAPI.openExternal(result.releaseUrl!),
          } : undefined,
        });
      } else if (result.error) {
        toast.error(`Failed to check for updates: ${result.error}`);
      } else {
        toast.success("You're running the latest version!");
      }
    } catch (error) {
      toast.error("Failed to check for updates");
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  if (pathname.startsWith('/wizard')) return null;

  return (
    <TooltipProvider>
      <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-sidebar-border text-card-foreground flex flex-col">
      {/* Account Selector */}
      <div className="p-4 border-b border-sidebar-border">
        {currentAccount ? (
          <div className="cursor-pointer hover:bg-sidebar-accent p-2 rounded mb-2" onClick={() => { setIsOpen(!isOpen); }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="w-6 h-6" />
                <span className="text-sm text-sidebar-foreground">{currentAccount.name || currentAccount.config.username}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className={`w-2 h-2 rounded-full ${getStatusColor(currentAccount.status)} hover:opacity-80 cursor-pointer`}
                      onClick={(e) => e.stopPropagation()}
                    ></span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Status: {currentAccount.status}</p>
                  </TooltipContent>
                </Tooltip>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="cursor-pointer hover:bg-sidebar-accent p-2 rounded mb-2" onClick={() => { if (typeof window !== 'undefined' && window.electronAPI) window.electronAPI.send('open-wizard-window'); }}>
            <div className="flex items-center space-x-3">
              <Plus className="w-6 h-6" />
              <span className="text-sm text-sidebar-foreground">Add an account</span>
            </div>
          </div>
        )}
        {/* Dropdown content */}
        {isOpen && (
        <div className="space-y-1 border border-sidebar-border rounded p-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center space-x-3 p-2 hover:bg-sidebar-accent rounded cursor-pointer ${
                currentAccount?.id === account.id ? 'bg-sidebar-primary/10 border border-sidebar-primary/20' : ''
              }`}
              onClick={() => {
                setCurrentAccount(account);
                setIsOpen(false);
              }}
            >
              <Mail className="w-5 h-5" />
              <span className="text-sm text-sidebar-foreground">{account.name || account.config.username}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span 
                    className={`w-2 h-2 rounded-full ml-auto ${getStatusColor(account.status)} hover:opacity-80 cursor-pointer`}
                    onClick={(e) => e.stopPropagation()}
                  ></span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Status: {account.status}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
          <div className="flex items-center space-x-3 p-2 hover:bg-sidebar-accent rounded cursor-pointer bg-sidebar-primary/10 border border-sidebar-primary/20" onClick={() => { if (typeof window !== 'undefined' && window.electronAPI) window.electronAPI.send('open-wizard-window'); }}>
            <Plus className="w-5 h-5" />
            <span className="text-sm text-sidebar-foreground">Add an account</span>
          </div>
        </div>
        )}
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
              className={`w-full justify-start cursor-pointer transition-colors ${
                pathname === "/rules"
                  ? 'bg-white text-black hover:bg-white'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Shield className="w-5 h-5 mr-2" />
              Rules
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

