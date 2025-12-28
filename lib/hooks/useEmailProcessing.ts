'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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

  // Check if processing is ongoing when processor becomes available
  useEffect(() => {
    const checkProcessingState = async () => {
      if (processor) {
        try {
          // Check both in-memory state and store state for robustness
          const inMemoryProcessing = processor.isCurrentlyProcessing()
          const storeProcessing = await processor.isProcessingFromStore()
          
          if (inMemoryProcessing || storeProcessing) {
            console.log('🔄 Detected ongoing processing, restoring state...')
            processingRef.current = true
            setStatus('processing')
            abortControllerRef.current = new AbortController()
          }
        } catch (error) {
          console.error('Error checking processing state:', error)
        }
      }
    }
    
    checkProcessingState()
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
      // Also ensure processor state is consistent
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
      
      // Also stop the processor's internal processing state
      if (processor) {
        processor.stopProcessing()
      }
    }
  }, [processor])

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

  // Poll for processing state changes to handle edge cases
  useEffect(() => {
    if (!processor || !processingRef.current) return
    
    const interval = setInterval(async () => {
      try {
        const storeProcessing = await processor.isProcessingFromStore()
        const inMemoryProcessing = processor.isCurrentlyProcessing()
        
        if (inMemoryProcessing || storeProcessing) {
          if (!processingRef.current) {
            console.log('🔄 Restoring lost processing state...')
            processingRef.current = true
            setStatus('processing')
          }
        } else {
          if (processingRef.current) {
            console.log('🛑 Processing completed, updating state...')
            processingRef.current = false
            setStatus('completed')
          }
        }
      } catch (error) {
        console.error('Error polling processing state:', error)
      }
    }, 2000) // Check every 2 seconds
    
    return () => clearInterval(interval)
  }, [processor])

  const refreshStats = useCallback(() => {
    // This would refresh the current processing stats
    // For now, we'll just recalculate the progress
    calculateProgress(overallStats)
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
