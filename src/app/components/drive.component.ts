import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DriveService } from '../services/drive.service';
import { AuthService, User } from '../services/auth.service';
import { FileItemDto, StorageUsage } from '../models/drive.models';

@Component({
  selector: 'app-drive',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
        <!-- Main Drive Content -->
        <main class="drive-content">
        <!-- Loading -->
        <div *ngIf="loading()" class="loading">
          Loading files...
        </div>

        <!-- Error -->
        <div *ngIf="error()" class="error">
          <span class="error-content">Error: {{ error() }}</span>
          <button (click)="dismissError()" class="btn-dismiss-error" title="Dismiss error">×</button>
        </div>

        <!-- File List -->
        <div *ngIf="!loading()" class="file-list"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)"
             [class.drag-over]="isDragOver()">
          <div class="file-list-header">
            <div class="header-title">
              <h3>Files and Folders<span *ngIf="getDisplayPath()" class="path-display"> (Current Path: <button (click)="navigateHome()" class="btn-home" title="Go to Home">🏠</button>/{{ getDisplayPath() }})</span></h3>
              <button *ngIf="currentPath()" (click)="navigateUp()" class="btn-back">← Back</button>
            </div>
            <div class="upload-actions">
              <button (click)="triggerFileSelect()" class="btn-upload-icon" title="Upload Files">
                Upload files
              </button>
              <button (click)="createFolder()" class="btn-create-folder" title="Create Folder">
                Create folder
              </button>
              <span *ngIf="uploading()" class="upload-status">{{ uploadProgress() }}</span>
            </div>
          </div>
          <input type="file" multiple (change)="onFileSelect($event)" #fileInput style="display: none;">

          <!-- Table section - only show when files exist -->
          <div *ngIf="files().length > 0">
            <table>
              <thead>
                <tr>
                  <th>
                    <div class="name-header-container">
                      <span>Name</span>
                      <div class="search-filter-inline">
                        <input
                          type="text"
                          placeholder="Search..."
                          [(ngModel)]="searchTerm"
                          class="search-input-inline"
                          (input)="onSearchChange($event)">
                        <span class="search-icon-inline">🔍</span>
                      </div>
                    </div>
                  </th>
                  <th>Type</th>
                  <th>Size</th>
                  <th class="sortable-header">
                    Modified Date
                    <button
                      (click)="toggleDateSort()"
                      class="sort-toggle"
                      [title]="getSortTooltip()">
                      {{ getSortArrow() }}
                    </button>
                  </th>
                  <th class="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let file of paginatedFiles()">
                  <td>
                    <span class="file-icon">{{ getFileIcon(file) }}</span><span
                      (click)="isFolder(file) ? navigateToFolder(file.name) : null"
                      [class.clickable]="isFolder(file)">
                      {{ getDisplayName(file.name) }}</span>
                    <button
                      *ngIf="isImageFile(file.name)"
                      (click)="previewImage(file)"
                      class="btn-preview-inline"
                      title="Preview {{ file.name }}">
                      P
                    </button>
                    <button
                      *ngIf="isPdfFile(file.name)"
                      (click)="previewPdf(file)"
                      class="btn-pdf-preview-inline"
                      title="Preview PDF {{ file.name }}">
                      📄
                    </button>
                    <button
                      *ngIf="isVideoFile(file.name)"
                      (click)="previewVideo(file)"
                      class="btn-video-preview-inline"
                      title="Preview Video {{ file.name }}">
                      🎥
                    </button>
                  </td>
                  <td>{{ isFolder(file) ? 'Folder' : 'File' }}</td>
                  <td>{{ file.size ? formatFileSize(file.size) : '-' }}</td>
                  <td>{{ file.lastModified ? formatDate(file.lastModified) : '-' }}</td>
                  <td class="actions-column">
                    <div class="actions-container">
                      <button
                        *ngIf="!isFolder(file)"
                        (click)="downloadFile(file)"
                        class="btn-download">
                        Download
                      </button>
                      <button
                        *ngIf="isFolder(file)"
                        (click)="downloadFolder(file)"
                        class="btn-download">
                        Download
                      </button>
                      <button
                        (click)="deleteItem(file)"
                        class="btn-delete btn-delete-right">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Pagination Controls -->
            <div *ngIf="totalPages() > 1" class="pagination-container">
              <div class="pagination-info">
                Page {{ currentPage() }} of {{ totalPages() }} ({{ filteredFiles().length }} items)
              </div>
              <div class="pagination-controls">
                <button
                  (click)="goToPage(1)"
                  [disabled]="currentPage() === 1"
                  class="btn-pagination">
                  First
                </button>
                <button
                  (click)="goToPage(currentPage() - 1)"
                  [disabled]="currentPage() === 1"
                  class="btn-pagination">
                  ← Previous
                </button>

                <span class="page-numbers">
                  <button
                    *ngFor="let page of getPageNumbers()"
                    (click)="goToPage(page)"
                    [class.active]="page === currentPage()"
                    class="btn-page-number">
                    {{ page }}
                  </button>
                </span>

                <button
                  (click)="goToPage(currentPage() + 1)"
                  [disabled]="currentPage() === totalPages()"
                  class="btn-pagination">
                  Next →
                </button>
                <button
                  (click)="goToPage(totalPages())"
                  [disabled]="currentPage() === totalPages()"
                  class="btn-pagination">
                  Last
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading() && files().length === 0" class="empty-state"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)"
             [class.drag-over]="isDragOver()">
          <div class="empty-content">
            <p>No files or folders found in this directory.</p>
            <div class="empty-actions">
              <button (click)="triggerFileSelect()" class="btn-upload-large">Upload files</button>
              <button (click)="createFolder()" class="btn-create-folder-large">Create folder</button>
            </div>
            <p class="drag-hint">Or drag and drop files here</p>
          </div>
          <input type="file" multiple (change)="onFileSelect($event)" #fileInputEmpty style="display: none;">
        </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="showDeleteConfirm()" class="modal-overlay" (click)="cancelDelete()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Confirm Deletion</h3>
          <p>Are you sure you want to delete <strong>{{ itemToDelete()?.name }}</strong>?</p>
          <p *ngIf="isFolder(itemToDelete()!)" class="warning-text">This will delete the folder and all its contents.</p>
          <div class="modal-actions">
            <button (click)="cancelDelete()" class="btn-cancel">Cancel</button>
            <button (click)="confirmDelete()" class="btn-confirm-delete">Delete</button>
          </div>
        </div>
      </div>

      <!-- Create Folder Modal -->
      <div *ngIf="showCreateFolderModal()" class="modal-overlay" (click)="cancelCreateFolder()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Create New Folder</h3>
          <p>Enter a name for the new folder:</p>
          <input
            type="text"
            [(ngModel)]="newFolderName"
            placeholder="Folder name"
            class="folder-name-input"
            (keyup.enter)="confirmCreateFolder()"
            (keyup.escape)="cancelCreateFolder()"
            #folderNameInput
          />
          <div class="modal-actions">
            <button (click)="cancelCreateFolder()" class="btn-cancel">Cancel</button>
            <button (click)="confirmCreateFolder()" class="btn-confirm-create" [disabled]="!newFolderName().trim()">Create</button>
          </div>
        </div>
      </div>

      <!-- Video Preview Modal -->
      <div *ngIf="showVideoPreview()" class="modal-overlay" (click)="closeVideoPreview()">
        <div class="modal-content video-preview-modal" (click)="$event.stopPropagation()">
          <div class="video-preview-header">
            <h3>{{ previewVideoName() }}</h3>
            <div class="header-actions">
              <button class="btn-download-header" (click)="downloadCurrentVideoPreview()" title="Download">
                ⬇
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
      </div>

      <!-- PDF Preview Modal -->
      <div *ngIf="showPdfPreview()" class="modal-overlay" (click)="closePdfPreview()">
        <div class="modal-content pdf-preview-modal" (click)="$event.stopPropagation()">
          <div class="pdf-preview-header">
            <h3>{{ previewPdfName() }}</h3>
            <div class="header-actions">
              <button class="btn-download-header" (click)="downloadCurrentPdfPreview()" title="Download">
                ⬇
              </button>
              <button class="btn-close-preview" (click)="closePdfPreview()">×</button>
            </div>
          </div>

          <!-- Password Input for Locked PDFs -->
          <div *ngIf="pdfPasswordRequired()" class="pdf-password-container">
            <div class="password-input-section">
              <h4>🔒 This PDF is password protected</h4>
              <div class="form-group">
                <input
                  type="password"
                  [(ngModel)]="pdfPassword"
                  placeholder="Enter PDF password"
                  class="form-input"
                  (keyup.enter)="loadPdfWithPassword()">
              </div>
              <div class="password-actions">
                <button class="btn-confirm-create" (click)="loadPdfWithPassword()" [disabled]="!pdfPassword().trim()">
                  Unlock PDF
                </button>
                <button class="btn-cancel" (click)="closePdfPreview()">Cancel</button>
              </div>
              <div *ngIf="pdfPasswordError()" class="error">{{ pdfPasswordError() }}</div>
            </div>
          </div>

          <!-- PDF Viewer -->
          <div *ngIf="!pdfPasswordRequired()" class="pdf-preview-container">
            <iframe
              *ngIf="previewPdfUrl()"
              [src]="previewPdfUrl()"
              class="pdf-viewer"
              frameborder="0"
              (load)="onPdfLoad()"
              (error)="onPdfError()">
            </iframe>
            <div *ngIf="pdfLoading()" class="pdf-loading">Loading PDF...</div>
            <div *ngIf="pdfError()" class="pdf-error">Failed to load PDF</div>
          </div>
        </div>
      </div>

      <!-- Image Preview Modal -->
      <div *ngIf="showImagePreview()" class="modal-overlay" (click)="closeImagePreview()">
        <div class="modal-content image-preview-modal" (click)="$event.stopPropagation()">
          <div class="image-preview-header">
            <h3>{{ previewImageName() }}</h3>
            <div class="header-actions">
              <button class="btn-download-header" (click)="downloadCurrentPreview()" title="Download">
                ⬇
              </button>
              <button class="btn-close-preview" (click)="closeImagePreview()">×</button>
            </div>
          </div>
          <div class="image-preview-container">
            <img
              *ngIf="previewImageUrl()"
              [src]="previewImageUrl()"
              [alt]="previewImageName()"
              class="preview-image"
              (load)="onImageLoad()"
              (error)="onImageError()">
            <div *ngIf="imageLoading()" class="image-loading">Loading image...</div>
            <div *ngIf="imageError()" class="image-error">Failed to load image</div>
          </div>
        </div>
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

        </main>
      </div>
      </div>
      </div>

      <!-- Footer -->
      <footer class="drive-footer">
        <p>Email: keshavjhawar95@gmail.com</p>
      </footer>

    </div>


  `
})
export class DriveComponent implements OnInit {
  files = signal<FileItemDto[]>([]);
  searchTerm = signal<string>('');
  filteredFiles = signal<FileItemDto[]>([]);
  paginatedFiles = signal<FileItemDto[]>([]);
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(20);
  totalPages = signal<number>(1);
  dateSort = signal<'none' | 'asc' | 'desc'>('none');
  storageUsage = signal<StorageUsage | null>(null);
  currentPath = signal<string>('');
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedFiles = signal<FileList | null>(null);
  uploading = signal<boolean>(false);
  uploadProgress = signal<string>('');
  isDragOver = signal<boolean>(false);
  currentUser = signal<User | null>(null);
  showDeleteConfirm = signal<boolean>(false);
  itemToDelete = signal<FileItemDto | null>(null);
  showCreateFolderModal = signal<boolean>(false);
  newFolderName = signal<string>('');
  showUserDropdown = signal<boolean>(false);
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
  currentPreviewFile = signal<any>(null);
  imageLoading = signal<boolean>(false);
  imageError = signal<boolean>(false);

  // PDF Preview Modal
  showPdfPreview = signal<boolean>(false);
  previewPdfUrl = signal<SafeResourceUrl | null>(null);
  previewPdfName = signal<string>('');
  currentPdfPreviewFile = signal<any>(null);
  pdfLoading = signal<boolean>(false);
  pdfError = signal<boolean>(false);
  pdfPasswordRequired = signal<boolean>(false);
  pdfPassword = signal<string>('');
  pdfPasswordError = signal<string | null>(null);

  // Video Preview Modal
  showVideoPreview = signal<boolean>(false);
  previewVideoUrl = signal<string | null>(null);
  previewVideoName = signal<string>('');
  currentVideoPreviewFile = signal<any>(null);
  videoLoading = signal<boolean>(false);
  videoError = signal<boolean>(false);

  // Sidebar state
  isSidebarCollapsed = signal<boolean>(false);



  constructor(
    private driveService: DriveService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.currentUser.set(this.authService.currentUserValue);
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event) {
    // Close image preview modal if open
    if (this.showImagePreview()) {
      this.closeImagePreview();
      event.preventDefault();
    }
    // Close PDF preview modal if open
    else if (this.showPdfPreview()) {
      this.closePdfPreview();
      event.preventDefault();
    }
    // Close video preview modal if open
    else if (this.showVideoPreview()) {
      this.closeVideoPreview();
      event.preventDefault();
    }
  }

  ngOnInit() {
    // First validate session, then load data
    this.authService.validateSession().subscribe({
      next: (isValid) => {
        if (isValid) {
          this.currentUser.set(this.authService.currentUserValue);
          this.loadFiles();
          this.loadStorageUsage();
        } else {
          console.log('Session invalid, redirecting to login');
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        console.log('Session validation failed, redirecting to login');
        this.router.navigate(['/login']);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      if (!event.target || !(event.target as Element).closest('.user-menu')) {
        this.showUserDropdown.set(false);
      }
    });

    // Initialize filtered files
    this.updateFilteredFiles();
  }

  onSearchChange(event: any) {
    const value = event.target.value || '';
    this.searchTerm.set(value);
    this.updateFilteredFiles();
  }

  toggleDateSort() {
    if (this.dateSort() === 'none') {
      this.dateSort.set('asc');
    } else if (this.dateSort() === 'asc') {
      this.dateSort.set('desc');
    } else {
      this.dateSort.set('none');
    }
    this.updateFilteredFiles();
  }

  getSortArrow(): string {
    switch (this.dateSort()) {
      case 'asc': return '▲';
      case 'desc': return '▼';
      default: return '↕'; // Up-down arrow for no sort
    }
  }

  getSortTooltip(): string {
    switch (this.dateSort()) {
      case 'asc': return 'Click to sort descending';
      case 'desc': return 'Click to clear sorting';
      default: return 'Click to sort ascending';
    }
  }

  updateFilteredFiles() {
    const search = this.searchTerm().toLowerCase().trim();
    let filtered: FileItemDto[];

    if (!search) {
      filtered = this.files();
    } else {
      filtered = this.files().filter(file =>
        this.getDisplayName(file.name).toLowerCase().includes(search)
      );
    }

    // Sort the filtered files
    const sorted = this.sortFiles(filtered);
    this.filteredFiles.set(sorted);

    // Reset to first page when filter changes
    this.currentPage.set(1);
    this.updatePagination();
  }

  sortFiles(files: FileItemDto[]): FileItemDto[] {
    return files.sort((a, b) => {
      const dateSort = this.dateSort();

      // If date sorting is active, sort all items by date only
      if (dateSort === 'asc' || dateSort === 'desc') {
        const aDate = a.lastModified ? new Date(a.lastModified).getTime() : 0;
        const bDate = b.lastModified ? new Date(b.lastModified).getTime() : 0;
        return dateSort === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // Default sorting: Folders first, then files by date desc
      const aIsFolder = this.isFolder(a);
      const bIsFolder = this.isFolder(b);

      // Folders come first
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      // If both are folders, sort alphabetically by name
      if (aIsFolder && bIsFolder) {
        const aName = this.getDisplayName(a.name).toLowerCase();
        const bName = this.getDisplayName(b.name).toLowerCase();
        return aName.localeCompare(bName);
      }

      // If both are files, sort by modified date descending (newest first)
      const aDate = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const bDate = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return bDate - aDate; // Descending order
    });
  }

  updatePagination() {
    const totalItems = this.filteredFiles().length;
    const itemsPerPage = this.itemsPerPage();
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    this.totalPages.set(Math.max(1, totalPages));

    // Ensure current page is valid
    if (this.currentPage() > totalPages) {
      this.currentPage.set(Math.max(1, totalPages));
    }

    // Calculate paginated files
    const startIndex = (this.currentPage() - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = this.filteredFiles().slice(startIndex, endIndex);

    this.paginatedFiles.set(paginated);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const currentPage = this.currentPage();
    const totalPages = this.totalPages();
    const pages: number[] = [];

    // Show up to 5 page numbers centered around current page
    const maxPages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    const endPage = Math.min(totalPages, startPage + maxPages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.setCurrentUser(null);
        this.router.navigate(['/login']);
      },
      error: () => {
        // Even if logout fails, clear local state and redirect
        this.authService.setCurrentUser(null);
        this.router.navigate(['/login']);
      }
    });
  }

  loadFiles() {
    this.loading.set(true);
    // Preserve duplicate file errors during reload
    const currentError = this.error();
    const preserveError = currentError && currentError.includes('Files with the same name already exist');

    if (!preserveError) {
      this.error.set(null);
    }

    console.log(`=== LOAD FILES DEBUG ===`);
    console.log(`Loading files for path: "${this.currentPath()}"`);

    this.driveService.listFiles(this.currentPath()).subscribe({
      next: (files) => {
        console.log(`Backend returned ${files.length} items:`);
        files.forEach((file, index) => {
          console.log(`  ${index}: name="${file.name}", isDirectory=${file.isDirectory || file.folder}`);
        });
        console.log(`=== END LOAD FILES DEBUG ===`);

        // Sort files before setting them
        const sortedFiles = this.sortFiles(files);
        this.files.set(sortedFiles);
        this.updateFilteredFiles(); // Update filtered files when new files are loaded
        this.loading.set(false);
      },
      error: (err) => {
        console.error(`Error loading files:`, err);
        this.error.set('Failed to load files: ' + err.message);
        this.loading.set(false);

        // If unauthorized, redirect to login
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
        }
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

  navigateToFolder(folderName: string) {
    console.log(`=== NAVIGATE TO FOLDER DEBUG ===`);
    console.log(`Input folderName: "${folderName}"`);
    console.log(`Current path before navigation: "${this.currentPath()}"`);

    // Extract just the folder name if it contains a full path
    const actualFolderName = folderName.includes('/') ? folderName.split('/').pop() || folderName : folderName;
    console.log(`Extracted actualFolderName: "${actualFolderName}"`);

    // Remove trailing slashes
    const cleanFolderName = actualFolderName.replace(/\/$/, '');
    console.log(`Clean folderName: "${cleanFolderName}"`);

    const newPath = this.buildFilePath(cleanFolderName);
    console.log(`Built new path: "${newPath}"`);
    console.log(`=== END DEBUG ===`);

    this.currentPath.set(newPath);
    this.loadFiles();
  }

  navigateUp() {
    const currentPathValue = this.currentPath().trim();
    if (!currentPathValue) {
      return; // Already at root
    }

    // Split by '/' and remove the last part
    const pathParts = currentPathValue.split('/').filter(part => part.length > 0);
    pathParts.pop();

    const newPath = pathParts.join('/');
    console.log(`Navigating up from "${currentPathValue}" to "${newPath}"`);
    this.currentPath.set(newPath);
    this.loadFiles();
  }

  navigateHome() {
    console.log(`Navigating to home from "${this.currentPath()}"`);
    this.currentPath.set('');
    this.loadFiles();
  }

  /**
   * Helper method to safely concatenate paths without double slashes
   */
  private buildFilePath(fileName: string): string {
    const currentPath = this.currentPath().trim();
    if (!currentPath) {
      return fileName;
    }

    // Remove trailing slashes from current path and leading slashes from filename
    const cleanPath = currentPath.replace(/\/$/, '');
    const cleanFileName = fileName.replace(/^\//, '');

    return `${cleanPath}/${cleanFileName}`;
  }

  /**
   * Extract just the display name from a file/folder path
   */
  getDisplayName(name: string): string {
    if (!name) return name;

    // Remove trailing slashes and extract last part of path
    const cleanName = name.replace(/\/$/, '');
    const parts = cleanName.split('/');
    const displayName = parts[parts.length - 1] || name;

    // Trim any whitespace
    return displayName.trim();
  }

  /**
   * Get clean display path for current location
   */
  getDisplayPath(): string {
    const path = this.currentPath().trim();
    if (!path) return '';

    // Clean up the path by removing extra slashes and empty parts
    return path.split('/').filter(part => part.length > 0).join('/');
  }

  /**
   * Check if a file is an image based on its extension
   */
  isImageFile(fileName: string): boolean {
    if (!fileName) return false;

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.heic', '.avif'];
    const extension = fileName.toLowerCase().split('.').pop();

    return extension ? imageExtensions.includes('.' + extension) : false;
  }

  /**
   * Check if a file is an Excel file based on its extension
   */
  isExcelFile(fileName: string): boolean {
    if (!fileName) return false;

    const excelExtensions = ['.xls', '.xlsx', '.xlsm', '.xlsb', '.xlt', '.xltx', '.xltm', '.csv', '.ods', '.xml'];
    const extension = fileName.toLowerCase().split('.').pop();

    return extension ? excelExtensions.includes('.' + extension) : false;
  }

  /**
   * Check if a file is a PDF based on its extension
   */
  isPdfFile(fileName: string): boolean {
    if (!fileName) return false;

    const extension = fileName.toLowerCase().split('.').pop();
    return extension === 'pdf';
  }

  /**
   * Check if a file is a video based on its extension
   */
  isVideoFile(fileName: string): boolean {
    if (!fileName) return false;

    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ogv', '.ts', '.mts'];
    const extension = fileName.toLowerCase().split('.').pop();

    return extension ? videoExtensions.includes('.' + extension) : false;
  }

  /**
   * Get the appropriate icon for a file or folder
   */
  getFileIcon(file: any): string {
    if (this.isFolder(file)) {
      return '📁';
    } else if (this.isImageFile(file.name)) {
      return '🖼️';
    } else if (this.isExcelFile(file.name)) {
      return '📊';
    } else if (this.isPdfFile(file.name)) {
      return '📕';
    } else if (this.isVideoFile(file.name)) {
      return '🎬';
    } else {
      return '📄';
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFiles.set(input.files);
      this.uploadFiles();
    }
  }

  createFolder() {
    console.log('createFolder() method called');
    this.newFolderName.set('');
    this.showCreateFolderModal.set(true);
    console.log('Modal should be visible:', this.showCreateFolderModal());
    // Focus the input after modal is shown
    setTimeout(() => {
      const input = document.querySelector('.folder-name-input') as HTMLInputElement;
      if (input) {
        input.focus();
        console.log('Input focused');
      } else {
        console.log('Input element not found');
      }
    }, 100);
  }

  cancelCreateFolder() {
    this.showCreateFolderModal.set(false);
    this.newFolderName.set('');
    this.error.set(null); // Clear any previous errors
  }

  confirmCreateFolder() {
    const folderName = this.newFolderName().trim();
    if (!folderName) {
      return;
    }

    // Validate folder name (basic validation)
    if (folderName.includes('/') || folderName.includes('\\')) {
      this.error.set('Folder name cannot contain slashes');
      return;
    }

    this.driveService.createFolder(this.currentPath(), folderName).subscribe({
      next: () => {
        console.log('Folder created successfully:', folderName);
        this.loadFiles(); // Refresh the file list
        this.loadStorageUsage(); // Update storage usage
        this.cancelCreateFolder(); // Close the modal
      },
      error: (err) => {
        console.error('Failed to create folder:', err);
        this.error.set('Failed to create folder: ' + (err.message || 'Unknown error'));
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
      this.selectedFiles.set(files);
      this.uploadFiles();
    }
  }

  uploadFiles() {
    const fileList = this.selectedFiles();
    if (!fileList || fileList.length === 0) return;

    // Check authentication before uploading
    if (!this.authService.currentUserValue) {
      this.error.set('Please log in to upload files.');
      this.router.navigate(['/login']);
      return;
    }

    this.uploading.set(true);
    this.error.set(null);

    const files = Array.from(fileList);
    const existingFileNames = this.files().map(file => this.getDisplayName(file.name).toLowerCase());
    const duplicateFiles: string[] = [];
    const validFiles: File[] = [];

    // Check for duplicate file names
    files.forEach(file => {
      if (existingFileNames.includes(file.name.toLowerCase())) {
        duplicateFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    // Show error for duplicate files
    if (duplicateFiles.length > 0) {
      const errorMsg = `Files with the same name already exist: ${duplicateFiles.join(', ')}`;
      if (validFiles.length === 0) {
        this.error.set(errorMsg + '. No files uploaded.');
        this.uploading.set(false);
        this.selectedFiles.set(null);
        return;
      } else {
        this.error.set(errorMsg + `. Continuing with ${validFiles.length} remaining files.`);
      }
    }

    // If no valid files to upload, stop here
    if (validFiles.length === 0) {
      this.uploading.set(false);
      this.selectedFiles.set(null);
      return;
    }

    this.uploadProgress.set('Getting CSRF token...');
    console.log('Starting upload for files:', validFiles.map(f => f.name));

    // First get CSRF token, then proceed with uploads
    this.driveService.fetchCsrfTokenFromBackend().subscribe({
      next: (csrfResponse: any) => {
        console.log('CSRF token response:', csrfResponse);
        const csrfToken = csrfResponse.token || csrfResponse.csrfToken || csrfResponse._csrf;

        if (!csrfToken) {
          this.error.set('Failed to get CSRF token');
          this.uploading.set(false);
          return;
        }

        this.uploadFilesWithToken(validFiles, csrfToken);
      },
      error: (err: any) => {
        console.error('Failed to get CSRF token:', err);
        this.error.set('Failed to get CSRF token: ' + (err.message || 'Unknown error'));
        this.uploading.set(false);
      }
    });
  }

  private uploadFilesWithToken(files: File[], csrfToken: string) {
    let completedUploads = 0;
    let failedUploads = 0;

    this.uploadProgress.set(`Uploading 0/${files.length} files...`);

    files.forEach((file, index) => {
      const key = this.buildFilePath(file.name);
      console.log(`Getting upload URL for file: ${file.name}, key: ${key}`);

      this.driveService.getUploadUrl(key, csrfToken).subscribe({
        next: (response) => {
          console.log(`Got upload URL for ${file.name}:`, response);
          this.driveService.uploadFileWithPresignedUrl(file, response.url).subscribe({
            next: () => {
              completedUploads++;
              console.log(`Successfully uploaded: ${file.name}`);
              this.uploadProgress.set(`Uploading ${completedUploads}/${files.length} files...`);

              if (completedUploads + failedUploads === files.length) {
                this.finishUpload(completedUploads, failedUploads);
              }
            },
            error: (err) => {
              failedUploads++;
              console.error(`Upload to presigned URL failed for ${file.name}:`, err);
              this.error.set(`Upload to storage failed for ${file.name}: ${err.status} ${err.message || 'Unknown error'}`);

              if (completedUploads + failedUploads === files.length) {
                this.finishUpload(completedUploads, failedUploads);
              }
            }
          });
        },
        error: (err) => {
          failedUploads++;
          console.error(`Failed to get upload URL for ${file.name}:`, err);

          if (err.status === 401 || err.status === 403) {
            this.error.set(`Authentication failed for ${file.name}. Please check your login status.`);
            this.router.navigate(['/login']);
            return;
          }

          this.error.set(`Failed to get upload URL for ${file.name}: ${err.status} ${err.message || 'Unknown error'}`);

          if (completedUploads + failedUploads === files.length) {
            this.finishUpload(completedUploads, failedUploads);
          }
        }
      });
    });
  }

  private finishUpload(completed: number, failed: number) {
    this.uploading.set(false);
    this.selectedFiles.set(null);
    this.uploadProgress.set('');

    // Get current error message (might include duplicate file info)
    const currentError = this.error();
    let finalErrorMessage = null;

    if (failed > 0) {
      const newErrorMsg = `${completed} files uploaded successfully, ${failed} failed`;
      if (currentError && currentError.includes('Files with the same name already exist')) {
        // Append upload failure info to existing duplicate files error
        finalErrorMessage = currentError + ` Additionally: ${newErrorMsg}`;
      } else {
        finalErrorMessage = newErrorMsg;
      }
    } else if (completed > 0 && currentError && currentError.includes('Files with the same name already exist')) {
      // Success for valid files, but keep the duplicate file warning
      finalErrorMessage = currentError + ` Successfully uploaded ${completed} files.`;
    }

    // Set the final error message
    if (finalErrorMessage) {
      this.error.set(finalErrorMessage);
    } else if (completed > 0) {
      // Clear any previous errors if all went well
      this.error.set(null);
    }

    // Delay the file list reload to ensure error messages are visible
    setTimeout(() => {
      this.loadFiles();
      this.loadStorageUsage();
    }, 100);

    // Reset file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
    fileInputs.forEach(input => input.value = '');
  }

  downloadFile(file: FileItemDto) {
    const key = this.buildFilePath(file.name);

    this.driveService.getDownloadUrl(key).subscribe({
      next: (response) => {
        // Fetch the file as a blob to ensure download behavior
        fetch(response.url)
          .then(response => response.blob())
          .then(blob => {
            // Create blob URL
            const blobUrl = window.URL.createObjectURL(blob);

            // Create temporary anchor element to trigger download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = file.name; // Set filename for download
            link.style.display = 'none';

            // Add to DOM temporarily
            document.body.appendChild(link);

            // Trigger download
            link.click();

            // Clean up
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

  downloadFolder(file: FileItemDto) {
    const folderPath = this.buildFilePath(file.name);

    this.driveService.downloadFolder(folderPath).subscribe({
      next: (response: Blob) => {
        // Create blob URL
        const blobUrl = window.URL.createObjectURL(response);

        // Create temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${file.name}.zip`; // Set filename for download with .zip extension
        link.style.display = 'none';

        // Add to DOM temporarily
        document.body.appendChild(link);

        // Trigger download
        link.click();

        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      },
      error: (err) => {
        this.error.set('Folder download failed: ' + err.message);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  deleteItem(file: FileItemDto) {
    this.itemToDelete.set(file);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.itemToDelete.set(null);
  }

  confirmDelete() {
    const file = this.itemToDelete();
    if (!file) return;

    const key = this.buildFilePath(file.name);

    const deleteObs = this.isFolder(file)
      ? this.driveService.deleteFolder(key)
      : this.driveService.deleteFile(key);

    deleteObs.subscribe({
      next: () => {
        this.loadFiles();
        this.loadStorageUsage();
        this.cancelDelete(); // Close the modal
      },
      error: (err) => {
        this.error.set('Delete failed: ' + err.message);
        this.cancelDelete(); // Close the modal
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return '-';

      // Format to "dd MMM, yyyy hh:mm a" format
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const time = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return `${day} ${month}, ${year} ${time}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  }

  // Helper method to check if item is a folder
  // Handles both 'folder' property from backend API and 'isDirectory' fallback
  isFolder(file: FileItemDto): boolean {
    return file.folder === true || file.isDirectory === true;
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

  dismissError() {
    this.error.set(null);
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

  /**
   * Preview an image file
   */
  previewImage(file: any) {
    if (!this.isImageFile(file.name)) {
      return;
    }

    this.showImagePreview.set(true);
    this.previewImageName.set(file.name);
    this.currentPreviewFile.set(file);
    this.imageLoading.set(true);
    this.imageError.set(false);
    this.previewImageUrl.set(null);

    // Build the correct key using the same method as downloadFile
    const key = this.buildFilePath(file.name);

    // Get download URL for the image
    this.driveService.getDownloadUrl(key).subscribe({
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
    this.showImagePreview.set(false);
    this.previewImageUrl.set(null);
    this.previewImageName.set('');
    this.currentPreviewFile.set(null);
    this.imageLoading.set(false);
    this.imageError.set(false);
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
      this.downloadFile(file);
    }
  }

  /**
   * Preview a PDF file
   */
  previewPdf(file: any) {
    if (!this.isPdfFile(file.name)) {
      return;
    }

    this.showPdfPreview.set(true);
    this.previewPdfName.set(file.name);
    this.currentPdfPreviewFile.set(file);
    this.pdfLoading.set(true);
    this.pdfError.set(false);
    this.pdfPasswordRequired.set(false);
    this.previewPdfUrl.set(null);
    this.pdfPassword.set('');
    this.pdfPasswordError.set(null);

    // Build the correct key using the same method as downloadFile
    const key = this.buildFilePath(file.name);

    // Get download URL for the PDF
    this.driveService.getDownloadUrl(key).subscribe({
      next: (response) => {
        const sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.url);
        this.previewPdfUrl.set(sanitizedUrl);
        this.pdfLoading.set(false);
      },
      error: (error) => {
        console.error('Error getting PDF preview URL:', error);
        if (error.status === 401 && error.error?.message?.includes('password')) {
          this.pdfPasswordRequired.set(true);
          this.pdfLoading.set(false);
        } else {
          this.pdfError.set(true);
          this.pdfLoading.set(false);
        }
      }
    });
  }

  /**
   * Load PDF with password
   */
  loadPdfWithPassword() {
    if (!this.pdfPassword().trim()) {
      return;
    }

    this.pdfLoading.set(true);
    this.pdfPasswordError.set(null);

    const file = this.currentPdfPreviewFile();
    if (!file) return;

    const key = this.buildFilePath(file.name);

    // You'll need to implement password-protected PDF handling in your backend
    // For now, this is a placeholder for the API call with password
    this.driveService.getDownloadUrl(key).subscribe({
      next: (response) => {
        const sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.url);
        this.previewPdfUrl.set(sanitizedUrl);
        this.pdfPasswordRequired.set(false);
        this.pdfLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading PDF with password:', error);
        this.pdfPasswordError.set('Invalid password or PDF error');
        this.pdfLoading.set(false);
      }
    });
  }

  /**
   * Close PDF preview modal
   */
  closePdfPreview() {
    this.showPdfPreview.set(false);
    this.previewPdfUrl.set(null);
    this.previewPdfName.set('');
    this.currentPdfPreviewFile.set(null);
    this.pdfLoading.set(false);
    this.pdfError.set(false);
    this.pdfPasswordRequired.set(false);
    this.pdfPassword.set('');
    this.pdfPasswordError.set(null);
  }

  /**
   * Handle successful PDF load
   */
  onPdfLoad() {
    this.pdfLoading.set(false);
    this.pdfError.set(false);
  }

  /**
   * Handle PDF load error
   */
  onPdfError() {
    this.pdfLoading.set(false);
    this.pdfError.set(true);
  }

  /**
   * Download the currently previewed PDF
   */
  downloadCurrentPdfPreview() {
    const file = this.currentPdfPreviewFile();
    if (file) {
      this.downloadFile(file);
    }
  }

  /**
   * Preview a video file
   */
  previewVideo(file: any) {
    if (!this.isVideoFile(file.name)) {
      return;
    }

    this.showVideoPreview.set(true);
    this.previewVideoName.set(file.name);
    this.currentVideoPreviewFile.set(file);
    this.videoLoading.set(true);
    this.videoError.set(false);
    this.previewVideoUrl.set(null);

    // Build the correct key using the same method as downloadFile
    const key = this.buildFilePath(file.name);

    // Get download URL for the video
    this.driveService.getDownloadUrl(key).subscribe({
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
      this.downloadFile(file);
    }
  }


}
