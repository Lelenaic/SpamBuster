import { MailProvider, MailProviderType } from './types';
import { ImapProvider } from './imap';
import { Microsoft365Provider } from './microsoft365';

export class MailProviderFactory {
  static createProvider(type: MailProviderType): MailProvider {
    switch (type) {
      case 'imap':
        return new ImapProvider();
      case 'gmail':
        // TODO: Implement GmailProvider
        throw new Error('Gmail provider not implemented yet');
      case 'outlook':
        return new Microsoft365Provider();
      default:
        throw new Error(`Unknown mail provider type: ${type}`);
    }
  }
}
