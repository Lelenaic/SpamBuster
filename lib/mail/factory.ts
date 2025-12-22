import { MailProvider, MailProviderType } from './types';
import { ImapProvider } from './imap';

export class MailProviderFactory {
  static createProvider(type: MailProviderType): MailProvider {
    switch (type) {
      case 'imap':
        return new ImapProvider();
      case 'gmail':
        // TODO: Implement GmailProvider
        throw new Error('Gmail provider not implemented yet');
      case 'outlook':
        // TODO: Implement OutlookProvider
        throw new Error('Outlook provider not implemented yet');
      default:
        throw new Error(`Unknown mail provider type: ${type}`);
    }
  }
}
