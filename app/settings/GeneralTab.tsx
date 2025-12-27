"use client"

import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"

interface GeneralTabProps {
  aiSensitivity: number
  setAiSensitivity: (value: number) => void
}

export default function GeneralTab({
  aiSensitivity,
  setAiSensitivity,
}: GeneralTabProps) {
  const handleSensitivityChange = (value: string) => {
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
      setAiSensitivity(numValue)
    }
  }

  const getSensitivityDescription = (value: number) => {
    if (value <= 4) return "Conservative - Only flags obvious spam"
    if (value <= 7) return "Balanced - Good balance between false positives and spam detection"
    if (value <= 8) return "Aggressive - Catches more spam but may have more false positives"
    return "Very Aggressive - Maximum spam detection, highest chance of false positives"
  }

  return (
    <TabsContent value="general" className="space-y-8 mt-6">
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
              <span>Conservative</span>
              <span className="text-primary font-bold">{aiSensitivity}</span>
              <span>Very Aggressive</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {getSensitivityDescription(aiSensitivity)}
            </p>
          </div>
        </div>
      </div>
    </TabsContent>
  )
}
