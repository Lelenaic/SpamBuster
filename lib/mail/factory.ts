import { MailProvider, MailProviderType } from './types';
import { ImapProvider } from './imap';
import { Microsoft365Provider } from './microsoft365';
import { GoogleWorkspaceProvider } from './googleworkspace';

export class MailProviderFactory {
  static createProvider(type: MailProviderType): MailProvider {
    switch (type) {
      case 'imap':
        return new ImapProvider();
      case 'gmail':
        return new GoogleWorkspaceProvider();
      case 'outlook':
        return new Microsoft365Provider();
      default:
        throw new Error(`Unknown mail provider type: ${type}`);
    }
  }
}
