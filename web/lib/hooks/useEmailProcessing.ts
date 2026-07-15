'use client'

import { useState, useRef, useEffect } from 'react'
import type { ProcessingStats } from '@/lib/ai/emailProcessor'
import type { AccountProcessingStats } from '@/components/ProcessingStatus'
import { Account } from '@/lib/mail/types'
import { Rule } from '@/lib/types'

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error'

interface UseEmailProcessingReturn {
  status: ProcessingStatus
  overallStats: ProcessingStats
  accountStats: AccountProcessingStats
  currentAccount: string | undefined
  progress: number
  isProcessing: boolean
  startProcessing: () => Promise<void>
  stopProcessing: () => void
  refreshStats: () => void
  clearChecksums: () => Promise<void>
}

export function useEmailProcessing(accounts: Account[], rules: Rule[]): UseEmailProcessingReturn {
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

  // Real-time updates are delivered by the backend over SSE (window.processingEvents)
  useEffect(() => {
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
        const enabled: AccountProcessingStats = {}
        for (const [accountId, stats] of Object.entries(data.accountStats)) {
          const account = accountsRef.current.find((a) => a.id === accountId)
          if (account && account.status !== 'disabled') enabled[accountId] = stats
        }
        setAccountStats(enabled)
        setOverallStats(data.overallStats)
        setCurrentAccount(undefined)
        processingRef.current = false
        setStatus('completed')
      }),
    )
    cleanup.push(
      window.processingEvents.onError(() => {
        setStatus('error')
        processingRef.current = false
      }),
    )

    return () => cleanup.forEach((fn) => fn())
  }, [])

  const calculateProgress = (stats: ProcessingStats): number => {
    if (stats.totalEmails === 0) return 0
    return Math.round(((stats.processedEmails + stats.skippedEmails) / stats.totalEmails) * 100)
  }

  const startProcessing = async () => {
    if (processingRef.current) return
    const enabledAccounts = accountsRef.current.filter((a) => a.status !== 'disabled')
    if (enabledAccounts.length === 0) return

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
  }

  const stopProcessing = () => {
    if (!processingRef.current) return
    setStatus('idle')
    processingRef.current = false
    window.processAPI.stop().catch(() => {})
  }

  const clearChecksums = async () => {
    setOverallStats({ totalEmails: 0, spamEmails: 0, processedEmails: 0, skippedEmails: 0, errors: 0 })
    setAccountStats({})
    setCurrentAccount(undefined)
    setStatus('idle')
  }

  const refreshStats = () => {
    calculateProgress(overallStats)
  }

  const progress = calculateProgress(overallStats)
  const isProcessing = status === 'processing'

  return { status, overallStats, accountStats, currentAccount, progress, isProcessing, startProcessing, stopProcessing, refreshStats, clearChecksums }
}
