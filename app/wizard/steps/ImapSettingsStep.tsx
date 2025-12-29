"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, AlertCircle } from "lucide-react";
import { MailProviderFactory, MailConnectionConfig, Account } from "@/lib/mail";
import { toast } from "sonner";
import { ImapForm } from "@/components/ImapForm";

interface ImapSettingsStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export function ImapSettingsStep({ onBack, onNext }: ImapSettingsStepProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    host: "",
    port: 993,
    secure: "true", // Default to TLS
    allowUnsignedCertificate: false,
    spamFolder: "",
  });
  const [isTesting, setIsTesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ name: string; path: string }[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error message when user changes any field
    setErrorMessage(null);
  };

  const handleFetchFolders = async () => {
    setLoadingFolders(true);
    try {
      const config: MailConnectionConfig = {
        host: formData.host,
        port: parseInt(formData.port.toString()),
        secure: formData.secure === "true",
        username: formData.username,
        password: formData.password,
        allowUnsignedCertificate: formData.allowUnsignedCertificate,
      };

      if (typeof window !== "undefined" && window.accountsAPI) {
        const result = await window.accountsAPI.listMailboxFolders(config);
        if (result.success) {
          setFolders(result.folders);
          // Auto-select a default if available
          const defaultFolders = ['Spam', 'Junk', 'Spam Folder', 'Junk E-mail'];
          const matchingFolder = result.folders.find(f => defaultFolders.includes(f.name));
          if (matchingFolder && !formData.spamFolder) {
            setFormData(prev => ({ ...prev, spamFolder: matchingFolder.name }));
          }
        } else {
          setErrorMessage(result.error || "Failed to fetch folders");
        }
      }
    } catch (error) {
      setErrorMessage("Failed to fetch folders");
      console.error(error);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setErrorMessage(null); // Clear previous error

    try {
      const config: MailConnectionConfig = {
        host: formData.host,
        port: parseInt(formData.port.toString()),
        secure: formData.secure === "true",
        username: formData.username,
        password: formData.password,
        allowUnsignedCertificate: formData.allowUnsignedCertificate,
        spamFolder: formData.spamFolder,
      };

      const provider = MailProviderFactory.createProvider('imap');
      const result = await provider.testConnection(config);

      if (result.success) {
        toast.success("Connection successful!");
        // Store the account in the accounts array
        if (typeof window !== "undefined" && window.storeAPI) {
          const existingAccounts = (await window.storeAPI.get("accounts")) as Account[] || [];
          const newAccount: Account = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'imap',
            config,
            name: formData.username, // Use username as display name
            status: 'working',
          };
          const updatedAccounts = [...existingAccounts, newAccount];
          await window.storeAPI.set("accounts", updatedAccounts);
          window.electronAPI?.send('accounts-updated');
        }
        if (onNext) onNext();
      } else {
        setErrorMessage(result.error || "Connection failed. Please check your settings.");
      }
    } catch (error) {
      setErrorMessage("Connection failed. Please check your settings.");
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">IMAP Account Settings</CardTitle>
          <CardDescription>
            Enter your IMAP server details to connect your email account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImapForm
            formData={formData}
            onChange={handleInputChange}
            folders={folders}
            onFetchFolders={handleFetchFolders}
            loadingFolders={loadingFolders}
          />
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <Button
            className="w-full"
            onClick={handleTestConnection}
            disabled={isTesting || !formData.username || !formData.password || !formData.host}
          >
            {isTesting ? "Testing..." : "Test connection and continue"}
          </Button>
          {onBack && (
            <Button className="w-full mt-4" variant="ghost" onClick={onBack}>
              Back
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
