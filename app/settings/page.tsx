"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createAIService } from "@/lib/ai"
import { Account, AccountStatus, MailProviderFactory } from "@/lib/mail"
import "@/lib/types"
import AIAccountTab from "./AIAccountTab"
import MailAccountsTab from "./MailAccountsTab"

function SettingsContent() {
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
  })
  
  const [testingModify, setTestingModify] = useState(false)
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      if (typeof window !== "undefined" && window.aiAPI) {
        setAiSource(await window.aiAPI.getAISource())
        setOllamaBaseUrl(await window.aiAPI.getOllamaBaseUrl())
        setOllamaApiKey(await window.aiAPI.getOllamaApiKey())
        setOpenRouterApiKey(await window.aiAPI.getOpenRouterApiKey())
        setSelectedModel(await window.aiAPI.getSelectedModel())
        setSelectedEmbedModel(await window.aiAPI.getSelectedEmbedModel())

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

  const handleOllamaApiKeyChange = async (value: string) => {
    setOllamaApiKey(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setOllamaApiKey(value)
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
  }, [aiSource, ollamaBaseUrl, openRouterApiKey]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const config = aiSource === 'ollama'
        ? { baseUrl: ollamaBaseUrl, apiKey: ollamaApiKey }
        : { apiKey: openRouterApiKey }
      const service = createAIService(aiSource, config)
      await service.testConnection()
    } catch {
      // Error handled in component
    } finally {
      setTestingConnection(false)
    }
  }

  useEffect(() => {
    if ((aiSource === 'ollama' && ollamaBaseUrl) || (aiSource === 'openrouter' && openRouterApiKey)) {
      fetchEmbedModels()
    }
  }, [aiSource, ollamaBaseUrl, openRouterApiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEmbedModels = async () => {
    setLoadingEmbedModels(true)
    try {
      const config = aiSource === 'ollama'
        ? { baseUrl: ollamaBaseUrl, apiKey: ollamaApiKey }
        : { apiKey: openRouterApiKey }
      const service = createAIService(aiSource, config)
      const modelNames = await service.listEmbeddingModels()
      setEmbedModels(modelNames.sort((a: string, b: string) => a.localeCompare(b)))
    } catch {
      setEmbedModels([])
    } finally {
      setLoadingEmbedModels(false)
    }
  }

  const handleEmbedModelChange = async (value: string) => {
    setSelectedEmbedModel(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      await window.aiAPI.setSelectedEmbedModel(value)
    }
  }

  const handleTestEmbedConnection = async () => {
    setTestingEmbedConnection(true)
    try {
      const config = aiSource === 'ollama'
        ? { baseUrl: ollamaBaseUrl, apiKey: ollamaApiKey }
        : { apiKey: openRouterApiKey }
      const service = createAIService(aiSource, config)
      await service.testConnection()
    } catch {
      // Error handled in component
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
    setModifyDialogOpen(true)
  }

  const handleTestAccount = async (account: Account) => {
    setTestingAccountId(account.id)
    try {
      const provider = MailProviderFactory.createProvider(account.type)
      await provider.testConnection(account.config)
    } catch {
      // Error handled in component
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
      
      try {
        const provider = MailProviderFactory.createProvider(accountToModify.type)
        const result = await provider.testConnection(newConfig)
        
        if (result.success) {
          await window.accountsAPI.update(accountToModify.id, {
            config: newConfig,
            name: modifyFormData.username,
            status: 'working' as const,
          })
          const updatedAccounts = await window.accountsAPI.getAll()
          setMailAccounts(updatedAccounts)
          setModifyDialogOpen(false)
          setAccountToModify(null)
        }
      } catch {
        // Error handled in component
      } finally {
        setTestingModify(false)
      }
    }
  }

  const handleToggleAccount = async (account: Account) => {
    const newStatus: AccountStatus = account.status === 'disabled' ? 'working' : 'disabled'
    await window.accountsAPI.update(account.id, { status: newStatus })
    const updatedAccounts = await window.accountsAPI.getAll()
    setMailAccounts(updatedAccounts)
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
          <AIAccountTab
            aiSource={aiSource}
            setAiSource={setAiSource}
            ollamaBaseUrl={ollamaBaseUrl}
            setOllamaBaseUrl={setOllamaBaseUrl}
            ollamaApiKey={ollamaApiKey}
            setOllamaApiKey={setOllamaApiKey}
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
            handleOllamaApiKeyChange={handleOllamaApiKeyChange}
            handleOpenRouterApiKeyChange={handleOpenRouterApiKeyChange}
            fetchModels={fetchModels}
            handleModelChange={handleModelChange}
            handleTestConnection={handleTestConnection}
            fetchEmbedModels={fetchEmbedModels}
            handleEmbedModelChange={handleEmbedModelChange}
            handleTestEmbedConnection={handleTestEmbedConnection}
          />
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
            handleDeleteAccount={handleDeleteAccount}
            confirmDelete={confirmDelete}
            handleModifyAccount={handleModifyAccount}
            handleTestAccount={handleTestAccount}
            handleModifyFormChange={handleModifyFormChange}
            handleSaveModify={handleSaveModify}
            handleToggleAccount={handleToggleAccount}
          />
        </Tabs>
      </div>
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
