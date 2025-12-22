"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, ChevronDown, Settings, Plus } from "lucide-react";

declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, ...args: unknown[]) => void;
    };
  }
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (pathname.startsWith('/wizard')) return null;

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-sidebar-border text-card-foreground flex flex-col">
      {/* Account Selector */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="cursor-pointer hover:bg-sidebar-accent p-2 rounded mb-2" onClick={() => { setIsOpen(!isOpen); }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6" />
              <span className="text-sm text-sidebar-foreground">user@gmail.com</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
        {/* Dropdown content */}
        {isOpen && (
        <div className="space-y-1 border border-sidebar-border rounded p-2">
          <div className="flex items-center space-x-3 p-2 hover:bg-sidebar-accent rounded cursor-pointer">
            <Mail className="w-5 h-5" />
            <span className="text-sm text-sidebar-foreground">user@gmail.com</span>
            <span className="w-2 h-2 bg-green-500 rounded-full ml-auto"></span>
          </div>
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
              className={`w-full justify-start cursor-pointer transition-colors ${
                pathname === "/"
                  ? 'bg-white text-black hover:bg-white'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Mail className="w-5 h-5 mr-2" />
              Dashboard
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
        </div>
      </div>
    </div>
  );
}

