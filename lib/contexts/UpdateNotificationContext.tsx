'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { type VersionCheckResult } from '@/lib/versionChecker';

interface UpdateNotificationState {
  updateInfo: VersionCheckResult | null;
  isVisible: boolean;
  showNotification: (info: VersionCheckResult) => void;
  hideNotification: () => void;
}

const UpdateNotificationContext = createContext<UpdateNotificationState | null>(null);

export function UpdateNotificationProvider({ children }: { children: React.ReactNode }) {
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResult | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showNotification = useCallback((info: VersionCheckResult) => {
    setUpdateInfo(info);
    if (info.hasUpdate) {
      setIsVisible(true);
    }
  }, []);

  const hideNotification = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <UpdateNotificationContext.Provider value={{ updateInfo, isVisible, showNotification, hideNotification }}>
      {children}
    </UpdateNotificationContext.Provider>
  );
}

export function useUpdateNotification() {
  const context = useContext(UpdateNotificationContext);
  if (!context) {
    throw new Error('useUpdateNotification must be used within UpdateNotificationProvider');
  }
  return context;
}
