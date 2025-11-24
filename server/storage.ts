// Storage helpers - supports both Manus proxy and local filesystem
import { ENV } from './_core/env';
import fs from 'fs/promises';
import path from 'path';

type StorageConfig = { baseUrl: string; apiKey: string };

// Check if we're using Manus storage proxy
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

// Local filesystem storage functions
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
  
  return { key, url };
}

async function localStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const url = `/uploads/${key}`;
  
  return { key, url };
}

// Exported functions that choose between Manus and local storage
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // Use local storage if Manus storage is not available
  if (!isManusStorageAvailable()) {
    console.log('[Storage] Using local filesystem storage');
    return localStoragePut(relKey, data, contentType);
  }
  
  // Use Manus storage proxy
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

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  // Use local storage if Manus storage is not available
  if (!isManusStorageAvailable()) {
    return localStorageGet(relKey);
  }
  
  // Use Manus storage proxy
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
