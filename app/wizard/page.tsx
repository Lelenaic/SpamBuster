"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { IconBrandGoogle, IconBrandWindows, IconMail } from "@tabler/icons-react";

export default function WizardPage() {
  const [step, setStep] = useState(0);

  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Welcome to SpamBuster</CardTitle>
            <CardDescription>
              Let's set up your email account to start filtering spam with AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              This wizard will guide you through adding a new mail account and configuring anti-spam rules.
            </p>
            <Button className="w-full" onClick={() => setStep(1)}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Add Mail Account</CardTitle>
            <CardDescription>
              Choose the type of email account you want to add.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" variant="outline">
              <IconBrandGoogle className="mr-2 h-4 w-4" />
              Add Google Workspace/Gmail account
            </Button>
            <Button className="w-full" variant="outline">
              <IconBrandWindows className="mr-2 h-4 w-4" />
              Add Microsoft 365/Outlook account
            </Button>
            <Button className="w-full" variant="outline">
              <IconMail className="mr-2 h-4 w-4" />
              Add an Imap account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
