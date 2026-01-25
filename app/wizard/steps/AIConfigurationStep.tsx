"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertCircle, 
  Settings,
  X,
  Loader2
} from "lucide-react";
import { createAIService } from "@/lib/ai";

interface AIConfigurationStepProps {
  onClose?: () => void;
}

type ConfigurationStatus = "checking" | "configured" | "not_configured";

interface AIConfigState {
  source: string;
  hasCredentials: boolean;
  hasModel: boolean;
  connectionWorking: boolean;
  isFullyConfigured: boolean;
}

export function AIConfigurationStep({ onClose }: AIConfigurationStepProps) {
  const [configStatus, setConfigStatus] = useState<ConfigurationStatus>("checking");
  const [aiConfig, setAiConfig] = useState<AIConfigState | null>(null);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        if (typeof window === "undefined" || !window.aiAPI) {
          setConfigStatus("not_configured");
          return;
        }

        const aiSource = await window.aiAPI.getAISource();
        const selectedModel = await window.aiAPI.getSelectedModel();
        let hasCredentials = false;
        let connectionWorking = false;

        try {
          const aiService = await createAIService();
          hasCredentials = aiService.isConfigured();
          if (hasCredentials) {
            try {
              await aiService.testConnection();
              connectionWorking = true;
            } catch {
              connectionWorking = false;
            }
          }
        } catch {
          // Service creation failed, AI is not configured
          hasCredentials = false;
          connectionWorking = false;
        }

        const hasModel = !!selectedModel;
        const isFullyConfigured = hasCredentials && hasModel;

        setAiConfig({
          source: aiSource,
          hasCredentials,
          hasModel,
          connectionWorking,
          isFullyConfigured,
        });

        setConfigStatus(isFullyConfigured ? "configured" : "not_configured");
      } catch (error) {
        console.error("Failed to check AI configuration:", error);
        setConfigStatus("not_configured");
      }
    };

    checkConfig();
  }, []);

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.close();
    }
  };

  const getProviderDisplayName = (): string => {
    if (!aiConfig) return "Unknown";
    
    switch (aiConfig.source) {
      case "ollama":
        return "Ollama (Local)";
      case "openrouter":
        return "OpenRouter (Cloud)";
      default:
        return aiConfig.source;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center ${
            configStatus === "checking" 
              ? "bg-muted" 
              : configStatus === "configured" 
                ? "bg-green-100 dark:bg-green-900" 
                : "bg-amber-100 dark:bg-amber-900"
          }`}>
            {configStatus === "checking" ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : configStatus === "configured" ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <CardTitle className="text-2xl">AI Configuration</CardTitle>
          <CardDescription>
            {configStatus === "checking" 
              ? "Checking AI configuration..."
              : aiConfig?.isFullyConfigured
                ? "Your AI is configured and ready to use!"
                : "You need to configure an AI model for spam detection"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configStatus === "checking" && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Please wait while we check your AI configuration...</p>
            </div>
          )}

          {aiConfig && !aiConfig.isFullyConfigured && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/50 p-4 rounded-md border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      AI Not Configured
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Spambuster needs an AI model to analyze emails for spam detection. You can configure it from the settings tab in the main window.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Provider:</span>
                  <Badge variant="outline">{getProviderDisplayName()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Key:</span>
                  <Badge variant={aiConfig.connectionWorking ? "default" : "destructive"}>
                    {aiConfig.connectionWorking ? "Set" : "Missing"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {aiConfig && aiConfig.isFullyConfigured && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/50 p-4 rounded-md border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      AI Configured Successfully
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your {getProviderDisplayName()} model is ready for spam detection.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Provider:</span>
                  <Badge variant="default">{getProviderDisplayName()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Key:</span>
                  <Badge variant="default">Configured</Badge>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-4">
              {!aiConfig?.isFullyConfigured 
                ? "Configure your AI settings in Settings → AI tab to enable spam detection."
                : "You can modify AI settings anytime from Settings → AI tab."}
            </p>
            <Button className="w-full" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              {aiConfig?.isFullyConfigured ? "Continue to App" : "Close"}
            </Button>
            {!aiConfig?.isFullyConfigured && (
              <Button 
                className="w-full mt-2" 
                variant="outline"
                onClick={() => {
                  if (typeof window !== "undefined" && window.shellAPI) {
                    window.shellAPI.openExternal("https://spambuster.app/settings");
                  }
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Open Settings
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
