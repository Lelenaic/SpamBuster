export interface Rule {
  id: string
  name: string
  text: string
  enabled: boolean
  emailAccounts: string[] | null
}

export interface Alert {
  id: string
  type: 'warning' | 'info' | 'error'
  user: string
  context: string
  message: string
  goto?: string
}
