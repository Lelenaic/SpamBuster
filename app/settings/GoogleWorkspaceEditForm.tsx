"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Check, ChevronDown } from 'lucide-react';
import { GoogleWorkspaceProvider } from '@/lib/mail/googleworkspace';
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

interface GoogleWorkspaceEditFormProps {
  account: Account;
  onSave: (account: Account) => Promise<void>;
  onCancel: () => void;
}

export function GoogleWorkspaceEditForm({ account, onSave, onCancel }: GoogleWorkspaceEditFormProps) {
  const [folders, setFolders] = useState<{ name: string; id: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(account.config.spamFolderId || '');
  const [folderSearch, setFolderSearch] = useState(account.config.spamFolder || '');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);

  const fetchFolders = async () => {
    setRefreshing(true);
    try {
      const provider = new GoogleWorkspaceProvider();
      
      const config: MailConnectionConfig = {
        oauth2Config: account.config.oauth2Config,
      };

      const folderList = await provider.getMailFolders(config);
      setFolders(folderList);
      
      // Auto-select existing spam folder if available
      if (account.config.spamFolderId) {
        const existingFolder = folderList.find(f => f.id === account.config.spamFolderId);
        if (existingFolder) {
          setSelectedFolder(existingFolder.id);
          setFolderSearch(existingFolder.name);
        }
      } else {
        // Auto-select Spam or Junk folder if available
        const defaultLabels = ['Spam', 'Junk', 'Spam & Bulk'];
        const matchingFolder = folderList.find(f => defaultLabels.some(df => f.name.toLowerCase().includes(df.toLowerCase())));
        if (matchingFolder && !selectedFolder) {
          setSelectedFolder(matchingFolder.id);
          setFolderSearch(matchingFolder.name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [account]);

  const handleSave = async () => {
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

      await onSave(updatedAccount);
    } catch (error) {
      console.error('Failed to save folder selection:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Display user email (read-only) */}
      <div className="space-y-2">
        <Label>Account</Label>
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm font-medium">{account.config.oauth2Config?.userEmail}</p>
          <p className="text-xs text-muted-foreground">Google Workspace account</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Spam/Junk Label</Label>
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
                  : "Select spam label..."}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput
                  placeholder="Search label..."
                  className="h-9"
                  value={folderSearch}
                  onValueChange={(value) => {
                    setFolderSearch(value);
                    setSelectedFolder(value);
                  }}
                />
                <CommandList>
                  <CommandEmpty>No label found.</CommandEmpty>
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
          Spam emails will be moved to this label
        </p>
      </div>

      {loading ? (
        <div className="text-center space-y-4 py-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading labels...</p>
        </div>
      ) : (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedFolder || saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}
