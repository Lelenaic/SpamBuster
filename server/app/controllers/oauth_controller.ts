import type { HttpContext } from '@adonisjs/core/http'
import encryption from '@adonisjs/core/services/encryption'
import { GoogleWorkspaceProvider } from '#services/mail/google_provider'
import { Microsoft365Provider } from '#services/mail/microsoft_provider'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common'

interface OAuthConfig {
  clientId: string
  clientSecret?: string
  tenantId?: string
  userEmail: string
  accessToken: string
  refreshToken: string
  tokenExpiry: string
}

function successHtml(provider: string, config: OAuthConfig): string {
  const payload = JSON.stringify({ type: 'oauth-success', provider, config })
  return `<!doctype html><html><head><title>Authentication complete</title></head>
<body><script>
  (function() {
    var payload = ${payload};
    if (window.opener) {
      window.opener.postMessage(payload, '*');
      window.close();
    } else {
      document.body.textContent = 'Authentication complete. You may close this window.';
    }
  })();
</script>
<p>Authentication complete. You may close this window.</p>
</body></html>`
}

function errorHtml(message: string): string {
  const payload = JSON.stringify({ type: 'oauth-error', error: message })
  return `<!doctype html><html><head><title>Authentication failed</title></head>
<body><script>
  (function() {
    var payload = ${payload};
    if (window.opener) { window.opener.postMessage(payload, '*'); window.close(); }
  })();
</script><p>Authentication failed: ${message.replace(/</g, '')}</p></body></html>`
}

export default class OAuthController {
  /**
   * Google authorization-code flow. Returns the provider authorize URL with a
   * signed `state` (so the callback can recover the user without a session).
   * Credentials are read from the server environment.
   */
  async googleStart({ auth, request, response }: HttpContext) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return response.status(400).json({
        message: 'Google OAuth is not configured on the server (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).',
      })
    }

    const userId = auth.user!.id
    const state = encryption.encrypt(JSON.stringify({ userId, provider: 'google' }))
    const redirectUri = new URL('/api/v1/oauth/google/callback', request.url()).toString()

    const provider = new GoogleWorkspaceProvider()
    const { authUrl } = await provider.initiateAuth(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri)

    const url = new URL(authUrl)
    url.searchParams.set('state', state)
    return { authUrl: url.toString() }
  }

  /**
   * Google OAuth redirect target (hit by Google, not the user's session).
   * Exchanges the code server-side, then posts the resulting config to the
   * popup's opener window.
   */
  async googleCallback({ request, response }: HttpContext) {
    const error = request.input('error')
    const errorDescription = request.input('error_description')
    if (error) {
      response.header('Content-Type', 'text/html')
      return errorHtml(errorDescription || error)
    }

    const code = request.input('code')
    const state = request.input('state')
    if (!code || !state) {
      response.header('Content-Type', 'text/html')
      return errorHtml('Missing code or state parameter')
    }

    let userId: number
    try {
      const decoded = JSON.parse(encryption.decrypt(state) as string) as { userId: number; provider: string }
      if (decoded.provider !== 'google') throw new Error('invalid provider')
      userId = decoded.userId
    } catch {
      response.header('Content-Type', 'text/html')
      return errorHtml('Invalid state parameter')
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      response.header('Content-Type', 'text/html')
      return errorHtml('Google OAuth is not configured on the server')
    }

    const redirectUri = new URL('/api/v1/oauth/google/callback', request.url()).toString()
    const provider = new GoogleWorkspaceProvider()

    let tokens: { access_token: string; refresh_token: string; expires_in: number }
    try {
      tokens = await provider.exchangeCodeForToken(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, code, redirectUri)
    } catch (e) {
      response.header('Content-Type', 'text/html')
      return errorHtml(e instanceof Error ? e.message : 'Failed to exchange code for token')
    }

    let userEmail = `user-${userId}`
    try {
      const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userResp.ok) {
        const user = (await userResp.json()) as { email?: string }
        if (user.email) userEmail = user.email
      }
    } catch {
      // Non-fatal: fall back to the user id
    }

    const config: OAuthConfig = {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      userEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }

    response.header('Content-Type', 'text/html')
    return successHtml('google', config)
  }

  /**
   * Microsoft device-code flow. Returns a user code + verification URI for the
   * user to complete in a separate browser. Credentials are server-side.
   */
  async microsoftDeviceCode({ response }: HttpContext) {
    if (!MICROSOFT_CLIENT_ID) {
      return response.status(400).json({
        message: 'Microsoft OAuth is not configured on the server (set MICROSOFT_CLIENT_ID).',
      })
    }

    const provider = new Microsoft365Provider()
    const result = await provider.initiateAuth(MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID)
    return result
  }

  /**
   * Poll Microsoft for the device-code token. On success returns the account
   * config (including the server-side client secret) so the frontend can
   * create the account.
   */
  async microsoftPoll({ request, response }: HttpContext) {
    const deviceCode = request.input('deviceCode')
    if (!deviceCode) {
      return response.status(400).json({ status: 'error', error: 'deviceCode is required' })
    }
    if (!MICROSOFT_CLIENT_ID) {
      return response.status(400).json({
        status: 'error',
        error: 'Microsoft OAuth is not configured on the server (set MICROSOFT_CLIENT_ID).',
      })
    }

    const provider = new Microsoft365Provider()
    try {
      const tokens = await provider.exchangeCodeForToken(MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID, deviceCode)

      let userEmail = 'user'
      try {
        const userResp = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        if (userResp.ok) {
          const user = (await userResp.json()) as { mail?: string; userPrincipalName?: string }
          userEmail = user.mail || user.userPrincipalName || userEmail
        }
      } catch {
        // Non-fatal
      }

      const config: OAuthConfig = {
        clientId: MICROSOFT_CLIENT_ID,
        clientSecret: MICROSOFT_CLIENT_SECRET,
        tenantId: MICROSOFT_TENANT_ID,
        userEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      }
      return { status: 'success', config }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Token exchange failed'
      if (message === 'authorization_pending') {
        return { status: 'pending' }
      }
      if (message === 'expired_token') {
        return response.status(400).json({ status: 'error', error: 'Authorization expired. Please try again.' })
      }
      return response.status(400).json({ status: 'error', error: message })
    }
  }
}
