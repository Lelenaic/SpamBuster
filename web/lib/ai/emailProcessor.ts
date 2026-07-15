export interface ProcessingStats {
  totalEmails: number;
  spamEmails: number;
  processedEmails: number;
  skippedEmails: number;
  errors: number;
}

export interface AccountProcessingState {
  accountStats: Record<string, ProcessingStats>;
  overallStats: ProcessingStats;
  currentAccount?: string;
}

// Web shim: processing is performed by the backend. This class exists only so
// v1 component imports resolve; it is never instantiated in the web app.
export class EmailProcessorService {
  static getInstance(): EmailProcessorService | null {
    return null;
  }
  isCurrentlyProcessing(): boolean {
    return false;
  }
  getCurrentProcessingState(): AccountProcessingState | null {
    return null;
  }
  async processAllAccounts(): Promise<{ accountStats: Record<string, ProcessingStats>; overallStats: ProcessingStats }> {
    return { accountStats: {}, overallStats: { totalEmails: 0, spamEmails: 0, processedEmails: 0, skippedEmails: 0, errors: 0 } };
  }
  stopProcessing(): void {}
  async clearProcessedCache(): Promise<void> {}
  async refreshProcessedChecksums(): Promise<void> {}

  // Web shim: matches v1 component signature so imports resolve.
  static getOrCreateFromRenderer(): EmailProcessorService {
    return new EmailProcessorService();
  }
}
