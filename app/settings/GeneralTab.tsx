"use client"

import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useState } from "react"
import { useEffect } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { EmailProcessorService } from "@/lib/ai/emailProcessor"

interface GeneralTabProps {
  aiSensitivity: number
  setAiSensitivity: (value: number) => void
  emailAgeDays: number
  setEmailAgeDays: (value: number) => void
  simplifyEmailContent: boolean
  setSimplifyEmailContent: (value: boolean) => void
  simplifyEmailContentMode: string
  setSimplifyEmailContentMode: (value: string) => void
  enableCron: boolean
  setEnableCron: (value: boolean) => void
  cronExpression: string
  setCronExpression: (value: string) => void
  schedulerMode: string
  setSchedulerMode: (value: string) => void
  schedulerSimpleValue: number
  setSchedulerSimpleValue: (value: number) => void
  schedulerSimpleUnit: string
  setSchedulerSimpleUnit: (value: string) => void
}

export default function GeneralTab({
  aiSensitivity,
  setAiSensitivity,
  emailAgeDays,
  setEmailAgeDays,
  simplifyEmailContent,
  setSimplifyEmailContent,
  simplifyEmailContentMode,
  setSimplifyEmailContentMode,
  enableCron,
  setEnableCron,
  cronExpression,
  setCronExpression,
  schedulerMode,
  setSchedulerMode,
  schedulerSimpleValue,
  setSchedulerSimpleValue,
  schedulerSimpleUnit,
  setSchedulerSimpleUnit,
}: GeneralTabProps) {
  const [cronValidationError, setCronValidationError] = useState<string>("")
  const [cronInputValue, setCronInputValue] = useState<string>(cronExpression)
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
  const [clearVectorDB, setClearVectorDB] = useState(false)

  // Sync input value with prop changes
  useEffect(() => {
    setCronInputValue(cronExpression)
  }, [cronExpression])

  const handleSensitivityChange = (value: string) => {
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
      setAiSensitivity(numValue)
    }
  }

  const handleEmailAgeDaysChange = (value: string) => {
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 365) {
      setEmailAgeDays(numValue)
    }
  }

  const handleCronExpressionChange = async (value: string) => {
    setCronInputValue(value)
    if (typeof window !== "undefined" && window.aiAPI) {
      // Validate the cron expression
      const validation = await window.aiAPI.validateCronExpression(value)
      if (!validation.valid) {
        const errorMessage = validation.error instanceof Error ? validation.error.message : (validation.error || "Invalid cron expression")
        setCronValidationError(errorMessage)
      } else {
        setCronValidationError("")
        setCronExpression(value)
        await window.aiAPI.setCronExpression(value)
      }
    }
  }

  const getSensitivityDescription = (value: number) => {
    if (value <= 1) return "Almost everything is spam"
    if (value <= 4) return "Aggressive - Catches more spam but may have more false positives"
    if (value <= 7) return "Balanced - Good balance between false positives and spam detection"
    if (value <= 8) return "Conservative - Only flags obvious spam"
    return "Very Conservative - Almost no false positives, may miss some spams"
  }

  const handleClearChecksums = async () => {
    try {
      if (clearVectorDB) {
        // Clear vector database
        await window.vectorDBAPI.clearAllEmails()
      }

      // Clear processed checksums from electron-store
      // Use getOrCreateFromRenderer to ensure processor exists
      const processor = EmailProcessorService.getOrCreateFromRenderer()
      await processor.clearProcessedCache()

      const message = clearVectorDB ? "Checksums and vector database cleared successfully" : "Checksums cleared successfully"
      toast.success(message)
    } catch (error) {
      console.error("Failed to clear checksums:", error)
      toast.error("Failed to clear checksums")
    }
    setIsClearDialogOpen(false)
    setClearVectorDB(false)
  }

  return (
    <TabsContent value="general" className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">General Settings</h2>
        <p className="text-muted-foreground">
          Configure general application settings and AI behavior.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-sensitivity">AI Filtering Sensitivity</Label>
            <p className="text-sm text-muted-foreground">
              The threshold of sensitivity for AI spam detection. Lower values make the AI more aggressive in flagging emails as spam (default: 7). For example with 7, it means any email with a spam score of 7/10 or higher will be marked as spam.
            </p>
            <div className="px-3">
              <Slider
                id="ai-sensitivity"
                min={1}
                max={10}
                step={1}
                value={[aiSensitivity]}
                onValueChange={(value) => handleSensitivityChange(value[0].toString())}
                className="w-full mt-6 mb-4"
              />
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>Aggressive</span>
              <span className="text-primary font-bold">{aiSensitivity}</span>
              <span>Conservative</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {getSensitivityDescription(aiSensitivity)}
            </p>
          </div>
        </div>

        <div className="space-y-4 mt-10">
          <div className="space-y-2">
            <Label htmlFor="email-age-days">Email Age Analysis (Days)</Label>
            <Input
              id="email-age-days"
              type="number"
              min="1"
              max="365"
              value={emailAgeDays}
              onChange={(e) => handleEmailAgeDaysChange(e.target.value)}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              Number of days to look back when analyzing email age for spam detection (default: 7 days)
            </p>
          </div>
        </div>

        <div className="space-y-4 mt-10">
          <div className="flex flex-row items-start space-x-3 space-y-0">
            <Checkbox
              id="simplify-email-content"
              checked={simplifyEmailContent}
              onCheckedChange={(checked) => setSimplifyEmailContent(checked === true)}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="simplify-email-content">
                Simplify Email Content
              </Label>
              <p className="text-sm text-muted-foreground">
                Reduce email size by turning HTML to Markdown. Improves processing speed and reduces cost. It might reduce quality as some spam/ham indications metadata from the html attributes could be lost.
              </p>
            </div>
          </div>
          {simplifyEmailContent && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="simplify-email-content-mode">Simplification Mode</Label>
              <Select value={simplifyEmailContentMode} onValueChange={setSimplifyEmailContentMode}>
                <SelectTrigger id="simplify-email-content-mode" className="w-60">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="aggressive">Aggressive (recommended)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {simplifyEmailContentMode === 'aggressive' 
                  ? 'Aggressive: Removes all HTML tags that do not have a Markdown equivalent and remove all the style.'
                  : 'Simple: Keeps HTML tags that do not have a Markdown equivalent and keep the style.'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 mt-10">
          <h3 className="text-lg font-semibold">Scheduled Processing</h3>
          <div className="flex flex-row items-start space-x-3 space-y-0">
            <Checkbox
              id="enable-cron"
              checked={enableCron}
              onCheckedChange={(checked) => setEnableCron(checked === true)}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="enable-cron">
                Enable Scheduled Email Analysis
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically run email analysis at scheduled intervals. Prevents duplicate processing if manual analysis is already running.
              </p>
            </div>
          </div>
          {enableCron && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="scheduler-mode">Scheduler Mode</Label>
              <Select value={schedulerMode} onValueChange={setSchedulerMode}>
                <SelectTrigger id="scheduler-mode" className="w-60">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="advanced">Advanced (cron)</SelectItem>
                </SelectContent>
              </Select>
              
              {schedulerMode === 'simple' ? (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="scheduler-simple">Run every</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="scheduler-simple"
                      type="number"
                      min="1"
                      max="60"
                      value={schedulerSimpleValue}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        if (!isNaN(value) && value >= 1) {
                          setSchedulerSimpleValue(value)
                        }
                      }}
                      className="w-24"
                    />
                    <Select value={schedulerSimpleUnit} onValueChange={setSchedulerSimpleUnit}>
                      <SelectTrigger id="scheduler-simple-unit" className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {schedulerSimpleUnit === 'minutes' 
                      ? `Every ${schedulerSimpleValue} minute${schedulerSimpleValue > 1 ? 's' : ''}`
                      : `Every ${schedulerSimpleValue} hour${schedulerSimpleValue > 1 ? 's' : ''} at minute 0`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="cron-expression">Cron Expression</Label>
                  <Input
                    id="cron-expression"
                    type="text"
                    value={cronInputValue}
                    onChange={(e) => handleCronExpressionChange(e.target.value)}
                    placeholder="* * * * *"
                    className={cronValidationError ? "border-red-500" : ""}
                  />
                  <p className="text-sm text-muted-foreground">
                    Cron expression for scheduling. Use standard cron syntax.
                  </p>
                  {cronValidationError && (
                    <p className="text-sm text-red-500">{cronValidationError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 mt-10">
          <h3 className="text-lg font-semibold">Data Management</h3>
          <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Checksums
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Checksums</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all stored checksums of analyzed emails. You can optionally also clear the vector database to remove all stored email embeddings and analysis data. This action cannot be undone. Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center space-x-2 py-4">
                <Checkbox
                  id="clear-vector-db"
                  checked={clearVectorDB}
                  onCheckedChange={(checked) => setClearVectorDB(checked === true)}
                />
                <Label htmlFor="clear-vector-db" className="text-sm">
                  Also clear vector database (removes all stored email embeddings and analysis data)
                </Label>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearChecksums} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-sm text-muted-foreground">
            Clear all checksums of analyzed emails. This will reset the analysis history and allow re-analysis of previously processed emails.
          </p>
        </div>
      </div>
    </TabsContent>
  )
}
