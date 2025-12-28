import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * IPC handler to read package.json information
 */
export function getPackageInfo() {
  try {
    // Read package.json from the app root directory
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const packageData = JSON.parse(packageJsonContent);
    
    return {
      currentVersion: packageData.version,
      repository: packageData.repository?.url || '',
      name: packageData.name,
      error: null
    };
  } catch (error) {
    console.error('Error reading package.json:', error);
    return {
      currentVersion: '0.0.0',
      repository: '',
      name: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
