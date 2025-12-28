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

  // Check processor state on mount and when processor changes
  const checkProcessorState = useCallback(() => {
    if (processor && processor.isCurrentlyProcessing()) {
      console.log('🔄 Detected ongoing processing, restoring state...')
      processingRef.current = true
      setStatus('processing')
      abortControllerRef.current = new AbortController()
    }
  }, [processor])

  // Check processor state when component mounts
  useEffect(() => {
    checkProcessorState()
  }, [])

  // Also check whenever processor prop changes
  useEffect(() => {
    if (processor) {
      checkProcessorState()
    }
  }, [processor])

  const calculateProgress = useCallback((stats: ProcessingStats): number => {
    if (stats.totalEmails === 0) return 0
    return Math.round((stats.processedEmails / stats.totalEmails) * 100)
  }, [])

  const startProcessing = useCallback(async () => {
    if (!processor || processingRef.current) return

    processingRef.current = true
    setStatus('processing')
    abortControllerRef.current = new AbortController()
    
    try {
      // Get the user's configured email age days setting
      const emailAgeDays = await window.aiAPI.getEmailAgeDays()
      
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
    const newProgress = calculateProgress(overallStats)
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
