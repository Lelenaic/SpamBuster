"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { createAIService } from "@/lib/ai"

declare global {
  interface Window {
    store: {
      get: (key: string) => unknown
      set: (key: string, value: unknown) => void
    }
  }
}

export default function Settings() {
  const [aiSource, setAiSource] = useState<string>(() => {
    if (typeof window !== "undefined" && window.store) {
      return (window.store.get("aiSource") as string) ?? "ollama"
    }
    return "ollama"
  })

  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>(() => {
    if (typeof window !== "undefined" && window.store) {
      return (window.store.get("ollamaBaseUrl") as string) ?? "http://localhost:11434"
    }
    return "http://localhost:11434"
  })

  const [ollamaApiKey, setOllamaApiKey] = useState<string>(() => {
    if (typeof window !== "undefined" && window.store) {
      return (window.store.get("ollamaApiKey") as string) ?? ""
    }
    return ""
  })

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== "undefined" && window.store) {
      return (window.store.get("selectedModel") as string) ?? ""
    }
    return ""
  })

  const [models, setModels] = useState<string[]>([])

  const [loadingModels, setLoadingModels] = useState(false)

  const handleAiSourceChange = (value: string) => {
    setAiSource(value)
    if (typeof window !== "undefined" && window.store) {
      window.store.set("aiSource", value)
    }
    toast.success("AI provider updated successfully")
  }

  const handleOllamaBaseUrlChange = (value: string) => {
    setOllamaBaseUrl(value)
    if (typeof window !== "undefined" && window.store) {
      window.store.set("ollamaBaseUrl", value)
    }
    toast.success("Ollama base URL updated")
  }

  const handleOllamaApiKeyChange = (value: string) => {
    setOllamaApiKey(value)
    if (typeof window !== "undefined" && window.store) {
      window.store.set("ollamaApiKey", value)
    }
    toast.success("Ollama API key updated")
  }

  useEffect(() => {
    if (aiSource === 'ollama' && ollamaBaseUrl) {
      fetchModels()
    }
  }, [aiSource, ollamaBaseUrl])

  const fetchModels = async () => {
    setLoadingModels(true)
    try {
      const service = createAIService(aiSource, { baseUrl: ollamaBaseUrl, apiKey: ollamaApiKey })
      const modelNames = await service.listModels()
      setModels(modelNames)
    } catch (error) {
      setModels([])
      toast.error("Error connecting to AI service")
    } finally {
      setLoadingModels(false)
    }
  }

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    if (typeof window !== "undefined" && window.store) {
      window.store.set("selectedModel", value)
    }
    toast.success("Model updated")
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <div className="bg-card rounded-xl border shadow-sm p-8 space-y-8">
        <div className="space-y-2">
          <Label htmlFor="ai-source">AI Provider</Label>
          <Select value={aiSource} onValueChange={handleAiSourceChange}>
            <SelectTrigger id="ai-source">
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ollama">Ollama (Local)</SelectItem>
              <SelectItem value="openrouter">OpenRouter (Cloud)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {aiSource === 'ollama' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ollama-base-url">Ollama Base URL</Label>
              <Input
                id="ollama-base-url"
                type="url"
                placeholder="http://localhost:11434"
                value={ollamaBaseUrl}
                onChange={(e) => handleOllamaBaseUrlChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ollama-api-key">Ollama API Key (Optional)</Label>
              <Input
                id="ollama-api-key"
                type="password"
                placeholder="Enter API key"
                value={ollamaApiKey}
                onChange={(e) => handleOllamaApiKeyChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={selectedModel} onValueChange={handleModelChange} disabled={loadingModels}>
                <SelectTrigger id="model">
                  <SelectValue placeholder={loadingModels ? "Loading models..." : "Select model"} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
