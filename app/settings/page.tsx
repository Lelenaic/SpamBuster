"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { RefreshCw, Check, ChevronDown, Trash2, Edit, Power } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createAIService } from "@/lib/ai"
import { Account, AccountStatus, MailProviderFactory } from "@/lib/mail"
import "@/lib/types"

const getStatusColor = (status: AccountStatus) => {
  switch (status) {
    case 'working':
      return 'bg-green-500'
    case 'trouble':
      return 'bg-red-500'
    case 'disabled':
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
}

export default function Settings() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ai')

  const [aiSource, setAiSource] = useState<string>("ollama")
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>("http://localhost:11434")
  const [ollamaApiKey, setOllamaApiKey] = useState<string>("")
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")

  const [models, setModels] = useState<string[]>([])

  const [loadingModels, setLoadingModels] = useState(false)

  const [modelComboboxOpen, setModelComboboxOpen] = useState(false)

  const [testingConnection, setTestingConnection] = useState(false)

  const [mailAccounts, setMailAccounts] = useState<Account[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false)
  const [accountToModify, setAccountToModify] = useState<Account | null>(null)
  const [modifyFormData, setModifyFormData] = useState({
    username: "",
    password: "",
    host: "",
    port: 993,
    secure: "true",
    allowUnsignedCertificate: false,
  })
  
  const [testingModify, setTestingModify] = useState(false)
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      if (typeof window !== "undefined" && window.storeAPI) {
        setAiSource((await window.storeAPI.get("aiSource") as string) ?? "ollama")
        setOllamaBaseUrl((await window.storeAPI.get("ollamaBaseUrl") as string) ?? "http://localhost:11434")
        setOllamaApiKey((await window.storeAPI.get("ollamaApiKey") as string) ?? "")
        setOpenRouterApiKey((await window.storeAPI.get("openRouterApiKey") as string) ?? "")
        setSelectedModel((await window.storeAPI.get("selectedModel") as string) ?? "")

        const mailAccounts = (await window.storeAPI.get("accounts") as Account[]) || []
        setMailAccounts(mailAccounts)
      }
    }
    loadSettings()

    // Listen for account updates
    const handleAccountsUpdated = () => {
      loadSettings()
    }

    window.addEventListener('accounts-updated', handleAccountsUpdated)

    return () => {
      window.removeEventListener('accounts-updated', handleAccountsUpdated)
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`/settings?${params.toString()}`, { scroll: false })
  }

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
  }, [aiSource, ollamaBaseUrl, openRouterApiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (accountToModify) {
      setModifyFormData({
        username: accountToModify.config.username,
        password: accountToModify.config.password,
        host: accountToModify.config.host,
        port: accountToModify.config.port,
        secure: accountToModify.config.secure ? "true" : "false",
        allowUnsignedCertificate: accountToModify.config.allowUnsignedCertificate || false,
      })
    }
  }, [accountToModify])

  const handleDeleteAccount = (account: Account) => {
    setAccountToDelete(account)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (accountToDelete) {
      const updatedAccounts = mailAccounts.filter(acc => acc.id !== accountToDelete.id)
      setMailAccounts(updatedAccounts)
      if (typeof window !== "undefined" && window.storeAPI) {
        await window.storeAPI.set("accounts", updatedAccounts)
        window.dispatchEvent(new CustomEvent('accounts-updated'))
      }
      toast.success("Account deleted successfully")
    }
    setDeleteDialogOpen(false)
    setAccountToDelete(null)
  }

  const handleModifyAccount = (account: Account) => {
    setAccountToModify(account)
    setModifyDialogOpen(true)
  }

  const handleTestAccount = async (account: Account) => {
    setTestingAccountId(account.id)
    try {
      const provider = MailProviderFactory.createProvider(account.type)
      const result = await provider.testConnection(account.config)
      if (result.success) {
        toast.success("Connection successful")
      } else {
        toast.error(result.error || "Connection failed")
      }
    } catch {
      toast.error("Connection failed")
    } finally {
      setTestingAccountId(null)
    }
  }

  const handleModifyFormChange = (field: string, value: string | boolean) => {
    setModifyFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveModify = async () => {
    if (accountToModify) {
      setTestingModify(true)
      const newConfig = {
        host: modifyFormData.host,
        port: parseInt(modifyFormData.port.toString()),
        secure: modifyFormData.secure === "true",
        username: modifyFormData.username,
        password: modifyFormData.password,
        allowUnsignedCertificate: modifyFormData.allowUnsignedCertificate,
      }
      
      // Test the connection first
      try {
        const provider = MailProviderFactory.createProvider(accountToModify.type)
        const result = await provider.testConnection(newConfig)
        
        if (result.success) {
          const updatedAccount = {
            ...accountToModify,
            config: newConfig,
            name: modifyFormData.username,
            status: 'working' as const,
          }
          
          const updatedAccounts = mailAccounts.map(acc => acc.id === accountToModify.id ? updatedAccount : acc)
          setMailAccounts(updatedAccounts)
          if (typeof window !== "undefined" && window.storeAPI) {
            await window.storeAPI.set("accounts", updatedAccounts)
            window.dispatchEvent(new CustomEvent('accounts-updated'))
          }
          toast.success("Account updated successfully")
          setModifyDialogOpen(false)
          setAccountToModify(null)
        } else {
          toast.error(result.error || "Connection test failed. Please check your settings.")
        }
      } catch {
        toast.error("Connection test failed. Please check your settings.")
      } finally {
        setTestingModify(false)
      }
    }
  }

  const handleToggleAccount = async (account: Account) => {
    const newStatus: AccountStatus = account.status === 'disabled' ? 'working' : 'disabled'
    const updatedAccount = {
      ...account,
      status: newStatus,
    }
    
    const updatedAccounts = mailAccounts.map(acc => acc.id === account.id ? updatedAccount : acc)
    setMailAccounts(updatedAccounts)
    if (typeof window !== "undefined" && window.storeAPI) {
      await window.storeAPI.set("accounts", updatedAccounts)
      window.dispatchEvent(new CustomEvent('accounts-updated'))
    }
    
    toast.success(`Account ${newStatus === 'disabled' ? 'disabled' : 'enabled'} successfully`)
  }

  const fetchModels = async () => {
    setLoadingModels(true)
    try {
      const config = aiSource === 'ollama'
        ? { baseUrl: ollamaBaseUrl, apiKey: ollamaApiKey }
        : { apiKey: openRouterApiKey }
      const service = createAIService(aiSource, config)
      const modelNames = await service.listModels()
      setModels(modelNames.sort((a: string, b: string) => a.localeCompare(b)))
    } catch {
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

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const config = aiSource === 'ollama'
        ? { baseUrl: ollamaBaseUrl, apiKey: ollamaApiKey }
        : { apiKey: openRouterApiKey }
      const service = createAIService(aiSource, config)
      await service.testConnection()
      toast.success("Connection successful")
    } catch {
      toast.error("Connection failed")
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <div className="bg-card rounded-xl border shadow-sm p-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai">AI Account</TabsTrigger>
            <TabsTrigger value="mail">Mail Accounts</TabsTrigger>
          </TabsList>
          <TabsContent value="ai" className="space-y-8 mt-6">
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
          </TabsContent>
          <TabsContent value="mail" className="space-y-8 mt-6">
            <h2 className="text-xl font-semibold">Mail Accounts</h2>
            {mailAccounts.length === 0 ? (
              <p className="text-muted-foreground">No mail accounts configured.</p>
            ) : (
              <div className="space-y-4">
                {mailAccounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(account.status)}`}></span>
                      <div>
                        <p className="font-medium">{account.name || account.config.username}</p>
                        <p className="text-sm text-muted-foreground">{account.type.toUpperCase()} - Status: {account.status}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleTestAccount(account)} 
                        title="Test Connection"
                        disabled={testingAccountId === account.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${testingAccountId === account.id ? 'animate-spin' : ''}`} />
                        {testingAccountId === account.id ? 'Testing...' : 'Test'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleToggleAccount(account)} 
                        title={account.status === 'disabled' ? 'Enable Account' : 'Disable Account'}
                      >
                        <Power className="h-4 w-4 mr-2" />
                        {account.status === 'disabled' ? 'Enable' : 'Disable'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleModifyAccount(account)} title="Modify">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteAccount(account)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the account {accountToDelete?.name || accountToDelete?.config.username}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modify Account</DialogTitle>
            <DialogDescription>Update your account settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modify-username">Username</Label>
              <Input
                id="modify-username"
                type="text"
                value={modifyFormData.username}
                onChange={(e) => handleModifyFormChange("username", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-password">Password</Label>
              <Input
                id="modify-password"
                type="password"
                value={modifyFormData.password}
                onChange={(e) => handleModifyFormChange("password", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-host">Host</Label>
              <Input
                id="modify-host"
                type="text"
                value={modifyFormData.host}
                onChange={(e) => handleModifyFormChange("host", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-port">Port</Label>
              <Input
                id="modify-port"
                type="number"
                value={modifyFormData.port}
                onChange={(e) => handleModifyFormChange("port", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-secure">Security</Label>
              <Select value={modifyFormData.secure} onValueChange={(value) => {
                handleModifyFormChange("secure", value)
                if (value === "false") {
                  handleModifyFormChange("allowUnsignedCertificate", false)
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">TLS/SSL</SelectItem>
                  <SelectItem value="false">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {modifyFormData.secure === "true" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="modify-allowUnsignedCertificate"
                  checked={modifyFormData.allowUnsignedCertificate}
                  onCheckedChange={(checked) => handleModifyFormChange("allowUnsignedCertificate", checked)}
                />
                <Label htmlFor="modify-allowUnsignedCertificate" className="text-sm">
                  Allow unsigned SSL certificates
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveModify} disabled={testingModify}>
              {testingModify ? "Testing..." : "Test and Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
