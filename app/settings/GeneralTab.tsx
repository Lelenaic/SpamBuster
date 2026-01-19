"use client"

import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

interface GeneralTabProps {
  aiSensitivity: number
  setAiSensitivity: (value: number) => void
  emailAgeDays: number
  setEmailAgeDays: (value: number) => void
  simplifyEmailContent: boolean
  setSimplifyEmailContent: (value: boolean) => void
}

export default function GeneralTab({
  aiSensitivity,
  setAiSensitivity,
  emailAgeDays,
  setEmailAgeDays,
  simplifyEmailContent,
  setSimplifyEmailContent,
}: GeneralTabProps) {
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

  const getSensitivityDescription = (value: number) => {
    if (value <= 1) return "Everything is spam"
    if (value <= 4) return "Aggressive - Catches more spam but may have more false positives"
    if (value <= 7) return "Balanced - Good balance between false positives and spam detection"
    if (value <= 8) return "Conservative - Only flags obvious spam"
    return "Very Conservative - Almost no false positives, will miss many spams"
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
              The threshold of sensitivity for AI spam detection. Higher values make the AI more aggressive in flagging emails as spam (default: 7).
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
        </div>
      </div>
    </TabsContent>
  )
}
