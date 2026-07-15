/**
 * Utility to check for newer versions on GitHub releases (web app)
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
  let s = repoUrl.trim().replace(/\.git$/, '').replace(/^https?:\/\//, '');
  if (s.startsWith('github.com/')) s = s.slice('github.com/'.length);
  else if (s.startsWith('github:')) s = s.slice('github:'.length);
  else if (s.startsWith('github/')) s = s.slice('github/'.length);
  const parts = s.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
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
 * Get package information for the web app
 */
async function getPackageInfo(): Promise<PackageInfo> {
  return {
    currentVersion: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
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
