"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { useState } from "react";

interface ImapFormData {
  username: string;
  password: string;
  host: string;
  port: number;
  secure: string;
  allowUnsignedCertificate: boolean;
  spamFolder?: string;
}

interface Folder {
  name: string;
  path: string;
}

interface ImapFormProps {
  formData: ImapFormData;
  onChange: (field: string, value: string | boolean) => void;
  prefix?: string;
  folders?: Folder[];
  onFetchFolders?: () => Promise<void>;
  loadingFolders?: boolean;
  showSpamFolder?: boolean;
}

export function ImapForm({ 
  formData, 
  onChange, 
  prefix = "", 
  folders = [], 
  onFetchFolders, 
  loadingFolders = false,
  showSpamFolder = true
}: ImapFormProps) {
  const [spamFolderOpen, setSpamFolderOpen] = useState(false);
  const [spamFolderSearch, setSpamFolderSearch] = useState("");

  const handleInputChange = (field: string, value: string | boolean) => {
    onChange(field, value);
    // Clear error message when user changes any field - handled by parent
  };

  const handleSecureChange = (value: string) => {
    onChange("secure", value);
    // Reset allowUnsignedCertificate when switching to non-secure
    if (value === "false") {
      onChange("allowUnsignedCertificate", false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}username`}>Username</Label>
        <Input
          id={`${prefix}username`}
          type="text"
          placeholder="your.email@example.com"
          value={formData.username}
          onChange={(e) => handleInputChange("username", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}password`}>Password</Label>
        <Input
          id={`${prefix}password`}
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={(e) => handleInputChange("password", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}host`}>Host</Label>
        <Input
          id={`${prefix}host`}
          type="text"
          placeholder="imap.example.com"
          value={formData.host}
          onChange={(e) => handleInputChange("host", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}port`}>Port</Label>
        <Input
          id={`${prefix}port`}
          type="number"
          placeholder="993"
          value={formData.port}
          onChange={(e) => handleInputChange("port", e.target.value)}
        />
      </div>
      {showSpamFolder && (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}spamFolder`}>Spam Folder</Label>
          <div className="flex gap-2">
            <Popover open={spamFolderOpen} onOpenChange={(open) => {
              setSpamFolderOpen(open);
              if (open) {
                const cleanName = folders.find(f => f.path === formData.spamFolder)?.name || formData.spamFolder || "";
                setSpamFolderSearch(cleanName);
              }
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={spamFolderOpen}
                  className="flex-1 justify-between"
                >
                  {formData.spamFolder
                    ? formData.spamFolder.replace(/^INBOX\./, '')
                    : "Select spam folder..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search folder..."
                    className="h-9"
                    value={spamFolderSearch}
                    onValueChange={(value) => {
                      setSpamFolderSearch(value);
                      handleInputChange("spamFolder", value);
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
                            const selectedFolder = folders.find(f => f.name === currentValue);
                            if (selectedFolder) {
                              handleInputChange("spamFolder", selectedFolder.path);
                              setSpamFolderSearch(selectedFolder.name);
                            }
                            setSpamFolderOpen(false);
                          }}
                        >
                          {folder.name}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              folders.find(f => f.path === formData.spamFolder)?.name === folder.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {onFetchFolders && (
              <Button
                onClick={onFetchFolders}
                disabled={loadingFolders}
                variant="outline"
                size="icon"
              >
                <RefreshCw className={`h-4 w-4 ${loadingFolders ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${prefix}secure`}>Security</Label>
        <Select value={formData.secure} onValueChange={handleSecureChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select security type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">TLS/SSL</SelectItem>
            <SelectItem value="false">None</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.secure === "true" && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${prefix}allowUnsignedCertificate`}
            checked={formData.allowUnsignedCertificate}
            onCheckedChange={(checked) => handleInputChange("allowUnsignedCertificate", checked)}
          />
          <Label htmlFor={`${prefix}allowUnsignedCertificate`} className="text-sm">
            Allow unsigned SSL certificates
          </Label>
        </div>
      )}
    </div>
  );
}
