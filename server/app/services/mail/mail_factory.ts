import type { MailProvider, MailProviderType } from '#services/mail/mail_types'
import { ImapProvider } from '#services/mail/imap_provider'
import { Microsoft365Provider } from '#services/mail/microsoft_provider'
import { GoogleWorkspaceProvider } from '#services/mail/google_provider'

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
