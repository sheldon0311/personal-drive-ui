# Personal Drive UI - Backend Integration Guide

This guide explains how your Angular frontend is connected to the Keshav Personal Drive backend API.

## 🔗 API Integration Overview

### Backend Information
- **Backend Location:** `/Users/kjhawar/gitWorkspace/Keshav Personal Drive/`
- **Technology:** Spring Boot Java Application (Java 21)
- **Default Port:** 8080
- **Base API URL:** `http://localhost:8080/api/drive`

### Frontend Configuration

#### Environment Files
- **Development:** [src/environments/environment.ts](src/environments/environment.ts)
- **Production:** [src/environments/environment.prod.ts](src/environments/environment.prod.ts)

Both files contain the `apiUrl` configuration pointing to your backend.

#### Services Created
1. **[DriveService](src/app/services/drive.service.ts)** - Main service for file operations
2. **[AuthService](src/app/services/auth.service.ts)** - Authentication service for Spring Security

#### Models
- **[Drive Models](src/app/models/drive.models.ts)** - TypeScript interfaces matching your backend DTOs

## 🚀 Getting Started

### 1. Start the Backend
```bash
cd "/Users/kjhawar/gitWorkspace/Keshav Personal Drive"
mvn spring-boot:run
```

### 2. Start the Frontend
```bash
cd /Users/kjhawar/gitWorkspace/personal-drive-ui
npm start
# or
ng serve
```

### 3. Access the Application
Open your browser and navigate to:
- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:8080/api/drive

## 📋 Available API Endpoints

The DriveService provides methods for all backend endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `listFiles()` | GET `/api/drive/list` | List files and folders |
| `getUploadUrl()` | POST `/api/drive/upload-url` | Get pre-signed upload URL |
| `getDownloadUrl()` | GET `/api/drive/download-url` | Get pre-signed download URL |
| `deleteFile()` | DELETE `/api/drive` | Delete a file |
| `deleteFolder()` | DELETE `/api/drive/folder` | Delete a folder |
| `getStorageUsage()` | GET `/api/drive/storage-usage` | Get storage statistics |

## 🎯 Features Implemented

### DriveComponent
A full-featured file management component with:
- ✅ File and folder listing
- ✅ Navigation between directories  
- ✅ File upload with progress
- ✅ File download via pre-signed URLs
- ✅ Delete files and folders
- ✅ Storage usage display
- ✅ Error handling and loading states

### Usage Example
```typescript
// Inject the service
constructor(private driveService: DriveService) {}

// List files in root directory
this.driveService.listFiles('').subscribe(files => {
  console.log('Files:', files);
});

// Upload a file
this.driveService.getUploadUrl('myfile.pdf').subscribe(response => {
  // Use presigned URL to upload
  this.driveService.uploadFileWithPresignedUrl(file, response.url).subscribe();
});

// Get storage usage
this.driveService.getStorageUsage().subscribe(usage => {
  console.log('Storage used:', usage.totalGB + ' GB');
});
```

## 🔐 Authentication Notes

Your backend uses Spring Security with session-based authentication. The AuthService is configured to:
- Handle login/logout
- Manage CSRF tokens
- Work with session cookies (`withCredentials: true`)

## 🛠️ CORS Configuration (if needed)

If you encounter CORS issues, add this to your backend application.properties:
```properties
# CORS configuration
management.endpoints.web.cors.allow-credentials=true
management.endpoints.web.cors.allowed-origins=http://localhost:4200
management.endpoints.web.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
management.endpoints.web.cors.allowed-headers=*
```

## 📁 Project Structure

```
src/app/
├── components/
│   └── drive.component.ts         # Main file management component
├── models/
│   └── drive.models.ts           # TypeScript interfaces
├── services/
│   ├── drive.service.ts          # API communication service
│   └── auth.service.ts           # Authentication service
├── environments/
│   ├── environment.ts            # Development config
│   └── environment.prod.ts       # Production config
└── app.routes.ts                 # Routing configuration
```

## 🔧 Customization

### Changing API URL
Update the `apiUrl` in environment files:
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://your-production-api.com'
};
```

### Adding New Features
1. Add new methods to `DriveService`
2. Update models if new DTOs are needed
3. Implement UI components using the service

Your frontend is now fully connected to your Keshav Personal Drive backend! 🎉