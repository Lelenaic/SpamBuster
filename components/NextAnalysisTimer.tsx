'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { CalendarClock } from 'lucide-react'

interface NextAnalysisTimerProps {
  isProcessing: boolean
}

interface SchedulerConfig {
  enableCron: boolean
  schedulerMode: string
  schedulerSimpleValue: number
  schedulerSimpleUnit: string
  cronExpression: string
}

// Parse a cron field and check if a value matches
function cronFieldMatches(field: string, value: number): boolean {
  if (field === '*') return true
  
  if (field.includes('/')) {
    const [range, step] = field.split('/')
    const stepNum = parseInt(step, 10)
    if (range === '*') {
      return value % stepNum === 0
    }
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number)
      const adjustedValue = value - start
      return value >= start && value <= end && adjustedValue % stepNum === 0
    }
  }
  
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number)
    return value >= start && value <= end
  }
  
  if (field.includes(',')) {
    const values = field.split(',').map(Number)
    return values.includes(value)
  }
  
  return parseInt(field, 10) === value
}

function getNextCronRun(cronExpr: string): Date {
  const now = new Date()
  const parts = cronExpr.trim().split(/\s+/)
  
  if (parts.length < 5) {
    return new Date(now.getTime() + 60000)
  }
  
  const [, hour, , , dayOfWeek] = parts
  const minute = parts[0]
  const dom = parts[2]
  const month = parts[3]
  
  for (let i = 0; i < 365 * 24 * 60; i++) {
    const checkDate = new Date(now.getTime() + i * 60000)
    
    if (
      cronFieldMatches(minute, checkDate.getMinutes()) &&
      cronFieldMatches(hour, checkDate.getHours()) &&
      cronFieldMatches(dom, checkDate.getDate()) &&
      cronFieldMatches(month, checkDate.getMonth() + 1) &&
      cronFieldMatches(dayOfWeek, checkDate.getDay())
    ) {
      // Reset seconds and milliseconds to 0 for cron jobs
      const exactDate = new Date(checkDate)
      exactDate.setSeconds(0, 0)
      return exactDate
    }
  }
  
  return new Date(now.getTime() + 3600000)
}

function calculateTimeRemaining(nextRun: Date): string {
  const now = new Date()
  const diffMs = nextRun.getTime() - now.getTime()
  
  if (diffMs <= 0) {
    return 'Soon...'
  }

  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  const secs = diffSecs % 60
  const mins = diffMins % 60
  const hours = diffHours % 24

  if (diffDays > 0) {
    return `${diffDays}d ${hours}h ${mins}m`
  } else if (diffHours > 0) {
    return `${diffHours}h ${mins}m ${secs}s`
  } else if (diffMins > 0) {
    return `${diffMins}m ${secs}s`
  } else {
    return `${diffSecs}s`
  }
}

export default function NextAnalysisTimer({ isProcessing }: NextAnalysisTimerProps) {
  const [displayTime, setDisplayTime] = useState<string>('')
  const [config, setConfig] = useState<SchedulerConfig | null>(null)
  const nextRunTimeRef = useRef<Date | null>(null)
  const animationRef = useRef<number | null>(null)
  const isProcessingRef = useRef<boolean>(false)

  const calculateNextRun = useCallback((cfg: SchedulerConfig): Date => {
    const now = new Date()
    let nextRun: Date

    if (cfg.schedulerMode === 'simple') {
      const value = cfg.schedulerSimpleValue
      const unit = cfg.schedulerSimpleUnit
      
      if (unit === 'minutes') {
        const intervalMs = value * 60 * 1000
        const msSinceEpoch = now.getTime()
        const nextIntervalMs = Math.ceil(msSinceEpoch / intervalMs) * intervalMs
        nextRun = new Date(nextIntervalMs)
      } else {
        const intervalMs = value * 60 * 60 * 1000
        const nextHour = new Date(now)
        nextHour.setMinutes(0, 0, 0)
        const hoursElapsed = Math.ceil((now.getTime() - nextHour.getTime()) / (value * 60 * 60 * 1000))
        nextHour.setHours(nextHour.getHours() + hoursElapsed * value)
        nextRun = nextHour
      }
    } else {
      nextRun = getNextCronRun(cfg.cronExpression)
    }

    return nextRun
  }, [])

  // Sync processing state to ref for animation loop
  useEffect(() => {
    isProcessingRef.current = isProcessing
  }, [isProcessing])

  const startAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const updateDisplay = () => {
      // Only update display if not processing
      if (!isProcessingRef.current && nextRunTimeRef.current && config) {
        const remaining = calculateTimeRemaining(nextRunTimeRef.current)
        setDisplayTime(remaining)
        
        // If time has passed, recalculate next run
        if (nextRunTimeRef.current.getTime() <= Date.now()) {
          const nextRun = calculateNextRun(config)
          nextRunTimeRef.current = nextRun
          setDisplayTime(calculateTimeRemaining(nextRun))
        }
      }
      animationRef.current = requestAnimationFrame(updateDisplay)
    }

    animationRef.current = requestAnimationFrame(updateDisplay)
  }, [calculateNextRun, config])

  // Load scheduler configuration
  useEffect(() => {
    const loadConfig = async () => {
      if (typeof window !== 'undefined' && window.generalAPI) {
        const enableCron = await window.generalAPI.getEnableCron()
        const schedulerMode = await window.generalAPI.getSchedulerMode()
        const schedulerSimpleValue = await window.generalAPI.getSchedulerSimpleValue()
        const schedulerSimpleUnit = await window.generalAPI.getSchedulerSimpleUnit()
        const cronExpression = await window.generalAPI.getCronExpression()
        
        const newConfig = {
          enableCron,
          schedulerMode,
          schedulerSimpleValue,
          schedulerSimpleUnit,
          cronExpression,
        }
        setConfig(newConfig)
        
        // Calculate next run time immediately
        if (enableCron) {
          const nextRun = calculateNextRun(newConfig)
          nextRunTimeRef.current = nextRun
          setDisplayTime(calculateTimeRemaining(nextRun))
          // Only start animation if not processing
          if (!isProcessingRef.current) {
            startAnimation()
          }
        }
      }
    }
    loadConfig()

    // Listen for settings changes
    if (typeof window !== 'undefined' && window.processingEvents) {
      const unsub = window.processingEvents.onSchedulerSettingsChanged(() => {
        loadConfig()
      })
      return unsub
    }
  }, [calculateNextRun, startAnimation])

  // Handle processing state
  useEffect(() => {
    if (isProcessing && config?.enableCron) {
      setTimeout(() => {
        setDisplayTime('Processing...')
      }, 0)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    } else if (!isProcessing && config?.enableCron && nextRunTimeRef.current) {
      // When processing stops, recalculate next run and restart animation
      const nextRun = calculateNextRun(config)
      nextRunTimeRef.current = nextRun
      setTimeout(() => {
        setDisplayTime(calculateTimeRemaining(nextRun))
        startAnimation()
      }, 0)
    }
  }, [isProcessing, config, calculateNextRun, startAnimation])

  if (!config?.enableCron) {
    return (
      <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
        <CalendarClock className="h-4 w-4" />
        <span>Scheduled analysis is disabled. You can enable it in the settings.</span>
      </div>
    )
  }

  // When processing, don't show the timer at all
  if (isProcessing) {
    return (
      <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
        <CalendarClock className="h-4 w-4 animate-pulse" />
        <span>Processing...</span>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
      <CalendarClock className="h-4 w-4" />
      <span>Next auto-analysis in</span>
      <span className="font-mono font-medium text-foreground">{displayTime || '...'}</span>
    </div>
  )
}
