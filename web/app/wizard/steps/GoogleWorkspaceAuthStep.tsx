"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, HelpCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Account } from '@/lib/mail';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface GoogleWorkspaceAuthStepProps {
  onBack?: () => void;
  onComplete?: (accountData: Account) => void;
}

export function GoogleWorkspaceAuthStep({ onBack, onComplete }: GoogleWorkspaceAuthStepProps) {
  const [step, setStep] = useState<'idle' | 'authenticating' | 'success' | 'error'>('idle');
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.oauthAPI) {
      setCallbackUrl(window.oauthAPI.getGoogleCallbackUrl());
    }
  }, []);

  // Receive the OAuth result posted from the backend callback popup.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (popupRef.current && event.source !== popupRef.current) return;
      const data = event.data;
      if (!data) return;
      if (data.type === 'oauth-error') {
        setError(data.error || 'Authentication failed');
        setStep('error');
        popupRef.current?.close();
        return;
      }
      if (data.type === 'oauth-success' && data.provider === 'google') {
        void finish(data.config);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const finish = async (config: any) => {
    try {
      const accountData = {
        type: 'gmail',
        name: config.userEmail,
        config: {
          authType: 'oauth2',
          oauth2Config: {
            clientId: config.clientId,
            clientSecret: config.clientSecret,
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
      toast.success('Google Workspace account connected successfully!');
      setTimeout(() => onComplete?.(created), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
      setStep('error');
    }
  };

  const handleConnect = async () => {
    setStep('authenticating');
    setError(null);
    try {
      const url = await window.oauthAPI.getGoogleAuthUrl();
      setAuthUrl(url);
      const popup = window.open(url, 'google-oauth', 'width=520,height=720');
      popupRef.current = popup;
      if (!popup) {
        setError('Popup blocked. Please allow popups for this site and try again.');
        setStep('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start authentication');
      setStep('error');
    }
  };

  const copyToClipboard = async () => {
    if (!callbackUrl) return;
    await navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    toast.success('Redirect URI copied!');
    setTimeout(() => setCopied(false), 2000);
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
          {step === 'idle' && (
            <>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">How to configure Google OAuth</h3>
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
                            onClick={() => window.open('https://console.cloud.google.com/', '_blank', 'noopener,noreferrer')}
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
                        <li>Go to APIs &amp; Services → Library</li>
                        <li>Search for &quot;Gmail API&quot;</li>
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
                        <li>Go to APIs &amp; Services → Credentials</li>
                        <li>Click Create Credentials → OAuth client ID</li>
                        <li>Application type: Web application</li>
                        <li className="text-muted-foreground">
                          Add Authorized redirect URI:
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-muted px-2 py-1 rounded text-xs flex-1 break-all">
                              {callbackUrl || 'http://localhost:3333/api/v1/oauth/google/callback'}
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
                        <li>Add the Client ID and Secret to the server <code>.env</code> (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)</li>
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

              <Button className="w-full" onClick={handleConnect}>
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
                  onClick={() => window.open(authUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open sign-in page
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                If the browser did not open, click the button above (allow popups).
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
