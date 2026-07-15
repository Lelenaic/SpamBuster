'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import NextAnalysisTimer from './NextAnalysisTimer'
import { 
  Play, 
  Square, 
  RefreshCw, 
  Mail, 
  Shield, 
  ShieldCheck,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { Account } from '@/lib/mail/types'

export interface ProcessingStats {
  totalEmails: number
  spamEmails: number
  processedEmails: number
  skippedEmails: number
  errors: number
}

export interface AccountProcessingStats {
  [accountId: string]: ProcessingStats
}

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error'

interface ProcessingStatusProps {
  onStartProcessing: () => Promise<void>
  onStopProcessing: () => void
  isProcessing: boolean
  status: ProcessingStatus
  overallStats: ProcessingStats
  accountStats: AccountProcessingStats
  accounts?: Account[]
  currentAccount?: string
  progress: number
}

export default function ProcessingStatus({
  onStartProcessing,
  onStopProcessing,
  isProcessing,
  status,
  overallStats,
  accountStats,
  currentAccount,
  progress,
  accounts = []
}: ProcessingStatusProps) {
  const [isStarting, setIsStarting] = useState(false)

  // Helper to get email display from account ID
  const getAccountEmail = (accountId: string): string => {
    const account = accounts.find(acc => acc.id === accountId)
    if (account) {
      // Prefer name if available, otherwise use config.username (email)
      return account.name || account.config.username || accountId
    }
    return accountId
  }

  const handleStart = async () => {
    setIsStarting(true)
    try {
      await onStartProcessing()
    } finally {
      setIsStarting(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return 'Processing emails...'

      case 'completed':
        return 'Processing completed'
      case 'error':
        return 'Processing error'
      default:
        return 'Ready to process'
    }
  }

  // Get all accounts to display
  // Only show accounts that have stats in accountStats (added during processing)
  // If accountStats is empty, show nothing (not even the accounts from accounts prop)
  const displayAccounts = Object.entries(accountStats).map(([accountId, stats]) => ({
    accountId,
    email: getAccountEmail(accountId),
    stats
  }))

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Email Processing Status
            </CardTitle>
            <CardDescription>
              Real-time spam detection and email filtering
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getStatusColor()} text-white border-none`}>
              {getStatusIcon()}
              <span className="ml-1">{getStatusText()}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{overallStats.processedEmails + overallStats.skippedEmails} / {overallStats.totalEmails} emails</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <Mail className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-lg font-semibold">{overallStats.totalEmails}</div>
            <div className="text-xs text-muted-foreground">Total Emails</div>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-semibold">{overallStats.processedEmails}</div>
            <div className="text-xs text-muted-foreground">Analyzed</div>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <div className="text-lg font-semibold">{overallStats.spamEmails}</div>
            <div className="text-xs text-muted-foreground">Spam Detected</div>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <RefreshCw className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <div className="text-lg font-semibold">{overallStats.skippedEmails}</div>
            <div className="text-xs text-muted-foreground">Skipped</div>
          </div>
        </div>

        {/* Current Account */}
        {currentAccount && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-sm font-medium">Processing Account:</div>
            <div className="text-sm text-muted-foreground">{getAccountEmail(currentAccount)}</div>
          </div>
        )}

        {/* Account Details */}
        {displayAccounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Account Statistics:</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {displayAccounts.map(({ accountId, email, stats }) => (
                <div key={accountId} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                  <span className="font-mono text-xs truncate max-w-[200px]">{email}</span>
                  <div className="flex gap-4 text-xs">
                    <span>{stats.totalEmails} total</span>
                    <span className="text-green-600">{stats.processedEmails} processed</span>
                    <span className="text-red-600">{stats.spamEmails} spam</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {overallStats.errors > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="text-sm font-medium text-red-800 dark:text-red-200">
              Errors: {overallStats.errors}
            </div>
            <div className="text-xs text-red-600 dark:text-red-300">
              Some emails could not be processed. Check logs for details.
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isProcessing && ['idle', 'completed'].includes(status) && (
            <Button 
              onClick={handleStart} 
              disabled={isStarting}
              className="flex-1"
            >
              {isStarting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start spam analysis
            </Button>
          )}
          
          {(isProcessing) && (
            <Button 
              onClick={onStopProcessing}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
        </div>
        
        {/* Scheduled Analysis Timer */}
        <NextAnalysisTimer isProcessing={isProcessing} />
      </CardContent>
    </Card>
  )
}
