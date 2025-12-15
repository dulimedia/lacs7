
// Application-wide configuration

// The base URL where the application is hosted/embedded.
// Use this to ensure share links point to the client's website instead of the Vercel deployment.
// If set to null, it will fallback to window.location.origin (the current browser URL).
export const APP_CONFIG = {
    // Set to the client's embedding URL:
    shareBaseUrl: 'https://lacenterstudios.com/office-space/',

    // Alternative: 'https://lacscampus26.vercel.app/'
    // Alternative: null (uses current window URL)
};
