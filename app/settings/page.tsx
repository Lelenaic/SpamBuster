"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { IconRefresh, IconCheck, IconChevronDown } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createAIService } from "@/lib/ai"
import "@/lib/types"

export default function Settings() {
  const [aiSource, setAiSource] = useState<string>("ollama")
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>("http://localhost:11434")
  const [ollamaApiKey, setOllamaApiKey] = useState<string>("")
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")

  const [models, setModels] = useState<string[]>([])

  const [loadingModels, setLoadingModels] = useState(false)

  const [modelComboboxOpen, setModelComboboxOpen] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      if (typeof window !== "undefined" && window.storeAPI) {
        setAiSource((await window.storeAPI.get("aiSource") as string) ?? "ollama")
        setOllamaBaseUrl((await window.storeAPI.get("ollamaBaseUrl") as string) ?? "http://localhost:11434")
        setOllamaApiKey((await window.storeAPI.get("ollamaApiKey") as string) ?? "")
        setOpenRouterApiKey((await window.storeAPI.get("openRouterApiKey") as string) ?? "")
        setSelectedModel((await window.storeAPI.get("selectedModel") as string) ?? "")
      }
    }
    loadSettings()
  }, [])

  const handleAiSourceChange = async (value: string) => {
    setAiSource(value)
    setSelectedModel("")
    setModels([])
    if (typeof window !== "undefined" && window.storeAPI) {
      await window.storeAPI.set("aiSource", value)
      await window.storeAPI.set("selectedModel", "")
    }
    toast.success("AI provider updated successfully")
  }

  const handleOllamaBaseUrlChange = async (value: string) => {
    setOllamaBaseUrl(value)
    if (typeof window !== "undefined" && window.storeAPI) {
      await window.storeAPI.set("ollamaBaseUrl", value)
    }
    toast.success("Ollama base URL updated")
  }

  const handleOllamaApiKeyChange = async (value: string) => {
    setOllamaApiKey(value)
    if (typeof window !== "undefined" && window.storeAPI) {
      await window.storeAPI.set("ollamaApiKey", value)
    }
    toast.success("Ollama API key updated")
  }

  const handleOpenRouterApiKeyChange = async (value: string) => {
    setOpenRouterApiKey(value)
    if (typeof window !== "undefined" && window.storeAPI) {
      await window.storeAPI.set("openRouterApiKey", value)
    }
    toast.success("OpenRouter API key updated")
  }

  useEffect(() => {
    if ((aiSource === 'ollama' && ollamaBaseUrl) || (aiSource === 'openrouter' && openRouterApiKey)) {
      fetchModels()
    }
  }, [aiSource, ollamaBaseUrl, openRouterApiKey])

  const fetchModels = async () => {
    setLoadingModels(true)
    try {
      const config = aiSource === 'ollama'
        ? { baseUrl: ollamaBaseUrl, apiKey: ollamaApiKey }
        : { apiKey: openRouterApiKey }
      const service = createAIService(aiSource, config)
      const modelNames = await service.listModels()
      setModels(modelNames.sort((a: string, b: string) => a.localeCompare(b)))
    } catch (error) {
      setModels([])
      toast.error("Error connecting to AI service")
    } finally {
      setLoadingModels(false)
    }
  }

  const handleModelChange = async (value: string) => {
    setSelectedModel(value)
    if (typeof window !== "undefined" && window.storeAPI) {
      await window.storeAPI.set("selectedModel", value)
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
          </div>
        )}
        {aiSource === 'openrouter' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openrouter-api-key">OpenRouter API Key</Label>
              <Input
                id="openrouter-api-key"
                type="password"
                placeholder="Enter OpenRouter API key"
                value={openRouterApiKey}
                onChange={(e) => handleOpenRouterApiKeyChange(e.target.value)}
              />
            </div>
          </div>
        )}
        {(aiSource === 'ollama' || aiSource === 'openrouter') && (
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <div className="flex gap-2">
              <Popover open={modelComboboxOpen} onOpenChange={setModelComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={modelComboboxOpen}
                    className="flex-1 justify-between"
                    disabled={loadingModels || (aiSource === 'ollama' && !ollamaBaseUrl) || (aiSource === 'openrouter' && !openRouterApiKey)}
                  >
                    {selectedModel
                      ? models.find((model) => model === selectedModel)
                      : loadingModels ? "Loading models..." : "Select model..."}
                    <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search model..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No model found.</CommandEmpty>
                      <CommandGroup>
                        {models.map((model) => (
                          <CommandItem
                            key={model}
                            value={model}
                            onSelect={(currentValue) => {
                              handleModelChange(currentValue === selectedModel ? "" : currentValue)
                              setModelComboboxOpen(false)
                            }}
                          >
                            {model}
                            <IconCheck
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedModel === model ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                onClick={fetchModels}
                disabled={loadingModels || (aiSource === 'ollama' && !ollamaBaseUrl) || (aiSource === 'openrouter' && !openRouterApiKey)}
                variant="outline"
                size="icon"
              >
                <IconRefresh className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
