'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import { EmailProcessorService, ProcessingStats } from '@/lib/ai/emailProcessor'
import type { AccountProcessingStats } from '@/components/ProcessingStatus'
import { Account } from '@/lib/mail/types'
import { Rule } from '@/lib/types'

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error'

interface ProcessingState {
  status: ProcessingStatus
  overallStats: ProcessingStats
  accountStats: AccountProcessingStats
  currentAccount?: string
  progress: number
  isProcessing: boolean
}

interface ProcessingContextType extends ProcessingState {
  startProcessing: () => Promise<void>
  stopProcessing: () => void
  refreshStats: () => void
  clearChecksums: () => Promise<void>
}

const ProcessingContext = createContext<ProcessingContextType | null>(null)

export function useProcessingContext() {
  const context = useContext(ProcessingContext)
  if (!context) {
    throw new Error('useProcessingContext must be used within ProcessingProvider')
  }
  return context
}

interface ProcessingProviderProps {
  children: ReactNode
  accounts: Account[]
  rules: Rule[]
  processor?: EmailProcessorService
}

export function ProcessingProvider({ children, accounts, rules, processor }: ProcessingProviderProps) {
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [overallStats, setOverallStats] = useState<ProcessingStats>({
    totalEmails: 0,
    spamEmails: 0,
    processedEmails: 0,
    skippedEmails: 0,
    errors: 0
  })
  const [accountStats, setAccountStats] = useState<AccountProcessingStats>({})
  const [currentAccount, setCurrentAccount] = useState<string>()
  const processingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Check processor state on mount for state recovery
  const checkProcessorState = useCallback(() => {
    if (!processor) {
      return
    }
    
    // Check if processing is ongoing
    const isProcessing = processor.isCurrentlyProcessing()
    
    if (isProcessing) {
      processingRef.current = true
      setStatus('processing')
      abortControllerRef.current = new AbortController()
      
      // Restore current processing state from in-memory processor state
      const currentState = processor.getCurrentProcessingState()
      if (currentState) {
        setAccountStats(currentState.accountStats)
        setOverallStats(currentState.overallStats)
        setCurrentAccount(currentState.currentAccount)
      }
      return
    }
    
    // Always check for completed processing state - if there are stats, restore them
    const currentState = processor.getCurrentProcessingState()
    
    if (currentState && Object.keys(currentState.accountStats).length > 0) {
      setAccountStats(currentState.accountStats)
      setOverallStats(currentState.overallStats)
      setCurrentAccount(undefined)
      setStatus('completed')
    }
  }, [processor])

  // Check processor state when component mounts
  useEffect(() => {
    checkProcessorState()
  }, [checkProcessorState])

  // Also check whenever processor prop changes
  useEffect(() => {
    if (processor) {
      checkProcessorState()
    }
  }, [processor, checkProcessorState])

  // Set up real-time event listeners for processing updates
  useEffect(() => {
    if (!window.processingEvents) {
      return
    }

    const cleanupFunctions: (() => void)[] = []

    // Listen for status changes
    const unsubStatus = window.processingEvents.onStatusChange((newStatus: ProcessingStatus) => {
      setStatus(newStatus)
      if (newStatus === 'idle') {
        processingRef.current = false
      } else if (newStatus === 'processing') {
        processingRef.current = true
        abortControllerRef.current = new AbortController()
      }
    })
    cleanupFunctions.push(unsubStatus)

    // Listen for stats updates
    const unsubStats = window.processingEvents.onStatsUpdate((data: {
      accountId: string
      stats: ProcessingStats
      overallStats: ProcessingStats
    }) => {
      setAccountStats(prev => ({
        ...prev,
        [data.accountId]: data.stats
      }))
      setOverallStats(data.overallStats)
    })
    cleanupFunctions.push(unsubStats)

    // Listen for progress updates
    const unsubProgress = window.processingEvents.onProgress((data: {
      totalEmails: number
      processedEmails: number
      progress: number
      currentAccount?: string
    }) => {
      setOverallStats(prev => ({
        ...prev,
        totalEmails: data.totalEmails,
        processedEmails: data.processedEmails
      }))
      if (data.currentAccount) {
        setCurrentAccount(data.currentAccount)
      }
    })
    cleanupFunctions.push(unsubProgress)

    // Listen for completion
    const unsubComplete = window.processingEvents.onComplete((data: {
      accountStats: Record<string, ProcessingStats>
      overallStats: ProcessingStats
    }) => {
      setAccountStats(data.accountStats)
      setOverallStats(data.overallStats)
      setCurrentAccount(undefined)
      processingRef.current = false
    })
    cleanupFunctions.push(unsubComplete)

    // Listen for errors
    const unsubError = window.processingEvents.onError((error: Error) => {
      setStatus('error')
      processingRef.current = false
    })
    cleanupFunctions.push(unsubError)

    // Listen for cron-triggered processing
    if (window.electronAPI) {
      console.log('📨 Setting up cron trigger listener');
      const handleCronTrigger = () => {
        console.log('📨 Received trigger-email-processing event from main process');
        // Start processing if not already processing
        if (!processingRef.current) {
          console.log('📨 Starting processing via cron trigger');
          startProcessing()
        } else {
          console.log('📨 Processing already in progress, skipping cron trigger');
        }
      }
      window.electronAPI.on('trigger-email-processing', handleCronTrigger)
      cleanupFunctions.push(() => {
        // Note: electronAPI.on doesn't provide a way to remove specific listeners
        // This is handled by the global cleanup
      })
    }

    // Cleanup listeners on unmount
    return () => {
      cleanupFunctions.forEach(fn => fn())
    }
  }, [accounts, rules, processor])

  const calculateProgress = useCallback((stats: ProcessingStats): number => {
    if (stats.totalEmails === 0) return 0
    return Math.round((stats.processedEmails / stats.totalEmails) * 100)
  }, [])

  const startProcessing = useCallback(async () => {
    if (!processor || processingRef.current) {
      return
    }

    processingRef.current = true
    setStatus('processing')
    abortControllerRef.current = new AbortController()
    
    try {
      // Get the user's configured email age days setting
      const emailAgeDays = await window.generalAPI.getEmailAgeDays()
      
      const { accountStats: newAccountStats, overallStats: newOverallStats } = 
        await processor.processAllAccounts(accounts, rules, emailAgeDays)

      setAccountStats(newAccountStats)
      setOverallStats(newOverallStats)
      setStatus('completed')
    } catch (error) {
      console.error('Processing failed:', error)
      setStatus('error')
    } finally {
      processingRef.current = false
      if (processor) {
        processor.stopProcessing()
      }
    }
  }, [accounts, rules, processor])

  const stopProcessing = useCallback(() => {
    if (processingRef.current) {
      setStatus('idle')
      processingRef.current = false
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      if (processor) {
        processor.stopProcessing()
      }
    }
  }, [processor])

  const clearChecksums = useCallback(async () => {
    if (processor) {
      await processor.clearProcessedCache()
      setOverallStats({
        totalEmails: 0,
        spamEmails: 0,
        processedEmails: 0,
        skippedEmails: 0,
        errors: 0
      })
      setAccountStats({})
      setCurrentAccount(undefined)
      setStatus('idle')
    }
  }, [processor])

  const refreshStats = useCallback(() => {
    calculateProgress(overallStats)
  }, [overallStats, calculateProgress])

  const progress = calculateProgress(overallStats)
  const isProcessing = status === 'processing'

  const value: ProcessingContextType = {
    status,
    overallStats,
    accountStats,
    currentAccount,
    progress,
    isProcessing,
    startProcessing,
    stopProcessing,
    refreshStats,
    clearChecksums
  }

  return (
    <ProcessingContext.Provider value={value}>
      {children}
    </ProcessingContext.Provider>
  )
}
