# Backend APIs for Personal Drive

This document lists all the APIs your Angular frontend expects from your Spring Boot backend.

## 🔐 Authentication APIs (Base URL: http://localhost)

### 1. **Login API**
- **Endpoint**: `POST /api/auth/login`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```
- **Success Response**: 
```json
{
  "success": true,
  "authenticated": true,
  "status": "success"
}
```

### 2. **Logout API**
- **Endpoint**: `POST /api/auth/logout`
- **Request Body**: `{}` (empty)
- **Success Response**: HTTP 200

### 3. **Get Current User Info API**
- **Endpoint**: `GET /api/auth/user`
- **Success Response**:
```json
{
  "success": true,
  "username": "string",
  "email": "string", 
  "bucket": "string"
}
```
- **Error Response (Not Authenticated)**:
```json
{
  "success": false,
  "message": "Not authenticated"
}
```

---

## 📂 Drive APIs (Base URL: http://localhost/api/drive)

### 1. **List Files API**
- **Endpoint**: `GET /api/drive/list?path={path}`
- **Parameters**: 
  - `path`: string (empty for root directory)
- **Response**:
```json
[
  {
    "name": "string",
    "path": "string", 
    "isDirectory": boolean,
    "size": number, // optional for files
    "lastModified": "string" // optional
  }
]
```

### 2. **Storage Usage API**
- **Endpoint**: `GET /api/drive/storage-usage`
- **Response**:
```json
{
  "bucketName": "string",
  "totalBytes": number,
  "totalMB": number,
  "totalGB": number
}
```

### 3. **Upload URL API**
- **Endpoint**: `POST /api/drive/upload-url?key={key}`
- **Parameters**:
  - `key`: string (file path/name)
- **Response**:
```json
{
  "url": "string" // pre-signed upload URL
}
```

### 4. **Download URL API**
- **Endpoint**: `GET /api/drive/download-url?key={key}`
- **Parameters**:
  - `key`: string (file path/name)
- **Response**:
```json
{
  "url": "string" // pre-signed download URL
}
```

### 5. **Delete File API**
- **Endpoint**: `DELETE /api/drive?key={key}`
- **Parameters**:
  - `key`: string (file path/name to delete)
- **Response**: HTTP 200/204

### 6. **Delete Folder API**
- **Endpoint**: `DELETE /api/drive/folder?path={path}`
- **Parameters**:
  - `path`: string (folder path to delete)
- **Response**: HTTP 200/204

---

## 🔧 Important Configuration Notes

### Session-Based Authentication
All API calls include `withCredentials: true` to support session cookies:
- Your backend should use session-based authentication
- JSESSIONID cookie will be sent with each request
- CORS must allow credentials

### Required CORS Headers
Your backend should respond with:
```
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Error Handling
- HTTP 401/403 → Frontend redirects to login
- Other errors → Display error message to user

### Frontend Environment Configuration
- Development: `http://localhost` (port 80)
- Production: Update in [environment.prod.ts](src/environments/environment.prod.ts)

---

## 📋 Frontend Models/Interfaces

The frontend defines these TypeScript interfaces that should match your backend DTOs:

```typescript
// User interface
interface User {
  username: string;
  email?: string;
}

// Login request
interface LoginRequest {
  username: string;
  password: string;
}

// File item from list API
interface FileItemDto {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: string;
}

// Pre-signed URL response
interface PresignedUrlResponse {
  url: string;
}

// Storage usage response
interface StorageUsage {
  bucketName: string;
  totalBytes: number;
  totalMB: number;
  totalGB: number;
}
```

---

## 🚀 Quick API Test

You can test these endpoints manually:

```bash
# Test login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-user","password":"your-pass"}' \
  -c cookies.txt

# Test file listing (with session)
curl -X GET http://localhost/api/drive/list?path= \
  -b cookies.txt

# Test storage usage
curl -X GET http://localhost/api/drive/storage-usage \
  -b cookies.txt
```

This is the complete API contract your Angular frontend expects from your Spring Boot backend!