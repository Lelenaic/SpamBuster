"use client"

import React, { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

declare global {
  interface Window {
    store: {
      get: (key: string) => unknown
      set: (key: string, value: unknown) => void
    }
  }
}

export default function Settings() {
  const [aiSource, setAiSource] = useState<string>(() => {
    if (typeof window !== "undefined" && window.store) {
      return (window.store.get("aiSource") as string) ?? "ollama"
    }
    return "ollama"
  })

  const handleAiSourceChange = (value: string) => {
    setAiSource(value)
    if (typeof window !== "undefined" && window.store) {
      window.store.set("aiSource", value)
    }
    toast.success("AI provider updated successfully")
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <div className="bg-card rounded-xl border shadow-sm p-8 space-y-8">
        <div className="space-y-2">
          <Label htmlFor="ai-source">AI Provider</Label>
          <Select value={aiSource} onValueChange={handleAiSourceChange}>
            <SelectTrigger id="ai-source">
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ollama">Ollama (Local)</SelectItem>
              <SelectItem value="openrouter">OpenRouter (Cloud)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
