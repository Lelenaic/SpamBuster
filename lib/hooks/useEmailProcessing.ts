'use client'

import { useState, useRef, useEffect } from 'react'
import { EmailProcessorService, ProcessingStats } from '@/lib/ai/emailProcessor'
import type { AccountProcessingStats } from '@/components/ProcessingStatus'
import { Account } from '@/lib/mail/types'
import { Rule } from '@/lib/types'

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error'

interface UseEmailProcessingReturn {
  // State
  status: ProcessingStatus
  overallStats: ProcessingStats
  accountStats: AccountProcessingStats
  currentAccount: string | undefined
  progress: number
  isProcessing: boolean

  // Actions
  startProcessing: () => Promise<void>
  stopProcessing: () => void
  refreshStats: () => void
  clearChecksums: () => Promise<void>
}

export function useEmailProcessing(
  accounts: Account[],
  rules: Rule[],
  processor?: EmailProcessorService
): UseEmailProcessingReturn {
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

  const accountsRef = useRef(accounts)
  const rulesRef = useRef(rules)
  const processorRef = useRef(processor)

  // Update refs whenever props change
  useEffect(() => {
    accountsRef.current = accounts
    rulesRef.current = rules
    processorRef.current = processor
  }, [accounts, rules, processor])

  // Track pending cron triggers
  const pendingCronTriggerRef = useRef(false)

  // Effect to handle pending cron triggers when data becomes available
  useEffect(() => {
    if (pendingCronTriggerRef.current && processor && accounts.length > 0 && rules.length > 0 && !processingRef.current) {
      pendingCronTriggerRef.current = false
      startProcessing()
    }
  }, [processor, accounts.length, rules.length])

  // Check if processing is ongoing when processor becomes available
  // Also restore in-memory state for state recovery (including completed processing)
  useEffect(() => {
    const checkProcessingState = async () => {
      if (!processor) return
      
      try {
        // Check in-memory state only (no store-based state anymore)
        const inMemoryProcessing = processor.isCurrentlyProcessing()
        
        if (inMemoryProcessing) {
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
        
        // Do NOT restore completed processing state on app restart
        // Stats are only shown during active processing or when manually started
      } catch (error) {
        console.error('Error checking processing state:', error)
      }
    }
    
    checkProcessingState()
  }, [processor])

  // Set up real-time IPC event listeners for processing updates
  useEffect(() => {
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
      // Filter out disabled accounts from the final stats
      const enabledAccountStats: AccountProcessingStats = {}
      const currentAccounts = accountsRef.current
      for (const [accountId, stats] of Object.entries(data.accountStats)) {
        const account = currentAccounts.find(a => a.id === accountId)
        if (account && account.status !== 'disabled') {
          enabledAccountStats[accountId] = stats
        }
      }
      setAccountStats(enabledAccountStats)
      setOverallStats(data.overallStats)
      setCurrentAccount(undefined)
      processingRef.current = false
      setStatus('completed')
    })
    cleanupFunctions.push(unsubComplete)

    // Listen for errors
    const unsubError = window.processingEvents.onError((error: Error) => {
      setStatus('error')
      processingRef.current = false
    })
    cleanupFunctions.push(unsubError)

    const handleCronTrigger = () => {

      const currentAccounts = accountsRef.current
      const currentRules = rulesRef.current
      const currentProcessor = processorRef.current

      const hasProcessor = !!currentProcessor
      const hasAccounts = currentAccounts && currentAccounts.length > 0
      const hasRules = currentRules && currentRules.length > 0

      if (!hasProcessor || !hasAccounts || !hasRules) {
        pendingCronTriggerRef.current = true
        return
      }

      // Data is ready, check if we can start processing
      if (processingRef.current) {
        return
      }

      startProcessing()
    }

    // Listen for cron-triggered processing
    if (window.electronAPI) {
      if (window.electronAPI.on) {
        window.electronAPI.on('trigger-email-processing', handleCronTrigger)
      }
    } else {
    }

    // Cleanup listeners on unmount
    return () => {
      cleanupFunctions.forEach(fn => fn())
    }
  }, [])

  const calculateProgress = (stats: ProcessingStats): number => {
    if (stats.totalEmails === 0) return 0
    return Math.round(((stats.processedEmails + stats.skippedEmails) / stats.totalEmails) * 100)
  }

  const startProcessing = async () => {
    const currentAccounts = accountsRef.current
    const currentRules = rulesRef.current
    const currentProcessor = processorRef.current
    
    if (!currentProcessor || processingRef.current) {
      return
    }

    // Filter out disabled accounts
    const enabledAccounts = currentAccounts.filter(account => account.status !== 'disabled')
    
    if (enabledAccounts.length === 0) {
      // No enabled accounts to process
      processingRef.current = false
      return
    }

    processingRef.current = true
    setStatus('processing')
    abortControllerRef.current = new AbortController()
    
    // Reset stats to 0 before starting processing
    setOverallStats({
      totalEmails: 0,
      spamEmails: 0,
      processedEmails: 0,
      skippedEmails: 0,
      errors: 0
    })
    // Empty accountStats so accounts are added one by one as processing progresses
    setAccountStats({})
    setCurrentAccount(undefined)
    
    try {
      // Get the user's configured email age days setting
      const emailAgeDays = await window.aiAPI.getEmailAgeDays()
      
      const { accountStats: newAccountStats, overallStats: newOverallStats } = 
        await currentProcessor.processAllAccounts(enabledAccounts, currentRules || [], emailAgeDays)

      // Filter out disabled accounts from the final stats (extra safety)
      const filteredAccountStats: AccountProcessingStats = {}
      for (const [accountId, stats] of Object.entries(newAccountStats)) {
        const account = enabledAccounts.find(a => a.id === accountId)
        if (account) {
          filteredAccountStats[accountId] = stats
        }
      }
      setAccountStats(filteredAccountStats)
      setOverallStats(newOverallStats)
      setStatus('completed')
      // Note: We don't call stopProcessing() here because processing completed normally
      // The stopProcessing() method would emit 'idle' status which would reset our status
    } catch (error) {
      console.error('Processing failed:', error);
      setStatus('error')
      // Only call stopProcessing() on error to clean up the processor state
      if (currentProcessor) {
        currentProcessor.stopProcessing()
      }
    } finally {
      processingRef.current = false
    }
  }

  const stopProcessing = () => {
    if (processingRef.current) {
      setStatus('idle')
      processingRef.current = false
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Also stop the processor's internal processing state
      if (processor) {
        processor.stopProcessing()
      }
    }
  }

  const clearChecksums = async () => {
    if (processor) {
      await processor.clearProcessedCache()
      // Reset stats since we're clearing the cache
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
  }

  const refreshStats = () => {
    // This would refresh the current processing stats
    // For now, we'll just recalculate the progress
    calculateProgress(overallStats)
    // setProgress(newProgress) - we could add this to state if needed
  }

  const progress = calculateProgress(overallStats)
  const isProcessing = status === 'processing'

  return {
    // State
    status,
    overallStats,
    accountStats,
    currentAccount,
    progress,
    isProcessing,

    // Actions
    startProcessing,
    stopProcessing,
    refreshStats,
    clearChecksums
  }
}
