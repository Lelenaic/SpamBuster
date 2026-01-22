/**
 * Utility to check for newer versions on GitHub releases
 * Works with Electron IPC for desktop app
 */

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  name: string;
  published_at: string;
}

interface PackageInfo {
  currentVersion: string;
  repository: string;
}

export interface VersionCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  releaseName?: string;
  error?: string;
}

/**
 * Extract owner and repository name from GitHub URL
 */
function parseGitHubUrl(repoUrl: string): { owner: string; repo: string } | null {
  // Handle different formats: "github:Lelenaic/SpamBuster", "github.com/Lelenaic/SpamBuster", etc.
  const match = repoUrl.match(/(?:github(?:\.com)?:)?([^\/]+)\/([^\/]+)/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '') // Remove .git suffix if present
    };
  }
  return null;
}

/**
 * Compare two semantic versions
 * Returns true if version1 < version2
 */
function isVersionOlder(version1: string, version2: string): boolean {
  const v1 = version1.replace(/^v/, '').split('.').map(Number);
  const v2 = version2.replace(/^v/, '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const n1 = v1[i] || 0;
    const n2 = v2[i] || 0;
    
    if (n1 < n2) return true;
    if (n1 > n2) return false;
  }
  
  return false;
}

/**
 * Get package information using Electron IPC
 */
async function getPackageInfo(): Promise<PackageInfo> {
  // Check if running in Electron environment
  if (typeof window !== 'undefined' && window.packageAPI) {
    try {
      return await window.packageAPI.getInfo();
    } catch (error) {
      return {
        currentVersion: '0.0.0',
        repository: '',
      };
    }
  }

  // Fallback for non-Electron environments (development)
  return {
    currentVersion: '0.0.0',
    repository: 'github:Lelenaic/SpamBuster',
  };
}

/**
 * Check if a newer version is available on GitHub
 */
export async function checkForNewerVersion(): Promise<VersionCheckResult> {
  try {
    // Get package information via IPC
    const packageInfo = await getPackageInfo();

    const { currentVersion, repository } = packageInfo;

    // Parse GitHub repository URL
    const parsedRepo = parseGitHubUrl(repository);
    if (!parsedRepo) {
      return {
        hasUpdate: false,
        currentVersion,
        error: 'Invalid repository URL format'
      };
    }

    const { owner, repo } = parsedRepo;

    // Fetch latest release from GitHub API
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const githubResponse = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!githubResponse.ok) {
      if (githubResponse.status === 404) {
        // No releases found
        return {
          hasUpdate: false,
          currentVersion,
          error: 'No releases found on GitHub'
        };
      }
      throw new Error(`GitHub API error: ${githubResponse.status}`);
    }

    const release: GitHubRelease = await githubResponse.json();
    const latestVersion = release.tag_name;

    // Compare versions
    const hasUpdate = isVersionOlder(currentVersion, latestVersion);

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseUrl: release.html_url,
      releaseName: release.name
    };

  } catch (error) {
    return {
      hasUpdate: false,
      currentVersion: '0.0.0',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
