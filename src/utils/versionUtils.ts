/**
 * Utility functions for checking dataset version compatibility
 */

// Helper functions to get env vars dynamically
function getDatasetUrl(): string {
  return process.env.DATASET_URL || process.env.NEXT_PUBLIC_DATASET_URL || "https://huggingface.co/datasets";
}

function useLocalDatasets(): boolean {
  return process.env.NEXT_PUBLIC_USE_LOCAL_DATASETS === 'true';
}

function getLocalDatasetsPath(): string {
  return process.env.NEXT_PUBLIC_LOCAL_DATASETS_PATH || './public/datasets';
}

/**
 * Dataset information structure from info.json
 */
interface DatasetInfo {
  codebase_version: string;
  robot_type: string | null;
  total_episodes: number;
  total_frames: number;
  total_tasks: number;
  chunks_size: number;
  data_files_size_in_mb: number;
  video_files_size_in_mb: number;
  fps: number;
  splits: Record<string, string>;
  data_path: string;
  video_path: string;
  features: Record<string, any>;
}

/**
 * Check if dataset exists locally
 */
async function checkLocalDataset(repoId: string): Promise<boolean> {
  if (!useLocalDatasets()) return false;
  
  // In Node.js/server context, check filesystem directly
  if (typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const LOCAL_PATH = getLocalDatasetsPath();
      const infoPath = path.join(process.cwd(), LOCAL_PATH, repoId, 'meta', 'info.json');
      return fs.existsSync(infoPath);
    } catch {
      return false;
    }
  }
  
  // In browser context, try to fetch
  try {
    const localUrl = `/datasets/${repoId}/meta/info.json`;
    const response = await fetch(localUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Helper to get auth headers for HuggingFace requests (only for remote)
 */
function getAuthHeaders(): HeadersInit {
  // Only add auth for remote requests
  if (useLocalDatasets() && typeof window !== 'undefined') {
    return {}; // No auth needed for local files
  }
  
  const token = process.env.NEXT_PUBLIC_HF_TOKEN;
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }
  return {};
}

/**
 * Build URL for dataset files (local or remote)
 * @param repoId - Repository ID (e.g., "org/dataset")
 * @param version - Dataset version (unused currently)
 * @param path - Path within the dataset (e.g., "meta/info.json")
 * @param forBrowser - If true, returns browser-compatible URL even on server
 */
export function buildVersionedUrl(repoId: string, version: string, path: string, forBrowser: boolean = false): string {
  // Check if we should use local path
  if (useLocalDatasets()) {
    // In server context and not for browser, return filesystem path for direct reading
    if (typeof window === 'undefined' && !forBrowser) {
      const LOCAL_PATH = getLocalDatasetsPath();
      return `${LOCAL_PATH}/${repoId}/${path}`;
    }
    // In browser or for browser, use /datasets/ URL which Next.js serves from public/datasets/
    return `/datasets/${repoId}/${path}`;
  }
  
  // Fallback to remote HuggingFace URL
  return `${getDatasetUrl()}/${repoId}/resolve/main/${path}`;
}

/**
 * Fetches dataset information from local or remote
 */
export async function getDatasetInfo(repoId: string): Promise<DatasetInfo> {
  try {
    // Try local first
    const isLocal = await checkLocalDataset(repoId);
    
    // In server context with local dataset, read from filesystem directly
    if (isLocal && typeof window === 'undefined') {
      const fs = require('fs');
      const path = require('path');
      const LOCAL_PATH = getLocalDatasetsPath();
      const infoPath = path.join(process.cwd(), LOCAL_PATH, repoId, 'meta', 'info.json');
      const fileContent = fs.readFileSync(infoPath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Check if it has the required structure
      if (!data.features) {
        throw new Error("Dataset info.json does not have the expected features structure");
      }
      
      return data as DatasetInfo;
    }
    
    // In browser context or remote dataset, use fetch
    const testUrl = isLocal 
      ? `/datasets/${repoId}/meta/info.json`
      : `${getDatasetUrl()}/${repoId}/resolve/main/meta/info.json`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const headers = isLocal ? {} : getAuthHeaders();
    const response = await fetch(testUrl, { 
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset info: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if it has the required structure
    if (!data.features) {
      throw new Error("Dataset info.json does not have the expected features structure");
    }
    
    return data as DatasetInfo;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Dataset ${repoId} is not compatible with this visualizer. ` +
      "Failed to read dataset information."
    );
  }
}

/**
 * Gets the dataset version by reading the codebase_version from the main revision's info.json
 */
export async function getDatasetVersion(repoId: string): Promise<string> {
  try {
    const datasetInfo = await getDatasetInfo(repoId);
    
    // Extract codebase_version
    const codebaseVersion = datasetInfo.codebase_version;
    if (!codebaseVersion) {
      throw new Error("Dataset info.json does not contain codebase_version");
    }
    
    // Validate that it's a supported version
    const supportedVersions = ["v3.0", "v2.1", "v2.0"];
    if (!supportedVersions.includes(codebaseVersion)) {
      throw new Error(
        `Dataset ${repoId} has codebase version ${codebaseVersion}, which is not supported. ` +
        "This tool only works with dataset versions 3.0, 2.1, or 2.0. " +
        "Please use a compatible dataset version."
      );
    }
    
    return codebaseVersion;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Dataset ${repoId} is not compatible with this visualizer. ` +
      "Failed to read dataset information from the main revision."
    );
  }
}

