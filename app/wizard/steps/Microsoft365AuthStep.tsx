"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, HelpCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Microsoft365Provider } from '@/lib/mail/microsoft365';
import { Account } from '@/lib/mail';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Microsoft365AuthStepProps {
  onBack?: () => void;
  onComplete?: (accountData: Account) => void;
}

export function Microsoft365AuthStep({ onBack, onComplete }: Microsoft365AuthStepProps) {
  const [clientId, setClientId] = useState('');
  const [tenantId, setTenantId] = useState('common');
  const [step, setStep] = useState<'credentials' | 'authenticating' | 'success' | 'error'>('credentials');
  const [deviceCodeInfo, setDeviceCodeInfo] = useState<{
    userCode: string;
    deviceCode: string;
    verificationUri: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const provider = new Microsoft365Provider();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (deviceCodeInfo) {
      await navigator.clipboard.writeText(deviceCodeInfo.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInitiateAuth = async () => {
    if (!clientId) {
      toast.error('Please enter your Client ID');
      return;
    }

    setStep('authenticating');
    setError(null);

    try {
      const result = await provider.initiateAuth(clientId, tenantId);
      setDeviceCodeInfo({
        userCode: result.userCode,
        deviceCode: result.deviceCode,
        verificationUri: result.verificationUri,
        message: result.message,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate authentication');
      setStep('error');
    }
  };

  const handlePollForToken = async () => {
    if (!deviceCodeInfo) return;

    try {
      const tokenResult = await provider.exchangeCodeForToken(
        clientId,
        tenantId,
        deviceCodeInfo.deviceCode
      );

      // Get user info
      const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokenResult.access_token}` },
      });
      const userInfo = await userResponse.json();

      // eslint-disable-next-line react-hooks/exhaustive-deps
      const expiresAt = Date.now() + tokenResult.expires_in * 1000;

      const accountData: Omit<Account, 'id'> = {
        type: 'outlook',
        name: userInfo.mail || userInfo.userPrincipalName || userInfo.displayName,
        config: {
          authType: 'oauth2',
          oauth2Config: {
            clientId,
            tenantId,
            userEmail: userInfo.mail || userInfo.userPrincipalName,
            accessToken: tokenResult.access_token,
            refreshToken: tokenResult.refresh_token,
            tokenExpiry: new Date(expiresAt),
          },
        },
        status: 'working',
      };

      // Save account via IPC
      const createdAccount = await window.accountsAPI.create(accountData);
      
      setStep('success');
      toast.success('Microsoft 365 account connected successfully!');
      
      setTimeout(() => {
        onComplete?.(createdAccount);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('authorization_pending')) {
        // Keep polling
        setTimeout(handlePollForToken, 5000);
      } else if (errorMessage.includes('expired_token')) {
        setError('Authentication expired. Please try again.');
        setStep('error');
      } else {
        setError(errorMessage || 'Authentication failed');
        setStep('error');
      }
    }
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
          {step === 'credentials' && (
            <>
              {/* Azure Setup Tutorial */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">How to get your Azure credentials</h3>
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
                            onClick={() => window.shellAPI.openExternal('https://entra.microsoft.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade/quickStartType//sourceType/Microsoft_AAD_IAM?Microsoft_AAD_IAM_legacyAADRedirect=true')}
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
                      Step 4: Get your Client ID
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Copy the Application (client) ID from the Overview page</li>
                        <li>Enter it in the form below</li>
                        <li>Use common for Tenant ID if you don't know what to put in it</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Credentials Form */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Application (Client) ID</Label>
                  <Input
                    id="clientId"
                    placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in Azure Portal → Azure AD → App registrations → Your App
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Tenant ID</Label>
                  <Input
                    id="tenantId"
                    placeholder="common"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use common for multitenant apps
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={handleInitiateAuth}>
                Connect Microsoft 365
              </Button>
              {onBack && (
                <Button className="w-full" variant="ghost" onClick={onBack}>
                  Back
                </Button>
              )}
            </>
          )}

          {step === 'authenticating' && !deviceCodeInfo && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p>Initiating authentication...</p>
            </div>
          )}

          {step === 'authenticating' && deviceCodeInfo && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">{deviceCodeInfo.message}</p>
              
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
              
              <Button
                className="w-full"
                variant="outline"
                onClick={() => window.shellAPI.openExternal(deviceCodeInfo.verificationUri)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open microsoft.com/devicelogin
              </Button>
              
              <Button className="w-full" onClick={handlePollForToken}>
                I have entered the code
              </Button>
              {onBack && (
                <Button className="w-full" variant="ghost" onClick={onBack}>
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
              <Button className="w-full" onClick={() => setStep('credentials')}>
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
