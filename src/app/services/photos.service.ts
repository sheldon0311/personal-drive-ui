import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { FileItemDto, PresignedUrlResponse } from '../models/drive.models';

@Injectable({
  providedIn: 'root'
})
export class PhotosService {
  private readonly apiUrl = `${environment.apiUrl}/api/photos`;

  constructor(private http: HttpClient) {}

  /**
   * Get CSRF token from backend API
   */
  fetchCsrfTokenFromBackend(): Observable<any> {
    console.log('Fetching CSRF token from backend...');
    return this.http.get(`${environment.apiUrl}/csrf`, {
      withCredentials: true
    });
  }

  /**
   * List all photos and videos
   */
  listPhotos(): Observable<FileItemDto[]> {
    return this.http.get<FileItemDto[]>(`${this.apiUrl}/list`, {
      withCredentials: true
    });
  }

  /**
   * Generate a pre-signed URL for photo/video upload
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
   * Generate a pre-signed URL for photo/video download
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
   * Delete a photo/video
   * @param key File path/name to delete
   */
  deletePhoto(key: string): Observable<void> {
    const params = new HttpParams().set('key', key);
    console.log('Fetching fresh CSRF token before deleting photo:', key);

    // First get fresh CSRF token from API, then proceed with deletion
    return this.fetchCsrfTokenFromBackend().pipe(
      switchMap((csrfResponse: any) => {
        console.log('CSRF response for photo deletion:', csrfResponse);
        const csrfToken = csrfResponse.token || csrfResponse.csrfToken || csrfResponse._csrf || csrfResponse;
        const headers: any = {};

        if (csrfToken && typeof csrfToken === 'string') {
          headers['X-XSRF-TOKEN'] = csrfToken;
          console.log('Using fresh CSRF token for photo deletion:', csrfToken);
        } else {
          console.error('No valid CSRF token found in API response:', csrfResponse);
        }

        console.log('Making delete request for photo:', key);
        return this.http.delete<void>(`${this.apiUrl}`, {
          params,
          withCredentials: true,
          headers
        });
      })
    );
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
   * Download multiple files as a zip
   * @param fileNames Array of file names to download
   */
  downloadMultipleFiles(fileNames: string[]): Observable<Blob> {
    console.log('Requesting download for multiple files:', fileNames);
    return this.http.post(`${this.apiUrl}/download-files`, {
      fileNames: fileNames
    }, {
      withCredentials: true,
      responseType: 'blob'
    });
  }
}
