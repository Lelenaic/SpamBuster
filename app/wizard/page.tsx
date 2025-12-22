"use client";

import { useState } from "react";
import { WelcomeStep } from "./steps/WelcomeStep";
import { AccountSelectionStep } from "./steps/AccountSelectionStep";
import { ImapSettingsStep } from "./steps/ImapSettingsStep";

export default function WizardPage() {
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState<string | null>(null);

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

  switch (step) {
    case 0:
      return <WelcomeStep onNext={handleNext} />;
    case 1:
      return <AccountSelectionStep onBack={handleBack} onAccountSelect={handleAccountSelect} />;
    case 2:
      if (accountType === 'imap') {
        return <ImapSettingsStep onBack={handleBack} onNext={handleNext} />;
      }
      return null;
    default:
      return null;
  }
}
