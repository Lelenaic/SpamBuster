'use client'

import { useState, useCallback, useRef } from 'react'
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
    }
  }, [accounts, rules, processor])



  const stopProcessing = useCallback(() => {
    if (processingRef.current) {
      setStatus('idle')
      processingRef.current = false
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const clearChecksums = useCallback(async () => {
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
  }, [processor])

  const refreshStats = useCallback(() => {
    // This would refresh the current processing stats
    // For now, we'll just recalculate the progress
    const newProgress = calculateProgress(overallStats)
    // setProgress(newProgress) - we could add this to state if needed
  }, [overallStats, calculateProgress])

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
