"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, RefreshCw, Check, ChevronDown } from 'lucide-react';
import { Microsoft365Provider } from '@/lib/mail/microsoft365';
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

interface Microsoft365FolderStepProps {
  account: Account;
  onBack?: () => void;
  onComplete?: (account: Account) => void;
}

export function Microsoft365FolderStep({ account, onBack, onComplete }: Microsoft365FolderStepProps) {
  const [folders, setFolders] = useState<{ name: string; id: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);

  const fetchFolders = async () => {
    setRefreshing(true);
    try {
      const provider = new Microsoft365Provider();
      
      const config: MailConnectionConfig = {
        oauth2Config: account.config.oauth2Config,
      };

      const folderList = await provider.getMailFolders(config);
      setFolders(folderList);
      
      // Auto-select Junk Email or Spam folder if available
      const defaultFolders = ['Junk Email', 'Spam', 'Junk', 'Courrier indésirables'];
      const matchingFolder = folderList.find(f => defaultFolders.some(df => f.name.toLowerCase().includes(df.toLowerCase())));
      if (matchingFolder && !selectedFolder) {
        setSelectedFolder(matchingFolder.id);
        setFolderSearch(matchingFolder.name);
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
      const selectedFolderObj = folders.find(f => f.id === selectedFolder);
      
      // Update the account with spam folder config
      const updatedAccount: Account = {
        ...account,
        config: {
          ...account.config,
          spamFolder: selectedFolderObj?.name || selectedFolder,
          spamFolderId: selectedFolder,
        },
      };

      // Save the updated account via IPC
      await window.accountsAPI.update(updatedAccount.id, updatedAccount);
      
      onComplete?.(updatedAccount);
    } catch (error) {
      console.error('Failed to save folder selection:', error);
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
                      const cleanName = folders.find(f => f.id === selectedFolder)?.name || folderSearch || "";
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
                          ? folders.find(f => f.id === selectedFolder)?.name
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
                                key={folder.id}
                                value={folder.name}
                                onSelect={(currentValue) => {
                                  const selected = folders.find(f => f.name === currentValue);
                                  if (selected) {
                                    setSelectedFolder(selected.id);
                                    setFolderSearch(selected.name);
                                  }
                                  setFolderOpen(false);
                                }}
                              >
                                {folder.name}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedFolder === folder.id ? "opacity-100" : "opacity-0"
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
