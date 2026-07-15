"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, HelpCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Account } from '@/lib/mail';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Microsoft365AuthStepProps {
  onBack?: () => void;
  onComplete?: (accountData: Account) => void;
}

interface DeviceCodeInfo {
  userCode: string;
  deviceCode: string;
  verificationUri: string;
  message: string;
}

export function Microsoft365AuthStep({ onBack, onComplete }: Microsoft365AuthStepProps) {
  const [step, setStep] = useState<'idle' | 'authenticating' | 'success' | 'error'>('idle');
  const [deviceCodeInfo, setDeviceCodeInfo] = useState<DeviceCodeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceCodeRef = useRef<string | null>(null);

  const handleCopyCode = async () => {
    if (deviceCodeInfo) {
      await navigator.clipboard.writeText(deviceCodeInfo.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const finish = async (config: any) => {
    try {
      const accountData = {
        type: 'outlook',
        name: config.userEmail,
        config: {
          authType: 'oauth2',
          oauth2Config: {
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            tenantId: config.tenantId,
            userEmail: config.userEmail,
            accessToken: config.accessToken,
            refreshToken: config.refreshToken,
            tokenExpiry: config.tokenExpiry,
          },
        },
        status: 'working',
      };
      const created = await window.accountsAPI.create(accountData);
      setStep('success');
      toast.success('Microsoft 365 account connected successfully!');
      setTimeout(() => onComplete?.(created), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
      setStep('error');
    }
  };

  const pollForToken = async () => {
    if (!deviceCodeRef.current) return;
    try {
      const result = await window.oauthAPI.pollMicrosoftToken(deviceCodeRef.current);
      if (result.status === 'pending') {
        pollRef.current = setTimeout(pollForToken, 5000);
        return;
      }
      if (result.status === 'success' && result.config) {
        void finish(result.config);
        return;
      }
      setError(result.error || 'Authentication failed');
      setStep('error');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('authorization_pending')) {
        pollRef.current = setTimeout(pollForToken, 5000);
      } else if (message.includes('expired_token')) {
        setError('Authentication expired. Please try again.');
        setStep('error');
      } else {
        setError(message || 'Authentication failed');
        setStep('error');
      }
    }
  };

  const handleConnect = async () => {
    setStep('authenticating');
    setError(null);
    try {
      const info = await window.oauthAPI.getMicrosoftDeviceCode();
      deviceCodeRef.current = info.deviceCode;
      setDeviceCodeInfo({
        userCode: info.userCode,
        deviceCode: info.deviceCode,
        verificationUri: info.verificationUri,
        message: info.message,
      });
      // Begin polling; the user completes auth in a separate browser.
      pollRef.current = setTimeout(pollForToken, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start authentication');
      setStep('error');
    }
  };

  const handleCancel = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    deviceCodeRef.current = null;
    setStep('idle');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connect Microsoft 365</CardTitle>
          <CardDescription>
            Connect your Outlook account to scan for spam emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'idle' && (
            <>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">How to configure Microsoft OAuth</h3>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="step1">
                    <AccordionTrigger className="text-sm py-2">
                      Step 1: Register in Azure AD
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>
                          Go to&nbsp;
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary inline font-normal"
                            onClick={() => window.open('https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade', '_blank', 'noopener,noreferrer')}
                          >
                            Azure Portal App Registrations
                          </Button>
                        </li>
                        <li>Click New registration</li>
                        <li>Name: SpamBuster</li>
                        <li>Supported account types: Accounts in any organizational directory</li>
                        <li>Click Register</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step1b">
                    <AccordionTrigger className="text-sm py-2">
                      Step 2: Enable Public Client Flow
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to Authentication in the left menu</li>
                        <li>Click Settings</li>
                        <li>Enable &quot;Allow public client flows&quot;</li>
                        <li>Click Save</li>
                        <li className="text-red-500 font-bold">
                          Without this setting, authentication will fail with AADSTS7000218!
                        </li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step2">
                    <AccordionTrigger className="text-sm py-2">
                      Step 3: Add permissions
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Click API permissions</li>
                        <li>Click Add a permission</li>
                        <li>Select Microsoft Graph</li>
                        <li>Choose Delegated permissions</li>
                        <li>Add these permissions:
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li>User.Read</li>
                            <li>Mail.Read</li>
                            <li>Mail.ReadWrite</li>
                            <li>offline_access</li>
                          </ul>
                        </li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step3">
                    <AccordionTrigger className="text-sm py-2">
                      Step 4: Configure the server
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Copy the Application (client) ID from the Overview page</li>
                        <li>Add it to the server <code>.env</code> as MICROSOFT_CLIENT_ID</li>
                        <li>Use &quot;common&quot; for the tenant unless you know otherwise</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <Button className="w-full" onClick={handleConnect}>
                Connect Microsoft 365
              </Button>
              {onBack && (
                <Button className="w-full" variant="ghost" onClick={onBack}>
                  Back
                </Button>
              )}
            </>
          )}

          {step === 'authenticating' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {deviceCodeInfo?.message || 'Authenticating...'}
              </p>

              {deviceCodeInfo && (
                <div className="p-4 border rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-2 text-center">Enter this code:</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="flex justify-center items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-2 transition-colors"
                          onClick={handleCopyCode}
                        >
                          <p className="text-2xl font-mono font-bold tracking-wider">
                            {deviceCodeInfo.userCode}
                          </p>
                          {copied ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <Copy className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copied ? 'Copied!' : 'Click to copy'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              <Button
                className="w-full"
                variant="outline"
                onClick={() => deviceCodeInfo && window.open(deviceCodeInfo.verificationUri, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open microsoft.com/devicelogin
              </Button>

              <p className="text-xs text-muted-foreground">
                We&apos;ll automatically detect when you&apos;ve signed in.
              </p>

              {onBack && (
                <Button className="w-full" variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
              <p className="font-medium">Authentication successful!</p>
              <p className="text-sm text-muted-foreground">Redirecting...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-red-500">{error}</p>
              <Button className="w-full" onClick={() => setStep('idle')}>
                Try Again
              </Button>
              {onBack && (
                <Button className="w-full" variant="ghost" onClick={onBack}>
                  Back
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
