import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { lookup as lookupMime } from "mime-types";
import { randomUUID } from "crypto";
import { getFirebaseStorage } from "./firebaseAdmin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBucket() {
  const storage = getFirebaseStorage();
  return storage.bucket();
}

function buildDownloadUrl(bucketName, storagePath, token) {
  const encodedPath = encodeURIComponent(storagePath);
  if (token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
  }
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
}

export async function uploadFileToFirebaseStorage(filePath, { type = "book" } = {}) {
  const bucket = getBucket();
  const folder = type === "book" ? "books" : "covers";
  const originalName = path.basename(filePath);
  const destination = `${folder}/${Date.now()}-${originalName}`;
  const downloadToken = randomUUID();
  const contentType =
    lookupMime(originalName) ||
    (type === "book" ? "application/octet-stream" : "image/jpeg");

  await bucket.upload(filePath, {
    destination,
    gzip: false,
    metadata: {
      contentType,
      cacheControl: "public,max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return {
    storagePath: destination,
    downloadUrl: buildDownloadUrl(bucket.name, destination, downloadToken),
    bucket: bucket.name,
  };
}

export async function getFirebaseSignedDownloadUrl(storagePath, expiresInSeconds = 3600) {
  if (!storagePath) {
    throw new Error("storagePath is required for signed download URL generation");
  }

  const bucket = getBucket();
  const file = bucket.file(storagePath);
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInSeconds * 1000,
  });
  return signedUrl;
}

export async function deleteFirebaseFile(storagePath) {
  if (!storagePath) return;
  try {
    const bucket = getBucket();
    await bucket.file(storagePath).delete({ ignoreNotFound: true });
  } catch (error) {
    console.warn("⚠️  Failed to delete Firebase Storage file:", error.message);
  }
}

export function buildFirebasePublicUrl(storagePath) {
  if (!storagePath) return null;
  const bucket = getBucket();
  return buildDownloadUrl(bucket.name, storagePath, null);
}

/**
 * Check if a URL is a Firebase Storage URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isFirebaseStorageUrl(url) {
  return typeof url === "string" && url.includes("firebasestorage.googleapis.com");
}

/**
 * Extract storage path from Firebase Storage URL
 * @param {string} firebaseUrl - Firebase Storage URL
 * @returns {string|null} Storage path or null if invalid
 */
export function extractFirebaseStoragePath(firebaseUrl) {
  try {
    const url = new URL(firebaseUrl);
    if (!url.pathname.startsWith("/v0/b/")) {
      return null;
    }
    // Path format: /v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
    const pathMatch = url.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)/);
    if (!pathMatch) {
      return null;
    }
    return decodeURIComponent(pathMatch[1]);
  } catch (error) {
    console.warn("⚠️  Failed to extract Firebase Storage path:", error?.message || error);
    return null;
  }
}

/**
 * Download a file from Firebase Storage as a buffer
 * @param {string} storagePath - Storage path (e.g., 'books/filename.pdf')
 * @returns {Promise<Buffer>} File buffer
 */
export async function downloadFromFirebaseStorage(storagePath) {
  try {
    const bucket = getBucket();
    const file = bucket.file(storagePath);
    const [buffer] = await file.download();
    return buffer;
  } catch (error) {
    console.error("Error downloading from Firebase Storage:", error);
    throw error;
  }
}

/**
 * Download a file from Firebase Storage URL as a buffer
 * @param {string} firebaseUrl - Firebase Storage URL
 * @returns {Promise<Buffer>} File buffer
 */
export async function downloadFromFirebaseUrl(firebaseUrl) {
  const storagePath = extractFirebaseStoragePath(firebaseUrl);
  if (!storagePath) {
    throw new Error("Invalid Firebase Storage URL");
  }
  return await downloadFromFirebaseStorage(storagePath);
}


