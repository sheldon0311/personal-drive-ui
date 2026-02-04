import { Component, signal, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { AuthService, User } from '../services/auth.service';
import { DriveService } from '../services/drive.service';
import { PhotosService } from '../services/photos.service';
import { StorageUsage, FileItemDto } from '../models/drive.models';

@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ScrollingModule],
  styleUrls: ['./drive.component.scss'],
  template: `
    <div class="drive-container">
      <!-- Header -->
      <header class="drive-header">
        <div class="header-left">
          <img src="/page_logo.png" alt="Personal Drive Logo" class="header-logo">
          <h1>
            Your Personal Drive is using
            <span class="storage-value" *ngIf="storageUsage()">{{ storageUsage()?.totalGB }} GB</span>
            <span *ngIf="!storageUsage()">calculating...</span>
            <span *ngIf="storageUsage()"> in bucket <span class="bucket-name">{{ storageUsage()?.bucketName }}</span></span>
          </h1>
        </div>
        <div class="user-info">
          <span *ngIf="currentUser()">Welcome, {{ currentUser()?.username }}</span>
          <div class="user-menu" *ngIf="currentUser()">
            <button (click)="toggleUserDropdown()" class="btn-settings" title="Settings">
              ⚙️
            </button>
            <div *ngIf="showUserDropdown()" class="user-dropdown">
              <button (click)="openUpdateProfile()" class="dropdown-item">Update Profile</button>
              <button *ngIf="currentUser()?.admin" (click)="openAssignBucketModal()" class="dropdown-item">Assign New Bucket</button>
              <button (click)="logout()" class="dropdown-item">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div class="main-layout">
        <aside class="sidebar" [class.collapsed]="isSidebarCollapsed()">
          <button class="sidebar-toggle" (click)="toggleSidebar()" [title]="isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
            <span *ngIf="!isSidebarCollapsed()">◀</span>
            <span *ngIf="isSidebarCollapsed()">▶</span>
          </button>
          <nav class="sidebar-nav">
            <button class="sidebar-btn" routerLink="/drive" routerLinkActive="active">
              <span class="sidebar-icon">🗂️</span>
              <span class="sidebar-text" *ngIf="!isSidebarCollapsed()">Drive</span>
            </button>
            <button class="sidebar-btn" routerLink="/photos" routerLinkActive="active">
              <span class="sidebar-icon">🖼️</span>
              <span class="sidebar-text" *ngIf="!isSidebarCollapsed()">Media</span>
            </button>
          </nav>
        </aside>
        <div class="content-wrapper">
          <div class="main-content">
            <div class="drive-content">
              <!-- Loading -->
              <div *ngIf="loading()" class="loading">
                Loading photos and videos...
              </div>

              <!-- Error -->
              <div *ngIf="error()" class="error">
                <span class="error-content">Error: {{ error() }}</span>
                <button (click)="dismissError()" class="btn-dismiss-error" title="Dismiss error">×</button>
              </div>

              <!-- File List Header -->
              <div class="file-list-header">
                <h3>Photos and Videos</h3>
                <div class="upload-actions">
                  <div *ngIf="selectedFiles().size > 0" class="bulk-actions">
                    <span class="selected-count">{{ selectedFiles().size }} selected</span>
                    <button (click)="downloadSelectedFiles()" class="btn-bulk-action" title="Download selected files">
                      ⬇ Download
                    </button>
                    <button (click)="confirmBulkDelete()" class="btn-bulk-delete" title="Delete selected files">
                      🗑️ Delete
                    </button>
                    <button (click)="clearSelection()" class="btn-clear-selection" title="Clear selection">
                      ✕ Clear
                    </button>
                  </div>
                  <button (click)="triggerFileSelect()" class="btn-upload-icon" title="Upload Photos/Videos">
                    Upload
                  </button>
                  <span *ngIf="uploading()" class="upload-status">{{ uploadProgress() }}</span>
                </div>
              </div>
              <input type="file" multiple accept="image/*,video/*" (change)="onFileSelect($event)" #fileInput style="display: none;">

              <!-- Photos/Videos Grid with Virtual Scroll -->
              <cdk-virtual-scroll-viewport 
                *ngIf="!loading() && photoRows().length > 0"
                [itemSize]="300"
                class="photos-viewport"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                [class.drag-over]="isDragOver()">
                <div *cdkVirtualFor="let row of photoRows()" class="photos-grid-row">
                  <div *ngFor="let photo of row; trackBy: trackByPhotoPath"
                       class="photo-tile"
                       [class.selected]="isFileSelected(photo.name)"
                       (click)="onPhotoTileClick(photo, $event)">
                    <div class="selection-overlay">
                      <input
                        type="checkbox"
                        class="file-checkbox"
                        [checked]="isFileSelected(photo.name)"
                        (click)="toggleFileSelection(photo.name, $event)"
                        (change)="$event.stopPropagation()">
                    </div>
                    <div class="photo-thumbnail">
                      <img *ngIf="isImageFile(photo.name)" [src]="getThumbnailUrl(photo)" [alt]="photo.name" class="thumbnail-img">
                      <div *ngIf="!isImageFile(photo.name)" class="photo-icon">{{ getFileIcon(photo) }}</div>
                    </div>
                    <div class="photo-name" [title]="photo.name">{{ photo.name }}</div>
                    <div class="photo-info">
                      <span class="photo-size">{{ photo.size ? formatFileSize(photo.size) : '-' }}</span>
                    </div>
                    <div class="photo-date">{{ photo.lastModified ? formatDate(photo.lastModified) : '-' }}</div>
                  </div>
                </div>
              </cdk-virtual-scroll-viewport>

              <!-- Empty State -->
              <div *ngIf="!loading() && allPhotos().length === 0" class="empty-state"
                   (dragover)="onDragOver($event)"
                   (dragleave)="onDragLeave($event)"
                   (drop)="onDrop($event)"
                   [class.drag-over]="isDragOver()">
                <div class="empty-content">
                  <p>No photos or videos found.</p>
                  <button (click)="triggerFileSelect()" class="btn-upload-large">Upload</button>
                  <p class="drag-hint">Or drag and drop files here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="drive-footer">
        <p>Email: keshavjhawar95@gmail.com</p>
      </footer>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="showDeleteConfirm()" class="modal-overlay" (click)="cancelDelete()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Confirm Deletion</h3>
          <p>Are you sure you want to delete <strong>{{ itemToDelete()?.name }}</strong>?</p>
          <div class="modal-actions">
            <button (click)="cancelDelete()" class="btn-cancel">Cancel</button>
            <button (click)="confirmDelete()" class="btn-confirm-delete">Delete</button>
          </div>
        </div>
      </div>

      <!-- Bulk Delete Confirmation Modal -->
      <div *ngIf="showBulkDeleteConfirm()" class="modal-overlay" (click)="cancelBulkDelete()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Confirm Deletion</h3>
          <p>Are you sure you want to delete <strong>{{ selectedFiles().size }} files</strong>?</p>
          <div class="modal-actions">
            <button (click)="cancelBulkDelete()" class="btn-cancel">Cancel</button>
            <button (click)="executeBulkDelete()" class="btn-confirm-delete">Delete</button>
          </div>
        </div>
      </div>

      <!-- Unsupported Format Modal -->
      <div *ngIf="showUnsupportedFormatModal()" class="modal-overlay" (click)="closeUnsupportedFormatModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Preview Not Supported</h3>
          <p>Preview for <strong>{{ unsupportedFileName() }}</strong> is not supported.</p>
          <p class="help-text">MPG file format cannot be previewed in the browser.</p>
          <div class="modal-actions">
            <button (click)="closeUnsupportedFormatModal()" class="btn-cancel">Close</button>
          </div>
        </div>
      </div>

      <!-- Image Preview Modal -->
      <div *ngIf="showImagePreview()" class="modal-overlay" (click)="closeImagePreview()">
        <button class="preview-nav-btn preview-nav-left" (click)="navigateToPreviousFile(); $event.stopPropagation()" title="Previous file">
          ‹
        </button>
        <div class="modal-content image-preview-modal" (click)="$event.stopPropagation()">
          <div class="image-preview-header">
            <h3>{{ previewImageName() }}</h3>
            <div class="header-actions">
              <button class="btn-download-header" (click)="downloadCurrentPreview()" title="Download">
                ⬇
              </button>
              <button class="btn-delete-header" (click)="deleteCurrentPreview()" title="Delete">
                🗑️
              </button>
              <button class="btn-close-preview" (click)="closeImagePreview()">×</button>
            </div>
          </div>
          <div class="image-preview-container">
            <div *ngIf="isUnsupportedInPreview()" class="unsupported-preview-message">
              <h3>Preview Not Supported</h3>
              <p>Preview for <strong>{{ previewImageName() }}</strong> is not supported.</p>
              <p class="help-text">MPG file format cannot be previewed in the browser.</p>
            </div>
            <img
              *ngIf="previewImageUrl() && !isUnsupportedInPreview()"
              [src]="previewImageUrl()"
              [alt]="previewImageName()"
              class="preview-image"
              (load)="onImageLoad()"
              (error)="onImageError()">
            <div *ngIf="imageLoading() && !isUnsupportedInPreview()" class="image-loading">Loading image...</div>
            <div *ngIf="imageError() && !isUnsupportedInPreview()" class="image-error">Failed to load image</div>
          </div>
        </div>
        <button class="preview-nav-btn preview-nav-right" (click)="navigateToNextFile(); $event.stopPropagation()" title="Next file">
          ›
        </button>
      </div>

      <!-- Video Preview Modal -->
      <div *ngIf="showVideoPreview()" class="modal-overlay" (click)="closeVideoPreview()">
        <button class="preview-nav-btn preview-nav-left" (click)="navigateToPreviousFile(); $event.stopPropagation()" title="Previous file">
          ‹
        </button>
        <div class="modal-content video-preview-modal" (click)="$event.stopPropagation()">
          <div class="video-preview-header">
            <h3>{{ previewVideoName() }}</h3>
            <div class="header-actions">
              <button class="btn-download-header" (click)="downloadCurrentVideoPreview()" title="Download">
                ⬇
              </button>
              <button class="btn-delete-header" (click)="deleteCurrentVideoPreview()" title="Delete">
                🗑️
              </button>
              <button class="btn-close-preview" (click)="closeVideoPreview()">×</button>
            </div>
          </div>
          <div class="video-preview-container">
            <video
              *ngIf="previewVideoUrl()"
              [src]="previewVideoUrl()"
              class="video-player"
              controls
              preload="metadata"
              (loadeddata)="onVideoLoad()"
              (error)="onVideoError()">
              Your browser does not support the video tag.
            </video>
            <div *ngIf="videoLoading()" class="video-loading">Loading video...</div>
            <div *ngIf="videoError()" class="video-error">Failed to load video</div>
          </div>
        </div>
        <button class="preview-nav-btn preview-nav-right" (click)="navigateToNextFile(); $event.stopPropagation()" title="Next file">
          ›
        </button>
      </div>

      <!-- Update Profile Modal -->
      <div *ngIf="showUpdateProfileModal()" class="modal-overlay" (click)="cancelUpdateProfile()">
        <div class="modal-content update-profile-modal" (click)="$event.stopPropagation()">
          <h3>Update Profile</h3>
          <form (ngSubmit)="updateProfile()" #updateProfileForm="ngForm">
            <div class="form-group">
              <label for="updateEmail">Email</label>
              <input
                type="email"
                id="updateEmail"
                name="updateEmail"
                [(ngModel)]="updateProfileData.email"
                placeholder="Enter new email"
                class="form-input"
                email
                #updateEmailInput="ngModel">
              <div *ngIf="updateEmailInput.invalid && updateEmailInput.touched" class="error-text">
                Please enter a valid email
              </div>
            </div>

            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                [(ngModel)]="updateProfileData.currentPassword"
                placeholder="Enter current password"
                class="form-input">
              <small class="help-text">Required if changing password</small>
            </div>

            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                [(ngModel)]="updateProfileData.newPassword"
                placeholder="Enter new password"
                minlength="6"
                class="form-input"
                #newPasswordInput="ngModel">
              <div *ngIf="newPasswordInput.invalid && newPasswordInput.touched" class="error-text">
                Password must be at least 6 characters
              </div>
              <small class="help-text">Leave blank to keep current password</small>
            </div>

            <div *ngIf="updateProfileError()" class="error">
              {{ updateProfileError() }}
            </div>

            <div *ngIf="updateProfileSuccess()" class="success">
              {{ updateProfileSuccess() }}
            </div>

            <div class="modal-actions">
              <button type="button" (click)="cancelUpdateProfile()" class="btn-cancel">Cancel</button>
              <button
                type="submit"
                class="btn-confirm-update"
                [disabled]="updateProfileLoading() || (!updateProfileData.email() && !updateProfileData.newPassword())">
                {{ updateProfileLoading() ? 'Updating...' : 'Update Profile' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Assign New Bucket Modal (Admin Only) -->
      <div *ngIf="showAssignBucketModal()" class="modal-overlay" (click)="cancelAssignBucket()">
        <div class="modal-content assign-bucket-modal" (click)="$event.stopPropagation()">
          <h3>Assign New Bucket</h3>
          <form (ngSubmit)="assignBucket()" #assignBucketForm="ngForm">
            <div class="form-group">
              <label for="bucketName">Bucket Name</label>
              <input
                type="text"
                id="bucketName"
                name="bucketName"
                [(ngModel)]="assignBucketData.bucketName"
                placeholder="Enter bucket name"
                class="form-input"
                required
                #bucketNameInput="ngModel">
              <div *ngIf="bucketNameInput.invalid && bucketNameInput.touched" class="error-text">
                Bucket name is required
              </div>
            </div>

            <div class="form-group">
              <label for="assignUsername">Username</label>
              <input
                type="text"
                id="assignUsername"
                name="assignUsername"
                [(ngModel)]="assignBucketData.username"
                placeholder="Enter username"
                class="form-input"
                required
                #assignUsernameInput="ngModel">
              <div *ngIf="assignUsernameInput.invalid && assignUsernameInput.touched" class="error-text">
                Username is required
              </div>
            </div>

            <div *ngIf="assignBucketError()" class="error">
              {{ assignBucketError() }}
            </div>

            <div *ngIf="assignBucketSuccess()" class="success">
              {{ assignBucketSuccess() }}
            </div>

            <div class="modal-actions">
              <button type="button" (click)="cancelAssignBucket()" class="btn-cancel">Cancel</button>
              <button
                type="submit"
                class="btn-confirm-update"
                [disabled]="assignBucketLoading() || assignBucketForm.invalid">
                {{ assignBucketLoading() ? 'Assigning...' : 'Assign Bucket' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class PhotosComponent implements OnInit, OnDestroy {
  currentUser = signal<User | null>(null);
  showUserDropdown = signal(false);
  storageUsage = signal<StorageUsage | null>(null);
  allPhotos = signal<FileItemDto[]>([]); // All photos from backend
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  // Compute rows of photos for virtual scroll (each row contains multiple photos)
  private itemsPerRow = 5; // Approximate items per row based on 200px min-width
  photoRows = signal<FileItemDto[][]>([]);
  uploading = signal<boolean>(false);
  uploadProgress = signal<string>('');
  isDragOver = signal<boolean>(false);
  showDeleteConfirm = signal<boolean>(false);
  itemToDelete = signal<FileItemDto | null>(null);
  showUpdateProfileModal = signal<boolean>(false);
  updateProfileData = {
    email: signal<string>(''),
    currentPassword: signal<string>(''),
    newPassword: signal<string>('')
  };
  updateProfileLoading = signal<boolean>(false);
  updateProfileError = signal<string | null>(null);
  updateProfileSuccess = signal<string | null>(null);

  // Admin - Assign Bucket Modal
  showAssignBucketModal = signal<boolean>(false);
  assignBucketData = {
    bucketName: signal<string>(''),
    username: signal<string>('')
  };
  assignBucketLoading = signal<boolean>(false);
  assignBucketError = signal<string | null>(null);
  assignBucketSuccess = signal<string | null>(null);

  // Image Preview Modal
  showImagePreview = signal<boolean>(false);
  previewImageUrl = signal<string | null>(null);
  previewImageName = signal<string>('');
  currentPreviewFile = signal<FileItemDto | null>(null);
  imageLoading = signal<boolean>(false);
  imageError = signal<boolean>(false);

  // Video Preview Modal
  showVideoPreview = signal<boolean>(false);
  previewVideoUrl = signal<string | null>(null);
  previewVideoName = signal<string>('');
  currentVideoPreviewFile = signal<FileItemDto | null>(null);
  videoLoading = signal<boolean>(false);
  videoError = signal<boolean>(false);

  // Multi-select
  selectedFiles = signal<Set<string>>(new Set());
  showBulkDeleteConfirm = signal<boolean>(false);

  // Unsupported format modal
  showUnsupportedFormatModal = signal<boolean>(false);
  unsupportedFileName = signal<string>('');
  isUnsupportedInPreview = signal<boolean>(false);

  // Sidebar state
  isSidebarCollapsed = signal<boolean>(false);

  constructor(
    private authService: AuthService,
    private driveService: DriveService,
    private photosService: PhotosService,
    private router: Router
  ) {
    this.loadCurrentUser();
  }

  ngOnInit() {
    this.loadStorageUsage();
    this.loadPhotos();
  }

  ngOnDestroy() {
    // Clean up all blob URLs to prevent memory leaks
    this.thumbnailCache.forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    this.thumbnailCache.clear();

    // Clean up preview URLs if any
    const previewUrl = this.previewImageUrl();
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const videoUrl = this.previewVideoUrl();
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey() {
    if (this.showImagePreview()) {
      this.closeImagePreview();
    } else if (this.showVideoPreview()) {
      this.closeVideoPreview();
    }
  }

  @HostListener('document:keydown.arrowLeft')
  handleLeftArrow() {
    if (this.showImagePreview() || this.showVideoPreview()) {
      this.navigateToPreviousFile();
    }
  }

  @HostListener('document:keydown.arrowRight')
  handleRightArrow() {
    if (this.showImagePreview() || this.showVideoPreview()) {
      this.navigateToNextFile();
    }
  }

  private loadCurrentUser() {
    this.authService.currentUser$.subscribe({
      next: (user: User | null) => {
        this.currentUser.set(user);
      },
      error: (err: any) => {
        console.error('Failed to load current user:', err);
      }
    });
  }

  loadStorageUsage() {
    this.driveService.getStorageUsage().subscribe({
      next: (usage) => {
        this.storageUsage.set(usage);
      },
      error: (err) => {
        console.error('Failed to load storage usage:', err);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  loadPhotos() {
    this.loading.set(true);
    this.error.set(null);

    // Clean up old thumbnail blob URLs before reloading
    this.thumbnailCache.forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    this.thumbnailCache.clear();

    this.photosService.listPhotos().subscribe({
      next: (files) => {
        // Sort files by lastModified in descending order (newest first)
        const sortedFiles = files.sort((a, b) => {
          const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
          const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
          return dateB - dateA;
        });

        // Store all photos
        this.allPhotos.set(sortedFiles);
        
        // Create rows for virtual scroll
        const rows: FileItemDto[][] = [];
        for (let i = 0; i < sortedFiles.length; i += this.itemsPerRow) {
          rows.push(sortedFiles.slice(i, i + this.itemsPerRow));
        }
        this.photoRows.set(rows);
        
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading photos:', err);
        this.error.set('Failed to load photos: ' + err.message);
        this.loading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  triggerFileSelect() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles(input.files);
    }
  }

  uploadFiles(files: FileList) {
    const fileArray = Array.from(files);
    let uploadedCount = 0;
    let failedCount = 0;
    const totalFiles = fileArray.length;

    this.uploading.set(true);
    this.error.set(null);

    fileArray.forEach((file, index) => {
      this.photosService.fetchCsrfTokenFromBackend().subscribe({
        next: (csrfResponse: any) => {
          const csrfToken = csrfResponse.token || csrfResponse.csrfToken || csrfResponse._csrf || csrfResponse;
          const key = file.name;

          this.photosService.getUploadUrl(key, csrfToken).subscribe({
            next: (response) => {
              this.photosService.uploadFileWithPresignedUrl(file, response.url).subscribe({
                next: () => {
                  uploadedCount++;
                  this.uploadProgress.set(`Uploaded ${uploadedCount}/${totalFiles} files`);

                  if (uploadedCount + failedCount === totalFiles) {
                    this.uploading.set(false);
                    this.uploadProgress.set('');
                    this.loadPhotos();
                  }
                },
                error: (err) => {
                  console.error('Upload failed for', file.name, err);
                  failedCount++;
                  this.error.set(`Upload failed for ${file.name}`);
                  if (uploadedCount + failedCount === totalFiles) {
                    this.uploading.set(false);
                    this.uploadProgress.set('');
                  }
                }
              });
            },
            error: (err) => {
              console.error('Failed to get upload URL:', err);
              failedCount++;

              // Handle 400 error with invalid file type
              if (err.status === 400 && err.error) {
                const errorBody = err.error;
                if (errorBody.error === 'Invalid file type') {
                  const supportedExts = errorBody.supportedExtensions?.join(', ') || 'images and videos';
                  this.error.set(`${file.name}: ${errorBody.message || 'Invalid file type'}. Supported: ${supportedExts}`);
                } else {
                  this.error.set(`Failed to upload ${file.name}: ${errorBody.message || err.message}`);
                }
              } else {
                this.error.set(`Failed to get upload URL for ${file.name}`);
              }

              if (uploadedCount + failedCount === totalFiles) {
                this.uploading.set(false);
                this.uploadProgress.set('');
              }
            }
          });
        }
      });
    });
  }

  downloadPhoto(photo: FileItemDto) {
    this.photosService.getDownloadUrl(photo.name).subscribe({
      next: (response) => {
        fetch(response.url)
          .then(response => response.blob())
          .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = photo.name;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
          })
          .catch(error => {
            console.error('Download failed:', error);
            this.error.set('Download failed: ' + error.message);
          });
      },
      error: (err) => {
        this.error.set('Download failed: ' + err.message);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  deletePhoto(photo: FileItemDto) {
    this.itemToDelete.set(photo);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete() {
    const item = this.itemToDelete();
    if (!item) return;

    this.photosService.deletePhoto(item.name).subscribe({
      next: () => {
        this.showDeleteConfirm.set(false);
        this.itemToDelete.set(null);
        this.loadPhotos();
      },
      error: (err) => {
        this.error.set('Delete failed: ' + err.message);
        this.showDeleteConfirm.set(false);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.itemToDelete.set(null);
  }

  dismissError() {
    this.error.set(null);
  }

  getFileIcon(file: FileItemDto): string {
    const fileName = file.name.toLowerCase();
    if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return '🖼️';
    if (fileName.match(/\.(mp4|avi|mov|wmv|flv|webm|mpg)$/)) return '🎥';
    return '📄';
  }

  getFileType(fileName: string): string {
    const name = fileName.toLowerCase();
    if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return 'Image';
    if (name.match(/\.(mp4|avi|mov|wmv|flv|webm|mpg)$/)) return 'Video';
    return 'File';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowerFileName = fileName.toLowerCase();
    return imageExtensions.some(ext => lowerFileName.endsWith(ext));
  }

  trackByPhotoPath(index: number, photo: FileItemDto): string {
    return photo.path;
  }

  getThumbnailUrl(photo: FileItemDto): string {
    // For now, return empty string. We'll need to fetch the download URL to display the image
    // This will be loaded asynchronously
    this.loadThumbnail(photo);
    return this.thumbnailCache.get(photo.name) || '';
  }

  private thumbnailCache = new Map<string, string>();

  private loadThumbnail(photo: FileItemDto) {
    if (this.thumbnailCache.has(photo.name)) {
      return;
    }

    // Set a placeholder to prevent multiple requests
    this.thumbnailCache.set(photo.name, '');

    this.photosService.getDownloadUrl(photo.name).subscribe({
      next: (response) => {
        fetch(response.url)
          .then(res => res.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            this.thumbnailCache.set(photo.name, url);
            // Trigger change detection by updating the photoRows signal
            this.photoRows.set([...this.photoRows()]);
          });
      },
      error: (err) => {
        console.error('Failed to load thumbnail for', photo.name, err);
      }
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadFiles(files);
    }
  }

  toggleUserDropdown() {
    this.showUserDropdown.set(!this.showUserDropdown());
  }

  toggleSidebar() {
    this.isSidebarCollapsed.set(!this.isSidebarCollapsed());
  }

  openUpdateProfile() {
    this.showUserDropdown.set(false);
    this.showUpdateProfileModal.set(true);
    this.updateProfileError.set(null);
    this.updateProfileSuccess.set(null);
    // Pre-fill with current email if available
    if (this.currentUser()?.email) {
      this.updateProfileData.email.set(this.currentUser()!.email || '');
    }
  }

  cancelUpdateProfile() {
    this.showUpdateProfileModal.set(false);
    this.updateProfileData.email.set('');
    this.updateProfileData.currentPassword.set('');
    this.updateProfileData.newPassword.set('');
    this.updateProfileError.set(null);
    this.updateProfileSuccess.set(null);
  }

  openAssignBucketModal() {
    this.showUserDropdown.set(false);
    this.showAssignBucketModal.set(true);
    this.assignBucketError.set(null);
    this.assignBucketSuccess.set(null);
    this.assignBucketData.bucketName.set('');
    this.assignBucketData.username.set('');
  }

  cancelAssignBucket() {
    this.showAssignBucketModal.set(false);
    this.assignBucketData.bucketName.set('');
    this.assignBucketData.username.set('');
    this.assignBucketError.set(null);
    this.assignBucketSuccess.set(null);
  }

  assignBucket() {
    const bucketName = this.assignBucketData.bucketName().trim();
    const username = this.assignBucketData.username().trim();

    if (!bucketName || !username) {
      this.assignBucketError.set('Both bucket name and username are required');
      return;
    }

    this.assignBucketLoading.set(true);
    this.assignBucketError.set(null);
    this.assignBucketSuccess.set(null);

    this.authService.assignNewBucket(bucketName, username).subscribe({
      next: (response) => {
        this.assignBucketLoading.set(false);
        this.assignBucketSuccess.set(response.message || 'Bucket created and assigned successfully');
        // Clear form after success
        setTimeout(() => {
          this.cancelAssignBucket();
        }, 2000);
      },
      error: (err) => {
        this.assignBucketLoading.set(false);
        const errorMessage = err.error?.message || err.message || 'Failed to assign bucket';
        this.assignBucketError.set(errorMessage);
      }
    });
  }

  updateProfile() {
    const email = this.updateProfileData.email().trim();
    const currentPassword = this.updateProfileData.currentPassword().trim();
    const newPassword = this.updateProfileData.newPassword().trim();

    // Validation
    if (!email && !newPassword) {
      this.updateProfileError.set('Please provide at least one field to update');
      return;
    }

    if (newPassword && !currentPassword) {
      this.updateProfileError.set('Current password is required to change password');
      return;
    }

    this.updateProfileLoading.set(true);
    this.updateProfileError.set(null);
    this.updateProfileSuccess.set(null);

    const updateData: any = {};

    if (email && email !== this.currentUser()?.email) {
      updateData.email = email;
    }

    if (newPassword) {
      updateData.currentPassword = currentPassword;
      updateData.newPassword = newPassword;
    }

    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.updateProfileLoading.set(false);
        this.updateProfileSuccess.set(response.message || 'Profile updated successfully!');

        // Update current user data
        if (response.email) {
          this.authService.setCurrentUser({
            username: response.username,
            email: response.email,
            admin: this.currentUser()?.admin
          });
          this.currentUser.set({
            username: response.username,
            email: response.email
          });
        }

        // Close modal after 2 seconds
        setTimeout(() => {
          this.cancelUpdateProfile();
        }, 2000);
      },
      error: (err) => {
        this.updateProfileLoading.set(false);
        console.error('Update profile error:', err);

        if (err.error?.message) {
          this.updateProfileError.set(err.error.message);
        } else {
          this.updateProfileError.set('Failed to update profile. Please try again.');
        }
      }
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        console.error('Logout failed:', err);
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Preview a file (image or video)
   */
  previewFile(photo: FileItemDto) {
    // Check if file is .mpg
    if (photo.name.toLowerCase().endsWith('.mpg')) {
      // Show unsupported message within the preview modal
      this.showImagePreview.set(true);
      this.previewImageName.set(photo.name);
      this.currentPreviewFile.set(photo);
      this.isUnsupportedInPreview.set(true);
      this.previewImageUrl.set(null);
      this.imageLoading.set(false);
      this.imageError.set(false);
    }
    else if (this.isVideoFile(photo.name)) {
      this.previewVideo(photo);
    }
    else if(this.isImageFile(photo.name)) {
      this.previewImage(photo);
    }
  }

  /**
   * Navigate to the previous file in the list
   */
  navigateToPreviousFile() {
    const currentFile = this.currentPreviewFile() || this.currentVideoPreviewFile();
    if (!currentFile) return;

    const currentIndex = this.allPhotos().findIndex(p => p.name === currentFile.name);
    if (currentIndex <= 0) return; // Already at the first file

    // Revoke old preview URLs before loading new ones
    this.revokeCurrentPreviewUrls();

    const previousFile = this.allPhotos()[currentIndex - 1];
    this.previewFile(previousFile);
  }

  /**
   * Navigate to the next file in the list
   */
  navigateToNextFile() {
    const currentFile = this.currentPreviewFile() || this.currentVideoPreviewFile();
    if (!currentFile) return;

    const currentIndex = this.allPhotos().findIndex(p => p.name === currentFile.name);
    if (currentIndex >= this.allPhotos().length - 1) return; // Already at the last file

    // Revoke old preview URLs before loading new ones
    this.revokeCurrentPreviewUrls();

    const nextFile = this.allPhotos()[currentIndex + 1];
    this.previewFile(nextFile);
  }

  /**
   * Revoke current preview blob URLs to free memory
   */
  private revokeCurrentPreviewUrls() {
    const imageUrl = this.previewImageUrl();
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }

    const videoUrl = this.previewVideoUrl();
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
  }

  /**
   * Check if file is a video
   */
  isVideoFile(fileName: string): boolean {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.mpg'];
    const lowerFileName = fileName.toLowerCase();
    return videoExtensions.some(ext => lowerFileName.endsWith(ext));
  }

  /**
   * Preview an image file
   */
  previewImage(photo: FileItemDto) {
    if (!this.isImageFile(photo.name)) {
      return;
    }

    // Close video preview if open
    if (this.showVideoPreview()) {
      this.showVideoPreview.set(false);
    }

    this.showImagePreview.set(true);
    this.previewImageName.set(photo.name);
    this.currentPreviewFile.set(photo);
    this.imageLoading.set(true);
    this.imageError.set(false);
    this.previewImageUrl.set(null);
    this.isUnsupportedInPreview.set(false);

    // Get download URL for the image
    this.photosService.getDownloadUrl(photo.name).subscribe({
      next: (response) => {
        this.previewImageUrl.set(response.url);
      },
      error: (error) => {
        console.error('Error getting image preview URL:', error);
        this.imageError.set(true);
        this.imageLoading.set(false);
      }
    });
  }

  /**
   * Close image preview modal
   */
  closeImagePreview() {
    // Revoke blob URL if it exists
    const previewUrl = this.previewImageUrl();
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    this.showImagePreview.set(false);
    this.previewImageUrl.set(null);
    this.previewImageName.set('');
    this.currentPreviewFile.set(null);
    this.imageLoading.set(false);
    this.imageError.set(false);
    this.isUnsupportedInPreview.set(false);
  }

  /**
   * Handle successful image load
   */
  onImageLoad() {
    this.imageLoading.set(false);
    this.imageError.set(false);
  }

  /**
   * Handle image load error
   */
  onImageError() {
    this.imageLoading.set(false);
    this.imageError.set(true);
  }

  /**
   * Download the currently previewed image
   */
  downloadCurrentPreview() {
    const file = this.currentPreviewFile();
    if (file) {
      this.downloadPhoto(file);
    }
  }

  /**
   * Delete the currently previewed image
   */
  deleteCurrentPreview() {
    const file = this.currentPreviewFile();
    if (file) {
      this.closeImagePreview();
      this.deletePhoto(file);
    }
  }

  /**
   * Preview a video file
   */
  previewVideo(photo: FileItemDto) {
    if (!this.isVideoFile(photo.name)) {
      return;
    }

    // Close image preview if open
    if (this.showImagePreview()) {
      this.showImagePreview.set(false);
    }

    // Set new video info FIRST (before resetting state)
    // This ensures navigation reads the correct current file
    this.currentVideoPreviewFile.set(photo);
    this.previewVideoName.set(photo.name);

    // Reset video preview state
    this.previewVideoUrl.set(null);
    this.videoLoading.set(true);
    this.videoError.set(false);
    this.isUnsupportedInPreview.set(false);
    this.showVideoPreview.set(true);

    // Get download URL for the video
    this.photosService.getDownloadUrl(photo.name).subscribe({
      next: (response) => {
        this.previewVideoUrl.set(response.url);
        this.videoLoading.set(false);
      },
      error: (error) => {
        console.error('Error getting video preview URL:', error);
        this.videoError.set(true);
        this.videoLoading.set(false);
      }
    });
  }

  /**
   * Close video preview modal
   */
  closeVideoPreview() {
    // Revoke blob URL if it exists
    const videoUrl = this.previewVideoUrl();
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }

    this.showVideoPreview.set(false);
    this.previewVideoUrl.set(null);
    this.previewVideoName.set('');
    this.currentVideoPreviewFile.set(null);
    this.videoLoading.set(false);
    this.videoError.set(false);
  }

  /**
   * Handle successful video load
   */
  onVideoLoad() {
    this.videoLoading.set(false);
    this.videoError.set(false);
  }

  /**
   * Handle video load error
   */
  onVideoError() {
    this.videoLoading.set(false);
    this.videoError.set(true);
  }

  /**
   * Download the currently previewed video
   */
  downloadCurrentVideoPreview() {
    const file = this.currentVideoPreviewFile();
    if (file) {
      this.downloadPhoto(file);
    }
  }

  /**
   * Delete the currently previewed video
   */
  deleteCurrentVideoPreview() {
    const file = this.currentVideoPreviewFile();
    if (file) {
      this.closeVideoPreview();
      this.deletePhoto(file);
    }
  }

  /**
   * Close unsupported format modal
   */
  closeUnsupportedFormatModal() {
    this.showUnsupportedFormatModal.set(false);
    this.unsupportedFileName.set('');
  }

  /**
   * Check if a file is selected
   */
  isFileSelected(fileName: string): boolean {
    return this.selectedFiles().has(fileName);
  }

  /**
   * Toggle file selection
   */
  toggleFileSelection(fileName: string, event: Event) {
    event.stopPropagation();
    const selected = new Set(this.selectedFiles());
    if (selected.has(fileName)) {
      selected.delete(fileName);
    } else {
      selected.add(fileName);
    }
    this.selectedFiles.set(selected);
  }

  /**
   * Handle photo tile click - preview if not selecting, otherwise toggle selection
   */
  onPhotoTileClick(photo: FileItemDto, event: MouseEvent) {
    // If clicking on checkbox, don't preview
    if ((event.target as HTMLElement).closest('.file-checkbox, .selection-overlay')) {
      return;
    }
    this.previewFile(photo);
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedFiles.set(new Set());
  }

  /**
   * Show bulk delete confirmation
   */
  confirmBulkDelete() {
    if (this.selectedFiles().size === 0) return;
    this.showBulkDeleteConfirm.set(true);
  }

  /**
   * Cancel bulk delete
   */
  cancelBulkDelete() {
    this.showBulkDeleteConfirm.set(false);
  }

  /**
   * Execute bulk delete
   */
  executeBulkDelete() {
    const filesToDelete = Array.from(this.selectedFiles());
    let deletedCount = 0;
    let failedCount = 0;

    filesToDelete.forEach(fileName => {
      this.photosService.deletePhoto(fileName).subscribe({
        next: () => {
          deletedCount++;
          if (deletedCount + failedCount === filesToDelete.length) {
            this.showBulkDeleteConfirm.set(false);
            this.clearSelection();
            this.loadPhotos();
            if (failedCount > 0) {
              this.error.set(`Deleted ${deletedCount} files, ${failedCount} failed`);
            }
          }
        },
        error: (err) => {
          failedCount++;
          console.error(`Failed to delete ${fileName}:`, err);
          if (deletedCount + failedCount === filesToDelete.length) {
            this.showBulkDeleteConfirm.set(false);
            this.clearSelection();
            this.loadPhotos();
            this.error.set(`Deleted ${deletedCount} files, ${failedCount} failed`);
          }
        }
      });
    });
  }

  /**
   * Download selected files
   */
  downloadSelectedFiles() {
    if (this.selectedFiles().size === 0) return;

    const fileNames = Array.from(this.selectedFiles());
    this.photosService.downloadMultipleFiles(fileNames).subscribe({
      next: (blob) => {
        // Download the blob directly
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `photos_${Date.now()}.zip`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        this.clearSelection();
      },
      error: (err) => {
        console.error('Failed to download files:', err);
        this.error.set('Failed to download files: ' + err.message);
      }
    });
  }
}
