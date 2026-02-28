import { defineDriver, normalizeKey } from "unstorage";
import { S3Client } from "bun";

export interface S3DriverOptions {
  /**
   * Access Key ID for S3.
   */
  accessKeyId: string;

  /**
   * Secret Access Key for S3.
   */
  secretAccessKey: string;

  /**
   * The endpoint URL of the S3 service.
   *
   * - For AWS S3: "https://s3.[region].amazonaws.com"
   * - For Cloudflare R2: "https://[uid].r2.cloudflarestorage.com"
   * - For DigitalOcean Spaces: "https://[region].digitaloceanspaces.com"
   * - For MinIO: "http://localhost:9000"
   */
  endpoint?: string;

  /**
   * The region of the S3 bucket.
   */
  region?: string;

  /**
   * The name of the bucket.
   */
  bucket: string;

  /**
   * Optional prefix to use for all keys.
   */
  base?: string;

  /**
   * Session token for temporary credentials.
   */
  sessionToken?: string;

  /**
   * ACL for uploaded objects (e.g., "public-read").
   */
  acl?: string;
}

export default defineDriver((options: S3DriverOptions) => {
  const client = new S3Client({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    bucket: options.bucket,
    endpoint: options.endpoint,
    region: options.region,
    sessionToken: options.sessionToken,
    acl: options.acl,
  });

  const base = (options.base || "").replace(/\/$/, "");
  const p = (key: string) => (base ? `${base}/${normalizeKey(key)}` : normalizeKey(key));

  return {
    name: "s3",
    options,
    async hasItem(key: string) {
      const file = client.file(p(key));
      try {
        await file.exists();
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key: string) {
      const file = client.file(p(key));
      try {
        return await file.text();
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string) {
      const file = client.file(p(key));
      await file.write(value);
    },
    async removeItem(key: string) {
      const file = client.file(p(key));
      await file.delete();
    },
    async getKeys() {
      // Bun S3Client doesn't have built-in list operation
      // This is a limitation - users may need to implement list operation
      // or use a different approach for their use case
      console.warn(
        "[s3 driver] getKeys() is not fully implemented. " +
          "Bun's S3Client doesn't support listing objects. " +
          "Consider using AWS SDK or implementing custom list logic.",
      );
      return [];
    },
    async clear() {
      console.warn(
        "[s3 driver] clear() is not fully implemented. " +
          "Bun's S3Client doesn't support listing objects. " +
          "Consider using AWS SDK or implementing custom list logic.",
      );
    },
    async dispose() {
      // No cleanup needed for S3Client
    },
  };
});
