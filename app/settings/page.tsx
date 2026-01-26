"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { createAIService } from "@/lib/ai"
import { Account, AccountStatus, MailProviderFactory } from "@/lib/mail"
import { AlertsManager } from "@/lib/alerts"
import { toast } from "sonner"
import "@/lib/types"
import GeneralTab from "./GeneralTab"
import AIAccountTab from "./AIAccountTab"
import MailAccountsTab from "./MailAccountsTab"

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general')

  const [aiSource, setAiSource] = useState<string>("ollama")
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>("http://localhost:11434")
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")

  const [models, setModels] = useState<string[]>([])

  const [loadingModels, setLoadingModels] = useState(false)

  const [modelComboboxOpen, setModelComboboxOpen] = useState(false)

  const [testingConnection, setTestingConnection] = useState(false)

  const [selectedEmbedModel, setSelectedEmbedModel] = useState<string>("")

  const [embedModels, setEmbedModels] = useState<string[]>([])

  const [loadingEmbedModels, setLoadingEmbedModels] = useState(false)

  const [embedModelComboboxOpen, setEmbedModelComboboxOpen] = useState(false)

  const [testingEmbedConnection, setTestingEmbedConnection] = useState(false)

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
    spamFolder: "Spam",
  })
  
  const [testingModify, setTestingModify] = useState(false)
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null)
  const [modifyFolders, setModifyFolders] = useState<{ name: string; path: string }[]>([])
  const [loadingModifyFolders, setLoadingModifyFolders] = useState(false)
  const [aiSensitivity, setAiSensitivity] = useState<number>(7)
  const [emailAgeDays, setEmailAgeDays] = useState<number>(1)
  const [simplifyEmailContent, setSimplifyEmailContent] = useState<boolean>(true)
  const [simplifyEmailContentMode, setSimplifyEmailContentMode] = useState<string>("aggressive")
  const [enableCron, setEnableCron] = useState<boolean>(true)
  const [cronExpression, setCronExpression] = useState<string>("* * * * *")
  const [enableVectorDB, setEnableVectorDB] = useState<boolean>(false)
  const [embedModelChangeDialogOpen, setEmbedModelChangeDialogOpen] = useState(false)
  const [pendingEmbedModel, setPendingEmbedModel] = useState<string>("")
  const [customizeSpamGuidelines, setCustomizeSpamGuidelines] = useState<boolean>(false)
  const [customSpamGuidelines, setCustomSpamGuidelines] = useState<string>("")

  useEffect(() => {
    const loadSettings = async () => {
      if (typeof window !== "undefined" && window.aiAPI) {
        setAiSource(await window.aiAPI.getAISource())
        setOllamaBaseUrl(await window.aiAPI.getOllamaBaseUrl())
        setOpenRouterApiKey(await window.aiAPI.getOpenRouterApiKey())
        setSelectedModel(await window.aiAPI.getSelectedModel())
        setSelectedEmbedModel(await window.aiAPI.getSelectedEmbedModel())
        setAiSensitivity(await window.aiAPI.getAISensitivity())
        setEmailAgeDays(await window.aiAPI.getEmailAgeDays())
        setSimplifyEmailContent(await window.aiAPI.getSimplifyEmailContent())
        setSimplifyEmailContentMode(await window.aiAPI.getSimplifyEmailContentMode())
        setEnableCron(await window.aiAPI.getEnableCron())
        setCronExpression(await window.aiAPI.getCronExpression())
        setEnableVectorDB(await window.aiAPI.getEnableVectorDB())
        setCustomizeSpamGuidelines(await window.aiAPI.getCustomizeSpamGuidelines())
        setCustomSpamGuidelines(await window.aiAPI.getCustomSpamGuidelines())

        const mailAccounts = await window.accountsAPI.getAll()
        setMailAccounts(mailAccounts)
      }
    }
    loadSettings()
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
    setSelectedEmbedModel("")
    setEmbedModels([])
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setAISource(value)
      await window.aiAPI.setSelectedModel("")
      await window.aiAPI.setSelectedEmbedModel("")
    }
  }

  const handleOllamaBaseUrlChange = async (value: string) => {
    setOllamaBaseUrl(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setOllamaBaseUrl(value)
    }
  }

  const handleOpenRouterApiKeyChange = async (value: string) => {
    setOpenRouterApiKey(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setOpenRouterApiKey(value)
    }
  }

  useEffect(() => {
    if ((aiSource === 'ollama' && ollamaBaseUrl) || (aiSource === 'openrouter' && openRouterApiKey)) {
      fetchModels()
    }
  }, [aiSource, ollamaBaseUrl, openRouterApiKey])

  const fetchModels = async () => {
    setLoadingModels(true)
    try {
      const service = await createAIService()
      const modelNames = await service.listModels()
      setModels(modelNames.sort((a: string, b: string) => a.localeCompare(b)))
    } catch {
      setModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  const handleModelChange = async (value: string) => {
    setSelectedModel(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setSelectedModel(value)
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const service = await createAIService()
      await service.testConnection()
      toast.success('AI connection successful')
    } catch (error) {
      toast.error(`AI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTestingConnection(false)
    }
  }

  useEffect(() => {
    if (ollamaBaseUrl) {
      fetchEmbedModels()
    }
  }, [ollamaBaseUrl])

  const fetchEmbedModels = async () => {
    setLoadingEmbedModels(true)
    try {
      // Always use Ollama for embeddings regardless of main AI provider
      const { OllamaService } = await import("@/lib/ai/ollama")
      const service = new OllamaService(ollamaBaseUrl || 'http://localhost:11434')
      const modelNames = await service.listEmbeddingModels()
      setEmbedModels(modelNames.sort((a: string, b: string) => a.localeCompare(b)))
    } catch {
      setEmbedModels([])
    } finally {
      setLoadingEmbedModels(false)
    }
  }

  const handleEmbedModelChange = async (value: string) => {
    // Check if VectorDB has existing data
    if (typeof window !== "undefined" && window.vectorDBAPI && enableVectorDB) {
      try {
        const emailCount = await window.vectorDBAPI.getEmailCount()
        if (emailCount > 0) {
          // Show confirmation dialog
          setPendingEmbedModel(value)
          setEmbedModelChangeDialogOpen(true)
          return
        }
      } catch (error) {
        console.error('Failed to check vector DB count:', error)
      }
    }

    // No existing data or error, proceed normally
    await applyEmbedModelChange(value)
  }

  const applyEmbedModelChange = async (value: string) => {
    setSelectedEmbedModel(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setSelectedEmbedModel(value)
    }
  }

  const confirmEmbedModelChange = async () => {
    if (pendingEmbedModel) {
      // Clear the vector database
      if (typeof window !== "undefined" && window.vectorDBAPI) {
        try {
          await window.vectorDBAPI.clearAllEmails()
          toast.success('Vector database cleared successfully')
        } catch (error) {
          console.error('Failed to clear vector database:', error)
          toast.error('Failed to clear vector database')
          setEmbedModelChangeDialogOpen(false)
          setPendingEmbedModel("")
          return
        }
      }

      // Apply the model change
      await applyEmbedModelChange(pendingEmbedModel)
      toast.success('Embedding model changed successfully')
    }
    setEmbedModelChangeDialogOpen(false)
    setPendingEmbedModel("")
  }

  const cancelEmbedModelChange = () => {
    setEmbedModelChangeDialogOpen(false)
    setPendingEmbedModel("")
  }

  const handleTestEmbedConnection = async () => {
    setTestingEmbedConnection(true)
    try {
      // Always test Ollama connection for embeddings
      const { OllamaService } = await import("@/lib/ai/ollama")
      const service = new OllamaService(ollamaBaseUrl || 'http://localhost:11434')
      await service.testConnection()
      toast.success('Embedding connection successful')
    } catch (error) {
      toast.error(`Embedding connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTestingEmbedConnection(false)
    }
  }

  useEffect(() => {
    if (accountToModify) {
      setModifyFormData({
        username: accountToModify.config.username,
        password: accountToModify.config.password,
        host: accountToModify.config.host,
        port: accountToModify.config.port,
        secure: accountToModify.config.secure ? "true" : "false",
        allowUnsignedCertificate: accountToModify.config.allowUnsignedCertificate || false,
        spamFolder: accountToModify.config.spamFolder || "Spam",
      })
    }
  }, [accountToModify])

  const handleDeleteAccount = (account: Account) => {
    setAccountToDelete(account)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (accountToDelete) {
      await window.accountsAPI.delete(accountToDelete.id)
      const updatedAccounts = await window.accountsAPI.getAll()
      setMailAccounts(updatedAccounts)
    }
    setDeleteDialogOpen(false)
    setAccountToDelete(null)
  }

  const handleModifyAccount = (account: Account) => {
    setAccountToModify(account)
    setModifyFolders([])
    setModifyDialogOpen(true)
    // Fetch folders automatically when opening modify dialog
    handleFetchModifyFolders()
  }

  const handleTestAccount = async (account: Account) => {
    setTestingAccountId(account.id)
    try {
      const provider = MailProviderFactory.createProvider(account.type)
      const result = await provider.testConnection(account.config)
      
      if (result.success) {
        toast.success(`Connection successful for ${account.config.username}`)
        
        // Clear alerts and set status back to working
        await AlertsManager.deleteByAccount(account.name || account.config.username)
        await window.accountsAPI.update(account.id, { status: 'working' as const })
        const updatedAccounts = await window.accountsAPI.getAll()
        setMailAccounts(updatedAccounts)
      } else {
        toast.error(`Connection failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      toast.error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        spamFolder: modifyFormData.spamFolder,
      }
      
      try {
        const provider = MailProviderFactory.createProvider(accountToModify.type)
        const result = await provider.testConnection(newConfig)
        
        if (result.success) {
          // Clear alerts and set status back to working
          await AlertsManager.deleteByAccount(modifyFormData.username)
          await window.accountsAPI.update(accountToModify.id, {
            config: newConfig,
            name: modifyFormData.username,
            status: 'working' as const,
          })
          const updatedAccounts = await window.accountsAPI.getAll()
          setMailAccounts(updatedAccounts)
          toast.success('Account updated successfully')
          setModifyDialogOpen(false)
          setAccountToModify(null)
        } else {
          toast.error(`Connection failed: ${result.error || 'Unknown error'}`)
        }
      } catch (error) {
        toast.error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setTestingModify(false)
      }
    }
  }

  const handleToggleAccount = async (account: Account) => {
    const newStatus: AccountStatus = account.status === 'disabled' ? 'working' : 'disabled'
    
    // If enabling the account, delete all alerts for this account
    if (newStatus === 'working') {
      await AlertsManager.deleteByAccount(account.name || account.config.username)
    }
    
    await window.accountsAPI.update(account.id, { status: newStatus })
    const updatedAccounts = await window.accountsAPI.getAll()
    setMailAccounts(updatedAccounts)
  }

  const handleFetchModifyFolders = async () => {
    if (!accountToModify) return;
    setLoadingModifyFolders(true);
    try {
      const result = await window.accountsAPI.listMailboxFolders(accountToModify.config);
      if (result.success) {
        setModifyFolders(result.folders || []);
      } else {
        console.error('Failed to fetch folders:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoadingModifyFolders(false);
    }
  }

  const handleAiSensitivityChange = async (value: number) => {
    setAiSensitivity(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setAISensitivity(value)
    }
  }

  const handleEmailAgeDaysChange = async (value: number) => {
    setEmailAgeDays(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setEmailAgeDays(value)
    }
  }

  const handleSimplifyEmailContentChange = async (value: boolean) => {
    setSimplifyEmailContent(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setSimplifyEmailContent(value)
    }
  }

  const handleSimplifyEmailContentModeChange = async (value: string) => {
    setSimplifyEmailContentMode(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setSimplifyEmailContentMode(value)
    }
  }

  const handleEnableCronChange = async (value: boolean) => {
    setEnableCron(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setEnableCron(value)
    }
  }

  const handleCronExpressionChange = async (value: string) => {
    setCronExpression(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setCronExpression(value)
    }
  }

  const handleEnableVectorDBChange = async (value: boolean) => {
    // If trying to enable, first verify Ollama is running
    if (value) {
      if (!ollamaBaseUrl) {
        toast.error('Please configure Ollama Base URL first')
        return
      }
      
      try {
        // Test Ollama connection
        const { OllamaService } = await import("@/lib/ai/ollama")
        const service = new OllamaService(ollamaBaseUrl)
        await service.testConnection()
      } catch (error) {
        toast.error(`Cannot enable Vector Database: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return
      }
    }
    
    setEnableVectorDB(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setEnableVectorDB(value)
    }
  }

  const handleCustomizeSpamGuidelinesChange = async (value: boolean) => {
    setCustomizeSpamGuidelines(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setCustomizeSpamGuidelines(value)
    }
  }

  const handleCustomSpamGuidelinesChange = async (value: string) => {
    setCustomSpamGuidelines(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setCustomSpamGuidelines(value)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ai">AI Account</TabsTrigger>
          <TabsTrigger value="mail">Mail Accounts</TabsTrigger>
        </TabsList>
        <div className="bg-card rounded-xl border shadow-sm p-8">
          <TabsContent value="general">
            <GeneralTab
              aiSensitivity={aiSensitivity}
              setAiSensitivity={handleAiSensitivityChange}
              emailAgeDays={emailAgeDays}
              setEmailAgeDays={handleEmailAgeDaysChange}
              simplifyEmailContent={simplifyEmailContent}
              setSimplifyEmailContent={handleSimplifyEmailContentChange}
              simplifyEmailContentMode={simplifyEmailContentMode}
              setSimplifyEmailContentMode={handleSimplifyEmailContentModeChange}
              enableCron={enableCron}
              setEnableCron={handleEnableCronChange}
              cronExpression={cronExpression}
              setCronExpression={handleCronExpressionChange}
            />
          </TabsContent>
          <TabsContent value="ai">
            <AIAccountTab
              aiSource={aiSource}
              setAiSource={setAiSource}
              ollamaBaseUrl={ollamaBaseUrl}
              setOllamaBaseUrl={setOllamaBaseUrl}
              openRouterApiKey={openRouterApiKey}
              setOpenRouterApiKey={setOpenRouterApiKey}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              models={models}
              setModels={setModels}
              loadingModels={loadingModels}
              setLoadingModels={setLoadingModels}
              modelComboboxOpen={modelComboboxOpen}
              setModelComboboxOpen={setModelComboboxOpen}
              testingConnection={testingConnection}
              setTestingConnection={setTestingConnection}
              selectedEmbedModel={selectedEmbedModel}
              setSelectedEmbedModel={setSelectedEmbedModel}
              embedModels={embedModels}
              setEmbedModels={setEmbedModels}
              loadingEmbedModels={loadingEmbedModels}
              setLoadingEmbedModels={setLoadingEmbedModels}
              embedModelComboboxOpen={embedModelComboboxOpen}
              setEmbedModelComboboxOpen={setEmbedModelComboboxOpen}
              testingEmbedConnection={testingEmbedConnection}
              setTestingEmbedConnection={setTestingEmbedConnection}
              handleAiSourceChange={handleAiSourceChange}
              handleOllamaBaseUrlChange={handleOllamaBaseUrlChange}
              handleOpenRouterApiKeyChange={handleOpenRouterApiKeyChange}
              fetchModels={fetchModels}
              handleModelChange={handleModelChange}
              handleTestConnection={handleTestConnection}
              fetchEmbedModels={fetchEmbedModels}
              handleEmbedModelChange={handleEmbedModelChange}
              handleTestEmbedConnection={handleTestEmbedConnection}
              enableVectorDB={enableVectorDB}
              setEnableVectorDB={setEnableVectorDB}
              handleEnableVectorDBChange={handleEnableVectorDBChange}
              customizeSpamGuidelines={customizeSpamGuidelines}
              setCustomizeSpamGuidelines={setCustomizeSpamGuidelines}
              customSpamGuidelines={customSpamGuidelines}
              setCustomSpamGuidelines={setCustomSpamGuidelines}
              handleCustomSpamGuidelinesChange={handleCustomSpamGuidelinesChange}
            />
          </TabsContent>
          <TabsContent value="mail">
            <MailAccountsTab
              mailAccounts={mailAccounts}
              setMailAccounts={setMailAccounts}
              deleteDialogOpen={deleteDialogOpen}
              setDeleteDialogOpen={setDeleteDialogOpen}
              accountToDelete={accountToDelete}
              setAccountToDelete={setAccountToDelete}
              modifyDialogOpen={modifyDialogOpen}
              setModifyDialogOpen={setModifyDialogOpen}
              accountToModify={accountToModify}
              setAccountToModify={setAccountToModify}
              modifyFormData={modifyFormData}
              setModifyFormData={setModifyFormData}
              testingModify={testingModify}
              setTestingModify={setTestingModify}
              testingAccountId={testingAccountId}
              setTestingAccountId={setTestingAccountId}
              modifyFolders={modifyFolders}
              setModifyFolders={setModifyFolders}
              loadingModifyFolders={loadingModifyFolders}
              setLoadingModifyFolders={setLoadingModifyFolders}
              handleDeleteAccount={handleDeleteAccount}
              confirmDelete={confirmDelete}
              handleModifyAccount={handleModifyAccount}
              handleTestAccount={handleTestAccount}
              handleModifyFormChange={handleModifyFormChange}
              handleSaveModify={handleSaveModify}
              handleToggleAccount={handleToggleAccount}
              handleFetchModifyFolders={handleFetchModifyFolders}
            />
          </TabsContent>
        </div>
      </Tabs>

      <AlertDialog open={embedModelChangeDialogOpen} onOpenChange={setEmbedModelChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Embedding Model</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the embedding model will reset your vector database because different models produce vectors with different dimensions.
              This will clear all previously analyzed emails from the database, and you will need to analyze new emails to rebuild the knowledge base.
              <br /><br />
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelEmbedModelChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEmbedModelChange}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function Settings() {
  return (
    <Suspense fallback={<div className="p-6 max-w-2xl mx-auto">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
