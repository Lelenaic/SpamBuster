'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { checkForNewerVersion, type VersionCheckResult } from '@/lib/versionChecker';

export function VersionUpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResult | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const result = await checkForNewerVersion();
        setUpdateInfo(result);
        
        // Show notification only if there's an update and no error
        if (result.hasUpdate && !result.error) {
          setIsVisible(true);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkForUpdates();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleUpdateClick = async () => {
    if (updateInfo?.releaseUrl) {
      await window.shellAPI.openExternal(updateInfo.releaseUrl);
    }
  };

  // Don't render anything if there's no update or it's not visible
  if (isLoading || !isVisible || !updateInfo?.hasUpdate) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className="border-blue-200 bg-blue-50 shadow-lg">
        <Download className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="font-medium text-blue-900">
              New version available!
            </p>
            <p className="text-sm text-blue-700">
              SpamBuster {updateInfo.latestVersion} is now available 
              (you have {updateInfo.currentVersion})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleUpdateClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              className="text-blue-600 hover:text-blue-800 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
