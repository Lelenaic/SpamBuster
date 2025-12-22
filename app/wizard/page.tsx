"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconMail } from "@tabler/icons-react";

export default function WizardPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <IconMail className="w-6 h-6 text-primary-foreground" />
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
          <Button className="w-full">
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
