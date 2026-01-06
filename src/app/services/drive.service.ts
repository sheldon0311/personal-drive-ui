import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { FileItemDto, PresignedUrlResponse, StorageUsage } from '../models/drive.models';

@Injectable({
  providedIn: 'root'
})
export class DriveService {
  private readonly apiUrl = `${environment.apiUrl}/api/drive`;

  constructor(private http: HttpClient) {}

  /**
   * Helper method to safely build file paths without double slashes
   * @param parentPath Parent directory path
   * @param fileName File or folder name to append
   */
  private buildPath(parentPath: string, fileName: string): string {
    if (!parentPath || parentPath.trim() === '') {
      return fileName;
    }
    
    // Remove trailing slashes from parent path and leading slashes from filename
    const cleanParentPath = parentPath.replace(/\/$/, '');
    const cleanFileName = fileName.replace(/^\//, '');
    
    return `${cleanParentPath}/${cleanFileName}`;
  }

  /**
   * List files and folders in the specified path
   * @param path Directory path to list (empty string for root)
   */
  listFiles(path: string = ''): Observable<FileItemDto[]> {
    const params = new HttpParams().set('path', path);
    return this.http.get<FileItemDto[]>(`${this.apiUrl}/list`, { 
      params,
      withCredentials: true 
    });
  }

  /**
   * Get CSRF token from backend API
   */
  fetchCsrfTokenFromBackend(): Observable<any> {
    console.log('Fetching CSRF token from backend...');
    return this.http.get(`${environment.apiUrl}/csrf`, {
      withCredentials: true
    }).pipe(
      map((response: any) => {
        console.log('CSRF token response received:', response);
        return response;
      }),
      catchError((error) => {
        console.error('CSRF token request failed:', error);
        throw error;
      })
    );
  }

  /**
   * Create a new folder
   * @param parentPath Parent directory path
   * @param folderName Name of the folder to create
   */
  createFolder(parentPath: string, folderName: string): Observable<void> {
    const fullPath = this.buildPath(parentPath, folderName);
    const params = new HttpParams().set('path', fullPath);
    console.log('Fetching fresh CSRF token before creating folder:', fullPath);
    
    // First get fresh CSRF token from API, then proceed with folder creation
    return this.fetchCsrfTokenFromBackend().pipe(
      switchMap((csrfResponse: any) => {
        console.log('CSRF response for folder creation:', csrfResponse);
        const csrfToken = csrfResponse.token || csrfResponse.csrfToken || csrfResponse._csrf || csrfResponse;
        const headers: any = {};
        
        if (csrfToken && typeof csrfToken === 'string') {
          headers['X-XSRF-TOKEN'] = csrfToken;
          console.log('Using fresh CSRF token for folder creation:', csrfToken);
        } else {
          console.error('No valid CSRF token found in API response:', csrfResponse);
        }
        
        console.log('Making create folder request at path:', fullPath);
        return this.http.post<void>(`${this.apiUrl}/folder`, {}, {
          params,
          withCredentials: true,
          headers
        });
      })
    );
  }

  /**
   * Generate a pre-signed URL for file upload
   * @param key File path/name for upload
   * @param csrfToken CSRF token obtained from fetchCsrfTokenFromBackend()
   */
  getUploadUrl(key: string, csrfToken?: string): Observable<PresignedUrlResponse> {
    const params = new HttpParams().set('key', key);
    console.log('Requesting upload URL for key:', key);
    
    const headers: any = {};
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
      console.log('Using provided CSRF token for upload URL');
    }
    
    return this.http.post<PresignedUrlResponse>(`${this.apiUrl}/upload-url`, {}, { 
      params,
      withCredentials: true,
      headers
    });
  }

  /**
   * Generate a pre-signed URL for file download
   * @param key File path/name for download
   */
  getDownloadUrl(key: string): Observable<PresignedUrlResponse> {
    const params = new HttpParams().set('key', key);
    return this.http.get<PresignedUrlResponse>(`${this.apiUrl}/download-url`, { 
      params,
      withCredentials: true 
    });
  }

  /**
   * Delete a file
   * @param key File path/name to delete
   */
  deleteFile(key: string): Observable<void> {
    const params = new HttpParams().set('key', key);
    console.log('Fetching fresh CSRF token before deleting file:', key);
    
    // First get fresh CSRF token from API, then proceed with deletion
    return this.fetchCsrfTokenFromBackend().pipe(
      switchMap((csrfResponse: any) => {
        console.log('CSRF response for file deletion:', csrfResponse);
        const csrfToken = csrfResponse.token || csrfResponse.csrfToken || csrfResponse._csrf || csrfResponse;
        const headers: any = {};
        
        if (csrfToken && typeof csrfToken === 'string') {
          headers['X-XSRF-TOKEN'] = csrfToken;
          console.log('Using fresh CSRF token for file deletion:', csrfToken);
        } else {
          console.error('No valid CSRF token found in API response:', csrfResponse);
        }
        
        console.log('Making delete request for file:', key);
        return this.http.delete<void>(`${this.apiUrl}`, { 
          params,
          withCredentials: true,
          headers
        });
      })
    );
  }

  /**
   * Delete a folder and all its contents
   * @param path Folder path to delete
   */
  deleteFolder(path: string): Observable<void> {
    const params = new HttpParams().set('path', path);
    console.log('Fetching fresh CSRF token before deleting folder:', path);
    
    // First get fresh CSRF token from API, then proceed with deletion
    return this.fetchCsrfTokenFromBackend().pipe(
      switchMap((csrfResponse: any) => {
        console.log('CSRF response for folder deletion:', csrfResponse);
        const csrfToken = csrfResponse.token || csrfResponse.csrfToken || csrfResponse._csrf || csrfResponse;
        const headers: any = {};
        
        if (csrfToken && typeof csrfToken === 'string') {
          headers['X-XSRF-TOKEN'] = csrfToken;
          console.log('Using fresh CSRF token for folder deletion:', csrfToken);
        } else {
          console.error('No valid CSRF token found in API response:', csrfResponse);
        }
        
        console.log('Making delete request for folder:', path);
        return this.http.delete<void>(`${this.apiUrl}/folder`, { 
          params,
          withCredentials: true,
          headers
        });
      })
    );
  }

  /**
   * Get storage usage statistics
   */
  getStorageUsage(): Observable<StorageUsage> {
    return this.http.get<StorageUsage>(`${this.apiUrl}/storage-usage`, {
      withCredentials: true
    });
  }

  /**
   * Upload a file using pre-signed URL
   * @param file File to upload
   * @param presignedUrl Pre-signed URL obtained from getUploadUrl
   */
  uploadFileWithPresignedUrl(file: File, presignedUrl: string): Observable<any> {
    console.log('Uploading file to presigned URL:', presignedUrl);
    return this.http.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type
      },
      reportProgress: false,
      observe: 'response'
    });
  }

  /**
   * Get CSRF token from cookies - try multiple possible names
   */
  private getCsrfToken(): string | null {
    console.log('All cookies:', document.cookie);
    
    // Try different cookie names that Spring Security might use
    const cookieNames = ['XSRF-TOKEN', 'CSRF-TOKEN', 'X-CSRF-TOKEN'];
    
    for (const cookieName of cookieNames) {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${cookieName}=`));
      
      if (cookieValue) {
        const token = decodeURIComponent(cookieValue.split('=')[1]);
        console.log(`Found CSRF token in cookie ${cookieName}:`, token);
        return token;
      } else {
        console.log(`No ${cookieName} cookie found`);
      }
    }
    
    console.log('No CSRF token found in any expected cookie names');
    return null;
  }
}