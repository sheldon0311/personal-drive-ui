export interface FileItemDto {
  name: string;
  path: string;
  isDirectory: boolean;
  folder?: boolean;  // Backend API uses 'folder' property
  size?: number;
  lastModified?: string;
}

export interface PresignedUrlResponse {
  url: string;
}

export interface StorageUsage {
  bucketName: string;
  totalBytes: number;
  totalMB: number;
  totalGB: number;
}