"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, HelpCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleWorkspaceProvider } from '@/lib/mail/googleworkspace';
import { Account } from '@/lib/mail';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface GoogleWorkspaceAuthStepProps {
  onBack?: () => void;
  onComplete?: (accountData: Account) => void;
}

export function GoogleWorkspaceAuthStep({ onBack, onComplete }: GoogleWorkspaceAuthStepProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [step, setStep] = useState<'credentials' | 'authenticating' | 'success' | 'error'>('credentials');
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const provider = new GoogleWorkspaceProvider();
  const serverRef = useRef<{ close: () => void } | null>(null);

  // Cleanup server on unmount
  useEffect(() => {
    return () => {
      if (serverRef.current) {
        serverRef.current.close();
      }
    };
  }, []);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText('http://127.0.0.1:38467/callback');
    setCopied(true);
    toast.success('Redirect URI copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInitiateAuth = async () => {
    if (!clientId || !clientSecret) {
      toast.error('Please enter both Client ID and Client Secret');
      return;
    }

    setStep('authenticating');
    setError(null);

    try {
      // Generate OAuth URL
      const redirectUri = 'http://127.0.0.1:38467/callback';
      const result = await provider.initiateAuth(clientId, clientSecret, redirectUri);
      setAuthUrl(result.authUrl);

      // Open browser for OAuth
      await window.shellAPI.openExternal(result.authUrl);

      // Start local server to listen for callback
      startOAuthServer(clientId, clientSecret, redirectUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate authentication');
      setStep('error');
    }
  };

  const startOAuthServer = (clientId: string, clientSecret: string, redirectUri: string) => {
    // Use IPC to start OAuth server in main process
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.oauthAPI as any).startGoogleOAuthServer(redirectUri).then((result: { success: boolean; port?: number; error?: string }) => {
      if (!result.success) {
        setError(result.error || 'Failed to start OAuth server');
        setStep('error');
        return;
      }

      // Listen for OAuth callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.oauthAPI as any).onGoogleOAuthCallback((data: { code: string; error?: string }) => {
        if (data.error) {
          setError(data.error);
          setStep('error');
          return;
        }

        handleExchangeCode(clientId, clientSecret, data.code, redirectUri);
      });
    });
  };

  const handleExchangeCode = async (clientId: string, clientSecret: string, code: string, redirectUri: string) => {
    try {
      const tokenResult = await provider.exchangeCodeForToken(clientId, clientSecret, code, redirectUri);

      // Get user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenResult.access_token}` },
      });
      const userInfo = await userResponse.json();

      // eslint-disable-next-line react-hooks/exhaustive-deps
      const expiresAt = Date.now() + tokenResult.expires_in * 1000;

      const accountData: Omit<Account, 'id'> = {
        type: 'gmail',
        name: userInfo.email || userInfo.name,
        config: {
          authType: 'oauth2',
          oauth2Config: {
            clientId,
            clientSecret,
            userEmail: userInfo.email,
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
      toast.success('Google Workspace account connected successfully!');
      
      setTimeout(() => {
        onComplete?.(createdAccount);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      setStep('error');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connect Google Workspace</CardTitle>
          <CardDescription>
            Connect your Gmail account to scan for spam emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'credentials' && (
            <>
              {/* Google Cloud Setup Tutorial */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">How to get your Google credentials</h3>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="step1">
                    <AccordionTrigger className="text-sm py-2">
                      Step 1: Create Google Cloud Project
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>
                          Go to&nbsp;
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary inline font-normal"
                            onClick={() => window.shellAPI.openExternal('https://console.cloud.google.com/')}
                          >
                            Google Cloud Console
                          </Button>
                        </li>
                        <li>Create a new project or select existing</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step2">
                    <AccordionTrigger className="text-sm py-2">
                      Step 2: Enable Gmail API
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to APIs & Services → Library</li>
                        <li>Search for "Gmail API"</li>
                        <li>Click Enable</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step3">
                    <AccordionTrigger className="text-sm py-2">
                      Step 3: Create OAuth Credentials
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to APIs & Services → Credentials</li>
                        <li>Click Create Credentials → OAuth client ID</li>
                        <li>
                            Application type: Web application
                        </li>
                        <li className="text-muted-foreground">
                          Add Authorized redirect URI:
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-muted px-2 py-1 rounded text-xs flex-1">
                              http://127.0.0.1:38467/callback
                            </code>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={copyToClipboard}
                            >
                              {copied ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </li>
                        <li>Download JSON with Client ID and Secret</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step4">
                    <AccordionTrigger className="text-sm py-2">
                      Step 4: Add Scopes
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to OAuth consent screen → Data access</li>
                        <li>Click Add</li>
                        <li>Add scopes:
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li>.../auth/gmail.readonly</li>
                            <li>.../auth/gmail.modify</li>
                            <li>.../auth/userinfo.email</li>
                          </ul>
                        </li>
                        <li>Add your email in the test users</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Credentials Form */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    placeholder="e.g., 123456789-abc.apps.googleusercontent.com"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    From OAuth client credentials JSON
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="Enter your Client Secret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    From OAuth client credentials JSON
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={handleInitiateAuth}>
                Connect Google Workspace
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
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-muted-foreground">
                A browser window has opened for Google sign-in.<br />
                Please complete the authorization there.
              </p>
              {authUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.shellAPI.openExternal(authUrl)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open sign-in page
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                If the browser did not open, click the button above.
              </p>
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
