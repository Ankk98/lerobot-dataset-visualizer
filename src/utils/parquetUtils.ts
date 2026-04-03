import { parquetRead, parquetReadObjects } from "hyparquet";

export interface DatasetMetadata {
  codebase_version: string;
  robot_type: string;
  total_episodes: number;
  total_frames: number;
  total_tasks: number;
  total_videos: number;
  total_chunks: number;
  chunks_size: number;
  fps: number;
  splits: Record<string, string>;
  data_path: string;
  video_path: string;
  features: Record<
    string,
    {
      dtype: string;
      shape: any[];
      names: any[] | Record<string, any> | null;
      info?: Record<string, any>;
    }
  >;
}

// Helper to get auth headers for HuggingFace requests (only for remote)
function getAuthHeaders(): HeadersInit {
  // Check if URL is local (starts with /)
  // Local files don't need authentication
  const token = process.env.NEXT_PUBLIC_HF_TOKEN;
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }
  return {};
}

export async function fetchJson<T>(url: string): Promise<T> {
  // Check if it's a local file path
  const isLocalPath = url.startsWith('./') || url.startsWith('../') || (!url.startsWith('http'));
  const isLocalUrl = url.startsWith('/');
  
  if ((isLocalPath || isLocalUrl) && typeof window === 'undefined') {
    // Server-side: read from filesystem
    try {
      const fs = require('fs');
      const path = require('path');
      // Convert paths to absolute filesystem paths
      let filePath;
      if (isLocalUrl) {
        // /datasets/... -> ./public/datasets/...
        filePath = path.join(process.cwd(), 'public', url);
      } else {
        // ./public/datasets/... -> absolute path
        filePath = path.join(process.cwd(), url);
      }
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent) as T;
    } catch (error) {
      throw new Error(
        `Failed to read local JSON ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
  
  // Client-side or remote: use fetch
  const headers = isLocalUrl ? {} : getAuthHeaders();
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch JSON ${url}: ${res.status} ${res.statusText}`,
    );
  }
  return res.json() as Promise<T>;
}

export function formatStringWithVars(
  format: string,
  vars: Record<string, any>,
): string {
  return format.replace(/{(\w+)(?::\d+d)?}/g, (_, key) => vars[key]);
}

// Fetch and parse the Parquet file
export async function fetchParquetFile(url: string): Promise<ArrayBuffer> {
  const isLocalPath = url.startsWith('./') || url.startsWith('../') || (!url.startsWith('http'));
  const isLocalUrl = url.startsWith('/');
  
  if ((isLocalPath || isLocalUrl) && typeof window === 'undefined') {
    // Server-side: read from filesystem
    try {
      const fs = require('fs');
      const path = require('path');
      // Convert paths to absolute filesystem paths
      let filePath;
      if (isLocalUrl) {
        // /datasets/... -> ./public/datasets/...
        filePath = path.join(process.cwd(), 'public', url);
      } else {
        // ./public/datasets/... -> absolute path
        filePath = path.join(process.cwd(), url);
      }
      const fileContent = fs.readFileSync(filePath);
      return fileContent.buffer.slice(fileContent.byteOffset, fileContent.byteOffset + fileContent.byteLength);
    } catch (error) {
      throw new Error(
        `Failed to read local Parquet ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
  
  // Client-side or remote: use fetch
  const headers = isLocalUrl ? {} : getAuthHeaders();
  
  const res = await fetch(url, { headers });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  
  return res.arrayBuffer();
}

// Read specific columns from the Parquet file
export async function readParquetColumn(
  fileBuffer: ArrayBuffer,
  columns: string[],
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      parquetRead({
        file: fileBuffer,
        columns: columns.length > 0 ? columns : undefined, // Let hyparquet read all columns if empty array
        onComplete: (data: any[]) => {
          resolve(data);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Read parquet file and return objects with column names as keys
export async function readParquetAsObjects(
  fileBuffer: ArrayBuffer,
  columns: string[] = [],
): Promise<Record<string, any>[]> {
  return parquetReadObjects({
    file: fileBuffer,
    columns: columns.length > 0 ? columns : undefined,
  });
}

// Convert a 2D array to a CSV string
export function arrayToCSV(data: (number | string)[][]): string {
  return data.map((row) => row.join(",")).join("\n");
}

// Get rows from the current frame data
export function getRows(currentFrameData: any[], columns: any[]) {
  if (!currentFrameData || currentFrameData.length === 0) {
    return [];
  }

  const rows = [];
  const nRows = Math.max(...columns.map((column) => column.value.length));
  let rowIndex = 0;

  while (rowIndex < nRows) {
    const row = [];
    // number of states may NOT match number of actions. In this case, we null-pad the 2D array
    const nullCell = { isNull: true };
    // row consists of [state value, action value]
    let idx = rowIndex;

    for (const column of columns) {
      const nColumn = column.value.length;
      row.push(rowIndex < nColumn ? currentFrameData[idx] : nullCell);
      idx += nColumn; // because currentFrameData = [state0, state1, ..., stateN, action0, action1, ..., actionN]
    }

    rowIndex += 1;
    rows.push(row);
  }

  return rows;
}
