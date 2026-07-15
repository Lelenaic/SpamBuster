'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { installBridge, getToken } from '@/lib/bridge'
import { Toaster } from 'sonner'
import { UpdateNotificationProvider } from '@/lib/contexts/UpdateNotificationContext'
import { VersionUpdateNotification } from '@/components/VersionUpdateNotification'

// Shell components access `window.*` directly, so render them client-only.
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false })
const MainContent = dynamic(() => import('@/components/MainContent'), { ssr: false })

// Install the window.* bridge at module load so it is available before any
// child component's effects run.
installBridge()

export default function AppBootstrap({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isLogin = pathname === '/login'
    if (!getToken() && !isLogin) {
      router.replace('/login')
    }
    if (getToken() && isLogin) {
      router.replace('/')
    }
  }, [pathname, router])

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <UpdateNotificationProvider>
      <div className="flex h-screen">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
      <Toaster />
      <VersionUpdateNotification />
    </UpdateNotificationProvider>
  )
}
