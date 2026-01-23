"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { RefreshCw, Check, ChevronDown } from "lucide-react"
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

interface AIAccountTabProps {
  aiSource: string
  setAiSource: (value: string) => void
  ollamaBaseUrl: string
  setOllamaBaseUrl: (value: string) => void
  ollamaApiKey: string
  setOllamaApiKey: (value: string) => void
  openRouterApiKey: string
  setOpenRouterApiKey: (value: string) => void
  selectedModel: string
  setSelectedModel: (value: string) => void
  models: string[]
  setModels: (models: string[]) => void
  loadingModels: boolean
  setLoadingModels: (loading: boolean) => void
  modelComboboxOpen: boolean
  setModelComboboxOpen: (open: boolean) => void
  testingConnection: boolean
  setTestingConnection: (testing: boolean) => void
  selectedEmbedModel: string
  setSelectedEmbedModel: (value: string) => void
  embedModels: string[]
  setEmbedModels: (models: string[]) => void
  loadingEmbedModels: boolean
  setLoadingEmbedModels: (loading: boolean) => void
  embedModelComboboxOpen: boolean
  setEmbedModelComboboxOpen: (open: boolean) => void
  testingEmbedConnection: boolean
  setTestingEmbedConnection: (testing: boolean) => void
  handleAiSourceChange: (value: string) => Promise<void>
  handleOllamaBaseUrlChange: (value: string) => Promise<void>
  handleOllamaApiKeyChange: (value: string) => Promise<void>
  handleOpenRouterApiKeyChange: (value: string) => Promise<void>
  fetchModels: () => Promise<void>
  handleModelChange: (value: string) => Promise<void>
  handleTestConnection: () => Promise<void>
  fetchEmbedModels: () => Promise<void>
  handleEmbedModelChange: (value: string) => Promise<void>
  handleTestEmbedConnection: () => Promise<void>
  enableVectorDB: boolean
  setEnableVectorDB: (value: boolean) => void
  handleEnableVectorDBChange: (value: boolean) => Promise<void>
}

export default function AIAccountTab({
  aiSource,
  ollamaBaseUrl,
  ollamaApiKey,
  openRouterApiKey,
  selectedModel,
  models,
  loadingModels,
  modelComboboxOpen,
  setModelComboboxOpen,
  testingConnection,
  selectedEmbedModel,
  embedModels,
  loadingEmbedModels,
  embedModelComboboxOpen,
  setEmbedModelComboboxOpen,
  testingEmbedConnection,
  handleAiSourceChange,
  handleOllamaBaseUrlChange,
  handleOllamaApiKeyChange,
  handleOpenRouterApiKeyChange,
  fetchModels,
  handleModelChange,
  handleTestConnection,
  fetchEmbedModels,
  handleEmbedModelChange,
  handleTestEmbedConnection,
  enableVectorDB,
  setEnableVectorDB,
  handleEnableVectorDBChange,
}: AIAccountTabProps) {
  return (
    <TabsContent value="ai" className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">AI Model Configuration</h2>
        <p className="text-muted-foreground">Select the AI model that will be used to analyze your emails for spam detection.</p>
      </div>
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
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                          <Check
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
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {(aiSource === 'ollama' || aiSource === 'openrouter') && (
        <div className="space-y-2">
          <Button
            onClick={handleTestConnection}
            disabled={testingConnection || (aiSource === 'ollama' && !ollamaBaseUrl) || (aiSource === 'openrouter' && !openRouterApiKey)}
            variant="outline"
          >
            {testingConnection ? "Testing..." : "Test Connection"}
          </Button>
        </div>
      )}
      <Separator />
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Embedding Model Configuration</h2>
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-md border border-amber-200 dark:border-amber-800">
          <strong>Note:</strong> Embeddings require Ollama to be installed and running. Then configure it from the settings above. You can still use OpenRouter or any other provider, just configure Ollama and then change.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enable-vector-db"
            checked={enableVectorDB}
            onCheckedChange={handleEnableVectorDBChange}
          />
          <Label htmlFor="enable-vector-db" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Enable Vector Database for improved spam detection
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, analyzed emails are stored in a local vector database to provide contextual examples to the AI for better spam detection accuracy. Requires an embedding model to be configured.
        </p>
      </div>
      {enableVectorDB && (
        <div className="space-y-2">
          <Label htmlFor="embed-model">Embedding Model (Ollama)</Label>
          <div className="flex gap-2">
            <Popover open={embedModelComboboxOpen} onOpenChange={setEmbedModelComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={embedModelComboboxOpen}
                  className="flex-1 justify-between"
                  disabled={loadingEmbedModels || !ollamaBaseUrl}
                >
                  {selectedEmbedModel
                    ? embedModels.find((model) => model === selectedEmbedModel)
                    : loadingEmbedModels ? "Loading models..." : "Select embedding model..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search embedding model..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No embedding model found.</CommandEmpty>
                    <CommandGroup>
                      {embedModels.map((model) => (
                        <CommandItem
                          key={model}
                          value={model}
                          onSelect={(currentValue) => {
                            handleEmbedModelChange(currentValue === selectedEmbedModel ? "" : currentValue)
                            setEmbedModelComboboxOpen(false)
                          }}
                        >
                          {model}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedEmbedModel === model ? "opacity-100" : "opacity-0"
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
              onClick={fetchEmbedModels}
              disabled={loadingEmbedModels || !ollamaBaseUrl}
              variant="outline"
              size="icon"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {enableVectorDB && (
        <div className="space-y-2">
          <Button
            onClick={handleTestEmbedConnection}
            disabled={testingEmbedConnection || !ollamaBaseUrl}
            variant="outline"
          >
            {testingEmbedConnection ? "Testing..." : "Test Embed Connection"}
          </Button>
        </div>
      )}
    </TabsContent>
  )
}
