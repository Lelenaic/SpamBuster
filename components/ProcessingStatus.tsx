'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Mail, 
  Shield, 
  ShieldCheck,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

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

export type ProcessingStatus = 'idle' | 'processing' | 'paused' | 'completed' | 'error'

interface ProcessingStatusProps {
  onStartProcessing: () => Promise<void>
  onPauseProcessing: () => void
  onStopProcessing: () => void
  isProcessing: boolean
  status: ProcessingStatus
  overallStats: ProcessingStats
  accountStats: AccountProcessingStats
  currentAccount?: string
  progress: number
}

export default function ProcessingStatus({
  onStartProcessing,
  onPauseProcessing,
  onStopProcessing,
  isProcessing,
  status,
  overallStats,
  accountStats,
  currentAccount,
  progress
}: ProcessingStatusProps) {
  const [isStarting, setIsStarting] = useState(false)

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
      case 'paused':
        return <Pause className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500'
      case 'paused':
        return 'bg-yellow-500'
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
      case 'paused':
        return 'Processing paused'
      case 'completed':
        return 'Processing completed'
      case 'error':
        return 'Processing error'
      default:
        return 'Ready to process'
    }
  }

  const accountsArray = Object.entries(accountStats)
  const activeAccounts = accountsArray.filter(([_, stats]) => stats.totalEmails > 0)

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
            <span>{overallStats.processedEmails} / {overallStats.totalEmails} emails</span>
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
            <div className="text-sm text-muted-foreground">{currentAccount}</div>
          </div>
        )}

        {/* Account Details */}
        {activeAccounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Account Statistics:</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {activeAccounts.map(([accountId, stats]) => (
                <div key={accountId} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                  <span className="font-mono text-xs">{accountId.slice(0, 8)}...</span>
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
              Start Processing
            </Button>
          )}
          
          {isProcessing && (
            <Button 
              onClick={onPauseProcessing}
              variant="outline"
              className="flex-1"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          
          {(isProcessing || status === 'paused') && (
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
      </CardContent>
    </Card>
  )
}
