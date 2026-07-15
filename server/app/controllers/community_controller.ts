import type { HttpContext } from '@adonisjs/core/http'
import CommunityToken from '#models/community_token'

const COMMUNITY_API_BASE = process.env.COMMUNITY_API_BASE_URL || 'https://api.spambuster.lenaic.me/api/v1'

async function getCommunityToken(userId: number): Promise<string | null> {
  const row = await CommunityToken.query().where('user_id', userId).first()
  if (!row) return null
  const token = row.getToken()
  return token || null
}

async function proxy(ctx: HttpContext, method: string, path: string, body?: unknown) {
  const token = await getCommunityToken(ctx.auth.user!.id)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${COMMUNITY_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  ctx.response.status(response.status)
  if (response.headers.get('content-type')?.includes('application/json')) {
    return data
  }
  return { body: text }
}

export default class CommunityController {
  async getRules(ctx: HttpContext) {
    return proxy(ctx, 'GET', '/rules')
  }

  async searchRules({ params, ...ctx }: HttpContext) {
    return proxy(ctx as HttpContext, 'GET', `/rules/search/${encodeURIComponent(params.q)}`)
  }

  async getCuratedModels(ctx: HttpContext) {
    return proxy(ctx, 'GET', '/curated-models')
  }

  async login({ auth, request, response }: HttpContext) {
    const email = request.input('email')
    const password = request.input('password')
    if (!email || !password) return response.badRequest({ message: 'email and password are required' })

    const res = await fetch(`${COMMUNITY_API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const text = await res.text()
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    if (!res.ok) {
      response.status(res.status)
      return data
    }

    const token = data?.token || data?.access_token
    if (token) {
      let row = await CommunityToken.query().where('user_id', auth.user!.id).first()
      if (!row) {
        row = new CommunityToken()
        row.userId = auth.user!.id
      }
      row.setToken(token)
      await row.save()
    }

    return data
  }
}
