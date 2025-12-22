"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, AlertCircle } from "lucide-react";
import { MailProviderFactory, MailConnectionConfig } from "@/lib/mail";
import { toast } from "sonner";

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
  });
  const [isTesting, setIsTesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error message when user changes any field
    setErrorMessage(null);
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
      };

      const provider = MailProviderFactory.createProvider('imap');
      const result = await provider.testConnection(config);

      if (result.success) {
        toast.success("Connection successful!");
        // Store the connection data
        if (typeof window !== "undefined" && window.storeAPI) {
          await window.storeAPI.set("imapConfig", config);
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
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="your.email@example.com"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              type="text"
              placeholder="imap.example.com"
              value={formData.host}
              onChange={(e) => handleInputChange("host", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              placeholder="993"
              value={formData.port}
              onChange={(e) => handleInputChange("port", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secure">Security</Label>
            <Select value={formData.secure} onValueChange={(value) => {
              handleInputChange("secure", value);
              // Reset allowUnsignedCertificate when switching to non-secure
              if (value === "false") {
                handleInputChange("allowUnsignedCertificate", false);
              }
            }}>
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
                id="allowUnsignedCertificate"
                checked={formData.allowUnsignedCertificate}
                onCheckedChange={(checked) => handleInputChange("allowUnsignedCertificate", checked)}
              />
              <Label htmlFor="allowUnsignedCertificate" className="text-sm">
                Allow unsigned SSL certificates
              </Label>
            </div>
          )}
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
