"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { IconBrandGoogle, IconBrandWindows, IconMail } from "@tabler/icons-react";

interface AccountSelectionStepProps {
  onBack?: () => void;
  onAccountSelect?: (type: string) => void;
}

export function AccountSelectionStep({ onBack, onAccountSelect }: AccountSelectionStepProps) {
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
          <Button className="w-full" variant="outline" disabled>
            <IconBrandGoogle className="mr-2 h-4 w-4" />
            Add Google Workspace/Gmail account (COMING SOON)
          </Button>
          <Button className="w-full" variant="outline" onClick={() => onAccountSelect?.('outlook')}>
            <IconBrandWindows className="mr-2 h-4 w-4" />
            Add Microsoft 365 account
          </Button>
          <Button className="w-full" variant="outline" onClick={() => onAccountSelect?.('imap')}>
            <IconMail className="mr-2 h-4 w-4" />
            Add an Imap account
          </Button>
          {onBack && (
            <Button className="w-full mt-4" variant="ghost" onClick={onBack}>
              Back
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
