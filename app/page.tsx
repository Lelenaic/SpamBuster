'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { X, AlertTriangle, CheckCircle, Undo, Bell, Mail } from 'lucide-react'
import { Alert as AlertType } from '@/lib/types'
import { AlertsManager } from '@/lib/alerts'
import ProcessingStatus from '@/components/ProcessingStatus'
import { useEmailProcessing } from '@/lib/hooks/useEmailProcessing'
import { EmailProcessorService } from '@/lib/ai/emailProcessor'
import { MailProviderFactory } from '@/lib/mail/factory'
import { Account } from '@/lib/mail/types'
import { Rule } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AnalyzedEmail {
  id: string
  emailId: string
  subject: string
  sender: string
  score: number
  reasoning: string
  analyzedAt: string
  accountId: string
  isSpam: boolean
  manualOverride?: boolean
  manualIsSpam?: boolean
}

export default function Home() {
  const [alerts, setAlerts] = useState<AlertType[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [analyzedEmails, setAnalyzedEmails] = useState<AnalyzedEmail[]>([])

  // Initialize email processor with store (using singleton pattern)
  const [processor, setProcessor] = useState<EmailProcessorService | null>(null)

  useEffect(() => {
    const initializeProcessor = async () => {
      if (typeof window !== 'undefined' && window.storeAPI) {
        const store = {
          get: window.storeAPI.get,
          set: window.storeAPI.set
        }
        
        // Always get or create the singleton - this ensures we reuse the same instance
        // even across page navigations
        const instance = EmailProcessorService.getInstance(store)
        
        // Ensure the processor is initialized before using it
        // Only refresh checksums if not already initialized
        if (!instance) {
          return
        }
        
        // Use refreshProcessedChecksums which is safe to call multiple times
        await instance.refreshProcessedChecksums()
        setProcessor(instance)
      }
    }
    initializeProcessor()
  }, [])

  const processing = useEmailProcessing(accounts, rules, processor || undefined)

  useEffect(() => {
    AlertsManager.list().then(setAlerts)

    // Load accounts and rules
    if (typeof window !== 'undefined' && window.accountsAPI) {
      window.accountsAPI.getAll().then(setAccounts)
    }
    if (typeof window !== 'undefined' && window.rulesAPI) {
      window.rulesAPI.getAll().then(setRules)
    }
    if (typeof window !== 'undefined' && window.analyzedEmailsAPI) {
      window.analyzedEmailsAPI.getAll().then((emails) => setAnalyzedEmails(emails as AnalyzedEmail[]))
    }
  }, [])

  // Refresh analyzed emails every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.analyzedEmailsAPI) {
        window.analyzedEmailsAPI.getAll().then((emails) => setAnalyzedEmails(emails as AnalyzedEmail[]))
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Listen for real-time analyzed email creation
  useEffect(() => {
    if (typeof window !== 'undefined' && window.processingEvents) {
      const unsub = window.processingEvents.onAnalyzedEmailCreated((email: AnalyzedEmail) => {
        setAnalyzedEmails(prev => [email, ...prev])
      })
      return unsub
    }
  }, [])

  // Listen for real-time alert creation
  useEffect(() => {
    const handleAlertCreated = (event: Event) => {
      const customEvent = event as CustomEvent<AlertType>
      const alert = customEvent.detail
      setAlerts(prev => {
        // Avoid duplicates
        if (prev.some(a => a.id === alert.id)) {
          return prev
        }
        return [alert, ...prev]
      })
      toast.error(`Connection error: ${alert.user} - ${alert.message}`)
    }
    
    window.addEventListener('spambuster:alert-created', handleAlertCreated)
    return () => window.removeEventListener('spambuster:alert-created', handleAlertCreated)
  }, [])

  // Listen for real-time alert deletion
  useEffect(() => {
    const handleAlertsDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      const accountName = customEvent.detail

      // Check if there was actually a mail account alert for this account before showing toast
      const hadAlert = alerts.some(alert => alert.context === 'mail account' && alert.user === accountName)

      setAlerts(prev => prev.filter(alert => !(alert.context === 'mail account' && alert.user === accountName)))

      // Only show toast if there was actually an alert being cleared (account recovering from trouble)
      if (hadAlert) {
        toast.success(`Connection restored for ${accountName}`)
      }
    }

    const handleAIAlertsDeleted = async () => {
      // Check if there were actually AI alerts before showing toast
      const allAlerts = await AlertsManager.list()
      const hadAIAlderts = allAlerts.some(alert => alert.context === 'AI')
      
      // Refresh alerts list when AI alerts are deleted
      AlertsManager.list().then(setAlerts)
      
      // Only show toast if there were actually AI alerts being cleared
      if (hadAIAlderts) {
        toast.success('AI connection restored')
      }
    }

    window.addEventListener('spambuster:alerts-deleted', handleAlertsDeleted)
    window.addEventListener('spambuster:ai-alerts-deleted', handleAIAlertsDeleted)
    return () => {
      window.removeEventListener('spambuster:alerts-deleted', handleAlertsDeleted)
      window.removeEventListener('spambuster:ai-alerts-deleted', handleAIAlertsDeleted)
    }
  }, [alerts])

  const handleDelete = async (id: string) => {
    await AlertsManager.delete(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const handleManualSpam = async (email: AnalyzedEmail) => {
    if (window.analyzedEmailsAPI) {
      await window.analyzedEmailsAPI.update(email.id, { manualOverride: true, manualIsSpam: true })
      // Refresh the list
      const emails = await window.analyzedEmailsAPI.getAll()
      setAnalyzedEmails(emails as AnalyzedEmail[])

      // Update vector database with user validation
      if (window.vectorDBAPI) {
        try {
          await window.vectorDBAPI.updateUserValidation(email.emailId, true) // true = spam
        } catch (error) {
          console.error('Failed to update vector DB validation:', error)
        }
      }

      // Move email to spam folder using abstraction layer
      const account = accounts.find(acc => acc.id === email.accountId)
      if (account) {
        try {
          const provider = MailProviderFactory.createProvider(account.type)
          const result = await provider.moveEmailToSpam(account.config, email.emailId)
          if (result.success) {
            toast.success('Email moved to spam folder')
          } else {
            toast.error('Failed to move email to spam folder: ' + (result.error || 'Unknown error'))
          }
        } catch (error) {
          toast.error('Failed to move email to spam folder')
        }
      }
    }
  }

  const handleManualHam = async (emailId: string) => {
    if (window.analyzedEmailsAPI) {
      await window.analyzedEmailsAPI.update(emailId, { manualOverride: true, manualIsSpam: false })
      // Refresh the list
      const emails = await window.analyzedEmailsAPI.getAll()
      setAnalyzedEmails(emails as AnalyzedEmail[])

      // Update vector database with user validation
      if (window.vectorDBAPI) {
        try {
          await window.vectorDBAPI.updateUserValidation(emailId, false) // false = ham
        } catch (error) {
          console.error('Failed to update vector DB validation:', error)
        }
      }
    }
  }

  const handleRevert = async (emailId: string) => {
    if (window.analyzedEmailsAPI) {
      await window.analyzedEmailsAPI.update(emailId, { manualOverride: false, manualIsSpam: undefined })
      // Refresh the list
      const emails = await window.analyzedEmailsAPI.getAll()
      setAnalyzedEmails(emails as AnalyzedEmail[])

      // Clear user validation in vector database
      if (window.vectorDBAPI) {
        try {
          await window.vectorDBAPI.updateUserValidation(emailId, null) // null = clear validation
        } catch (error) {
          console.error('Failed to clear vector DB validation:', error)
        }
      }
    }
  }


  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
      
      {/* Real-time Processing Status */}
      {processor && (
        <ProcessingStatus
          onStartProcessing={processing.startProcessing}
          onStopProcessing={processing.stopProcessing}
          isProcessing={processing.isProcessing}
          status={processing.status}
          overallStats={processing.overallStats}
          accountStats={processing.accountStats}
          accounts={accounts}
          currentAccount={processing.currentAccount}
          progress={processing.progress}
        />
      )}
      
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Bell className="h-5 w-5" />Alerts</h2>
        {alerts.length === 0 ? (
          <p className="text-muted-foreground">No alerts at the moment.</p>
        ) : (
          alerts.map(alert => (
            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'} className="mb-4">
              <AlertTitle>{alert.user} - {alert.context}: {alert.type}</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                {alert.message}
                <div className="flex gap-2">
                  {alert.goto && <Link href={alert.goto}>
                    <Button size="sm">Go to Fix</Button>
                  </Link>}
                  <Button size="sm" variant="outline" onClick={() => handleDelete(alert.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))
        )}
        <hr className="mt-6" />
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Mail className="h-5 w-5" />Analyzed Emails</h2>
          {analyzedEmails.length === 0 ? (
            <p className="text-muted-foreground">No emails analyzed yet.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {analyzedEmails.slice(-50).reverse().map((email) => (
                <AccordionItem key={email.id} value={email.id}>
                  <AccordionTrigger className="hover:no-underline items-center !grid grid-cols-[1fr_auto_auto] gap-4 w-full min-w-0">
                    <span className="truncate text-left min-w-0">{email.subject}</span>
                    <Badge 
                      variant={email.manualOverride ? (email.manualIsSpam ? "destructive" : "default") : (email.isSpam ? "destructive" : "default")} 
                      className={cn(
                        "shrink-0 justify-self-end",
                        email.manualOverride ? (email.manualIsSpam ? "bg-red-500" : "bg-green-500") : (email.isSpam ? "bg-red-500" : "bg-green-500")
                      )}
                    >
                      {email.manualOverride ? (
                        <>
                          <span className="line-through">{email.isSpam ? "SPAM" : "HAM"}</span> → {email.manualIsSpam ? "SPAM" : "HAM"}
                        </>
                      ) : (
                        <>{email.isSpam ? "SPAM" : "HAM"}</>
                      )} ({email.score}/10)
                    </Badge>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>From:</strong> {email.sender}
                      </p>
                      <p className="text-sm">
                        <strong>AI Reasoning:</strong> {email.reasoning}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Analyzed on {new Date(email.analyzedAt).toLocaleString()}
                      </p>
                      {email.manualOverride ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm">
                            Manually marked as {email.manualIsSpam ? "SPAM" : "HAM"}
                          </p>
                          <Button size="sm" variant="outline" onClick={() => handleRevert(email.id)}>
                            <Undo className="h-4 w-4" />
                            Revert
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="destructive" onClick={() => handleManualSpam(email)}>
                            <AlertTriangle className="h-4 w-4" />
                            It&apos;s a SPAM
                          </Button>
                          <Button size="sm" variant="default" onClick={() => handleManualHam(email.id)}>
                            <CheckCircle className="h-4 w-4" />
                            It&apos;s a HAM
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
