"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, RefreshCw, Check, ChevronDown } from 'lucide-react';
import { Account, MailConnectionConfig } from '@/lib/mail';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ImapFolderStepProps {
  account: Account;
  onBack?: () => void;
  onComplete?: (account: Account) => void;
}

export function ImapFolderStep({ account, onBack, onComplete }: ImapFolderStepProps) {
  const [folders, setFolders] = useState<{ name: string; path: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);

  const fetchFolders = async () => {
    setRefreshing(true);
    try {
      const config: MailConnectionConfig = {
        host: account.config.host,
        port: account.config.port,
        secure: account.config.secure,
        username: account.config.username,
        password: account.config.password,
        allowUnsignedCertificate: account.config.allowUnsignedCertificate,
      };

      if (typeof window !== "undefined" && window.accountsAPI) {
        const result = await window.accountsAPI.listMailboxFolders(config);
        if (result.success && result.folders) {
          setFolders(result.folders);
          
          // Auto-select Spam or Junk folder if available
          const defaultFolders = ['Spam', 'Junk', 'Spam Folder', 'Junk E-mail', 'Courrier indésirables'];
          const matchingFolder = result.folders.find(f => defaultFolders.some(df => f.name.toLowerCase().includes(df.toLowerCase())));
          if (matchingFolder && !selectedFolder) {
            setSelectedFolder(matchingFolder.path);
            setFolderSearch(matchingFolder.name);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [account]);

  const handleContinue = async () => {
    if (!selectedFolder) return;

    setSaving(true);
    try {
      // Find the selected folder name
      const selectedFolderObj = folders.find(f => f.path === selectedFolder);
      
      // Update the account with spam folder config
      const updatedAccount: Account = {
        ...account,
        config: {
          ...account.config,
          spamFolder: selectedFolderObj?.name || selectedFolder,
        },
      };

      // Create the account via IPC (using create since account wasn't saved yet)
      const savedAccount = await window.accountsAPI.create(updatedAccount);
      
      // Notify that accounts were updated
      window.electronAPI?.send('accounts-updated');
      
      onComplete?.(savedAccount);
    } catch (error) {
      console.error('[ImapFolderStep] Failed to save folder selection:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Select Spam Folder</CardTitle>
          <CardDescription>
            Choose which folder to move detected spam emails to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading folders...</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="spamFolder">Junk/Spam Folder</Label>
                <div className="flex gap-2">
                  <Popover open={folderOpen} onOpenChange={(open) => {
                    setFolderOpen(open);
                    if (open) {
                      const cleanName = folders.find(f => f.path === selectedFolder)?.name || folderSearch || "";
                      setFolderSearch(cleanName);
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={folderOpen}
                        className="flex-1 justify-between"
                      >
                        {selectedFolder
                          ? folders.find(f => f.path === selectedFolder)?.name?.replace(/^INBOX\./, '')
                          : "Select spam folder..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search folder..."
                          className="h-9"
                          value={folderSearch}
                          onValueChange={(value) => {
                            setFolderSearch(value);
                            setSelectedFolder(value);
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>No folder found.</CommandEmpty>
                          <CommandGroup>
                            {folders.map((folder) => (
                              <CommandItem
                                key={folder.path}
                                value={folder.name}
                                onSelect={(currentValue) => {
                                  const selected = folders.find(f => f.name === currentValue);
                                  if (selected) {
                                    setSelectedFolder(selected.path);
                                    setFolderSearch(selected.name);
                                  }
                                  setFolderOpen(false);
                                }}
                              >
                                {folder.name.replace(/^INBOX\./, '')}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedFolder === folder.path ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    onClick={fetchFolders}
                    disabled={refreshing}
                    variant="outline"
                    size="icon"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Spam emails will be moved to this folder
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleContinue}
                disabled={!selectedFolder || saving}
              >
                {saving ? 'Saving...' : 'Continue'}
              </Button>
              {onBack && (
                <Button className="w-full mt-4" variant="ghost" onClick={onBack}>
                  Back
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
