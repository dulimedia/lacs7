
// Application-wide configuration

// The base URL where the application is hosted/embedded.
// Use this to ensure share links point to the client's website instead of the Vercel deployment.
// If set to null, it will fallback to window.location.origin (the current browser URL).
export const APP_CONFIG = {
    // UPDATED: Use official Vercel deployment URL for share links
    shareBaseUrl: 'https://lacs7.vercel.app/',

    // Previous: 'https://lacenterstudios.com/office-space/'
    // Alternative: null (uses current window URL)
};
