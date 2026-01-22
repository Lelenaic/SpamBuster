import { app } from 'electron';

/**
 * IPC handler to read package.json information
 */
export function getPackageInfo() {
  try {
    // Read package.json from the app root directory

    const result = {
      currentVersion: app.getVersion(),
      repository: 'github:Lelenaic/SpamBuster',
    };
    return result;
  } catch (error) {
    return {
      currentVersion: '0.0.0',
      repository: '',
      name: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
