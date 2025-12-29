"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ImapFormData {
  username: string;
  password: string;
  host: string;
  port: number;
  secure: string;
  allowUnsignedCertificate: boolean;
}

interface ImapFormProps {
  formData: ImapFormData;
  onChange: (field: string, value: string | boolean) => void;
  prefix?: string;
}

export function ImapForm({ formData, onChange, prefix = "" }: ImapFormProps) {
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
