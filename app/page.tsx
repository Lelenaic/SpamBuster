'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Alert as AlertType } from '@/lib/types'
import { AlertsManager } from '@/lib/alerts'

export default function Home() {
  const [alerts, setAlerts] = useState<AlertType[]>([])

  useEffect(() => {
    AlertsManager.list().then(setAlerts)
  }, [])

  const handleDelete = async (id: string) => {
    await AlertsManager.delete(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }


  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
      <div className="bg-card rounded-lg shadow p-6">
        <p className="text-muted-foreground">Welcome to SpamBuster! This is your dashboard where you can monitor and manage your email anti-spam settings.</p>
        <hr className="mt-6" />
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Alerts</h2>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">No alerts at the moment.</p>
          ) : (
            alerts.map(alert => (
              <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'} className="mb-4">
                <AlertTitle>{alert.user} - {alert.context}: {alert.type}</AlertTitle>
                <AlertDescription className="flex justify-between items-center">
                  {alert.message}
                  <div className="flex gap-2">
                    {alert.goto && <Link href={alert.goto}>
                      <Button size="sm">Go to Fix</Button>
                    </Link>}
                    <Button size="sm" variant="outline" onClick={() => handleDelete(alert.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
