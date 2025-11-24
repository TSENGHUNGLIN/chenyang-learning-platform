// Storage helpers - supports Google Cloud Storage, Manus proxy, and local filesystem
import { Storage } from '@google-cloud/storage';
import { ENV } from './_core/env';
import fs from 'fs/promises';
import path from 'path';

type StorageConfig = { baseUrl: string; apiKey: string };

// ============================================================================
// Google Cloud Storage Configuration
// ============================================================================

let gcsStorage: Storage | null = null;
let gcsBucket: ReturnType<Storage['bucket']> | null = null;

function isGCSAvailable(): boolean {
  return !!(ENV.gcsBucketName && ENV.gcsServiceAccountKeyJson);
}

function initializeGCS() {
  if (gcsStorage) return; // Already initialized

  try {
    const credentials = JSON.parse(ENV.gcsServiceAccountKeyJson);
    gcsStorage = new Storage({
      credentials,
      projectId: credentials.project_id,
    });
    gcsBucket = gcsStorage.bucket(ENV.gcsBucketName);
    console.log('[Storage] Google Cloud Storage initialized successfully');
  } catch (error) {
    console.error('[Storage] Failed to initialize Google Cloud Storage:', error);
    throw new Error('Failed to initialize Google Cloud Storage');
  }
}

async function gcsStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!gcsBucket) {
    initializeGCS();
  }

  const key = normalizeKey(relKey);
  const file = gcsBucket!.file(key);

  try {
    // Upload file to GCS
    await file.save(data, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });

    // Generate a signed URL valid for 7 days
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(`[Storage] File uploaded to GCS: ${key}`);
    return { key, url };
  } catch (error: any) {
    console.error('[Storage] GCS upload failed:', error);
    throw new Error(`GCS upload failed: ${error.message}`);
  }
}

async function gcsStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (!gcsBucket) {
    initializeGCS();
  }

  const key = normalizeKey(relKey);
  const file = gcsBucket!.file(key);

  try {
    // Generate a signed URL valid for 7 days
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { key, url };
  } catch (error: any) {
    console.error('[Storage] GCS get URL failed:', error);
    throw new Error(`GCS get URL failed: ${error.message}`);
  }
}

// ============================================================================
// Manus Storage Configuration
// ============================================================================

function isManusStorageAvailable(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// ============================================================================
// Local Filesystem Storage Configuration
// ============================================================================

const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

async function ensureUploadDir() {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  await ensureUploadDir();
  
  const key = normalizeKey(relKey);
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  // Write file
  const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  await fs.writeFile(filePath, buffer);
  
  // Return relative URL
  const url = `/uploads/${key}`;
  
  console.log(`[Storage] File saved locally: ${key}`);
  return { key, url };
}

async function localStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const url = `/uploads/${key}`;
  
  return { key, url };
}

// ============================================================================
// Exported Functions - Auto-select storage backend
// ============================================================================

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // Priority 1: Google Cloud Storage
  if (isGCSAvailable()) {
    console.log('[Storage] Using Google Cloud Storage');
    return gcsStoragePut(relKey, data, contentType);
  }
  
  // Priority 2: Manus Storage
  if (isManusStorageAvailable()) {
    console.log('[Storage] Using Manus storage proxy');
    const { baseUrl, apiKey } = getStorageConfig();
    const key = normalizeKey(relKey);
    const uploadUrl = buildUploadUrl(baseUrl, key);
    const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: buildAuthHeaders(apiKey),
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(
        `Storage upload failed (${response.status} ${response.statusText}): ${message}`
      );
    }
    const url = (await response.json()).url;
    return { key, url };
  }
  
  // Priority 3: Local Filesystem (fallback)
  console.log('[Storage] Using local filesystem storage (fallback)');
  return localStoragePut(relKey, data, contentType);
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  // Priority 1: Google Cloud Storage
  if (isGCSAvailable()) {
    return gcsStorageGet(relKey);
  }
  
  // Priority 2: Manus Storage
  if (isManusStorageAvailable()) {
    const { baseUrl, apiKey } = getStorageConfig();
    const key = normalizeKey(relKey);
    return {
      key,
      url: await buildDownloadUrl(baseUrl, key, apiKey),
    };
  }
  
  // Priority 3: Local Filesystem (fallback)
  return localStorageGet(relKey);
}
