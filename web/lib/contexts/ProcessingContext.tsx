'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import type { ProcessingStats } from '@/lib/ai/emailProcessor'
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
}

export function ProcessingProvider({ children, accounts, rules }: ProcessingProviderProps) {
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [overallStats, setOverallStats] = useState<ProcessingStats>({
    totalEmails: 0,
    spamEmails: 0,
    processedEmails: 0,
    skippedEmails: 0,
    errors: 0,
  })
  const [accountStats, setAccountStats] = useState<AccountProcessingStats>({})
  const [currentAccount, setCurrentAccount] = useState<string>()
  const processingRef = useRef(false)

  const accountsRef = useRef(accounts)
  const rulesRef = useRef(rules)
  useEffect(() => {
    accountsRef.current = accounts
    rulesRef.current = rules
  }, [accounts, rules])

  useEffect(() => {
    if (!window.processingEvents) return
    const cleanup: (() => void)[] = []

    cleanup.push(
      window.processingEvents.onStatusChange((newStatus: ProcessingStatus) => {
        setStatus(newStatus)
        processingRef.current = newStatus === 'processing'
      }),
    )
    cleanup.push(
      window.processingEvents.onStatsUpdate((data: { accountId: string; stats: ProcessingStats; overallStats: ProcessingStats }) => {
        setAccountStats((prev) => ({ ...prev, [data.accountId]: data.stats }))
        setOverallStats(data.overallStats)
      }),
    )
    cleanup.push(
      window.processingEvents.onProgress((data: { totalEmails: number; processedEmails: number; progress: number; currentAccount?: string }) => {
        setOverallStats((prev) => ({ ...prev, totalEmails: data.totalEmails, processedEmails: data.processedEmails }))
        if (data.currentAccount) setCurrentAccount(data.currentAccount)
      }),
    )
    cleanup.push(
      window.processingEvents.onComplete((data: { accountStats: Record<string, ProcessingStats>; overallStats: ProcessingStats }) => {
        setAccountStats(data.accountStats)
        setOverallStats(data.overallStats)
        setCurrentAccount(undefined)
        processingRef.current = false
      }),
    )
    cleanup.push(
      window.processingEvents.onError(() => {
        setStatus('error')
        processingRef.current = false
      }),
    )

    return () => cleanup.forEach((fn) => fn())
  }, [accounts, rules])

  const calculateProgress = useCallback((stats: ProcessingStats): number => {
    if (stats.totalEmails === 0) return 0
    return Math.round((stats.processedEmails / stats.totalEmails) * 100)
  }, [])

  const startProcessing = useCallback(async () => {
    if (processingRef.current) return
    const enabled = accountsRef.current.filter((a) => a.status !== 'disabled')
    if (enabled.length === 0) return
    processingRef.current = true
    setStatus('processing')
    setOverallStats({ totalEmails: 0, spamEmails: 0, processedEmails: 0, skippedEmails: 0, errors: 0 })
    setAccountStats({})
    setCurrentAccount(undefined)
    try {
      await window.processAPI.start()
    } catch (error) {
      console.error('Failed to start processing:', error)
      setStatus('error')
      processingRef.current = false
    }
  }, [accounts, rules])

  const stopProcessing = useCallback(() => {
    if (processingRef.current) {
      setStatus('idle')
      processingRef.current = false
      window.processAPI.stop().catch(() => {})
    }
  }, [])

  const clearChecksums = useCallback(async () => {
    setOverallStats({ totalEmails: 0, spamEmails: 0, processedEmails: 0, skippedEmails: 0, errors: 0 })
    setAccountStats({})
    setCurrentAccount(undefined)
    setStatus('idle')
  }, [])

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
    clearChecksums,
  }

  return <ProcessingContext.Provider value={value}>{children}</ProcessingContext.Provider>
}
