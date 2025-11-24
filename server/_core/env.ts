export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Google Gemini API Key (Primary)
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",

  // Manus Storage (fallback for OpenAI-compatible APIs)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  
  // Google Cloud Storage (for file uploads)
  gcsBucketName: process.env.GCS_BUCKET_NAME ?? "",
  gcsServiceAccountKeyJson: process.env.GCS_SERVICE_ACCOUNT_KEY_JSON ?? "",
};
