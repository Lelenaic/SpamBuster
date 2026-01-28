"use client";

import { useState } from "react";
import { WelcomeStep } from "./steps/WelcomeStep";
import { AccountSelectionStep } from "./steps/AccountSelectionStep";
import { ImapSettingsStep } from "./steps/ImapSettingsStep";
import { ImapFolderStep } from "./steps/ImapFolderStep";
import { AIConfigurationStep } from "./steps/AIConfigurationStep";
import { Microsoft365AuthStep } from "./steps/Microsoft365AuthStep";
import { Microsoft365FolderStep } from "./steps/Microsoft365FolderStep";
import { GoogleWorkspaceAuthStep } from "./steps/GoogleWorkspaceAuthStep";
import { GoogleWorkspaceFolderStep } from "./steps/GoogleWorkspaceFolderStep";
import { Account } from "@/lib/mail";

export default function WizardPage() {
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [pendingOutlookAccount, setPendingOutlookAccount] = useState<Account | null>(null);
  const [pendingGmailAccount, setPendingGmailAccount] = useState<Account | null>(null);
  const [pendingImapAccount, setPendingImapAccount] = useState<Account | null>(null);

  const handleNext = () => {
    setStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setStep((prevStep) => prevStep - 1);
  };

  const handleAccountSelect = (type: string) => {
    setAccountType(type);
    handleNext();
  };

  const handleCloseWizard = () => {
    if (typeof window !== "undefined" && window.electronAPI) {
      window.electronAPI.send('wizard-closed');
      window.electronAPI.send('accounts-refresh-needed');
    }
  };

  const handleOutlookAuthComplete = (account: Account) => {
    setPendingOutlookAccount(account);
    handleNext();
  };

  const handleOutlookFolderComplete = (account: Account) => {
    setPendingOutlookAccount(account);
    handleNext();
  };

  const handleGmailAuthComplete = (account: Account) => {
    setPendingGmailAccount(account);
    handleNext();
  };

  const handleGmailFolderComplete = (account: Account) => {
    setPendingGmailAccount(account);
    handleNext();
  };

  const handleImapSettingsComplete = (account: Account) => {
    setPendingImapAccount(account);
    handleNext();
  };

  const handleImapFolderComplete = (account: Account) => {
    setPendingImapAccount(account);
    handleNext();
  };

  switch (step) {
    case 0:
      return <WelcomeStep onNext={handleNext} />;
    case 1:
      return <AccountSelectionStep onBack={handleBack} onAccountSelect={handleAccountSelect} />;
    case 2:
      if (accountType === 'imap') {
        return <ImapSettingsStep onBack={handleBack} onNext={handleImapSettingsComplete} />;
      }
      if (accountType === 'outlook') {
        return <Microsoft365AuthStep onBack={handleBack} onComplete={handleOutlookAuthComplete} />;
      }
      if (accountType === 'gmail') {
        return <GoogleWorkspaceAuthStep onBack={handleBack} onComplete={handleGmailAuthComplete} />;
      }
      return null;
    case 3:
      if (accountType === 'imap' && pendingImapAccount) {
        return <ImapFolderStep account={pendingImapAccount} onBack={handleBack} onComplete={handleImapFolderComplete} />;
      }
      if (accountType === 'outlook' && pendingOutlookAccount) {
        return <Microsoft365FolderStep account={pendingOutlookAccount} onBack={handleBack} onComplete={handleOutlookFolderComplete} />;
      }
      if (accountType === 'gmail' && pendingGmailAccount) {
        return <GoogleWorkspaceFolderStep account={pendingGmailAccount} onBack={handleBack} onComplete={handleGmailFolderComplete} />;
      }
      return <AIConfigurationStep onClose={handleCloseWizard} />;
    case 4:
      return <AIConfigurationStep onClose={handleCloseWizard} />;
    default:
      return null;
  }
}
