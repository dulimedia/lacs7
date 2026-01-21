/**
 * Floorplan Service - Manages floorplan images with preloading and fallback
 */

import { logger } from '../utils/logger';

// Fallback image when floorplan is not available
export const FALLBACK_FLOORPLAN = import.meta.env.BASE_URL + 'floorplans/no-floorplan-available.svg';

// Cache for preloaded images with LRU eviction
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();
const cacheAccessOrder = new Set<string>();

// Memory management: Limit cache to prevent 400+ images in GPU memory
const MAX_CACHED_IMAGES = 10; // Only keep 10 floorplans in memory at once

function evictLRUImages() {
  if (imageCache.size <= MAX_CACHED_IMAGES) return;
  
  // Remove oldest images until we're under the limit
  const accessOrderArray = Array.from(cacheAccessOrder);
  const toEvict = accessOrderArray.slice(0, imageCache.size - MAX_CACHED_IMAGES);
  
  toEvict.forEach(url => {
    const img = imageCache.get(url);
    if (img) {
      // Clean up image resources
      img.src = '';
      imageCache.delete(url);
      cacheAccessOrder.delete(url);
      console.log(`🗑️ Evicted floorplan from cache: ${url.split('/').pop()}`);
    }
  });
}

/**
 * Generate a stable key for floorplan based on building, floor, and unit IDs
 */
export function generateFloorplanKey(
  building: string,
  floor: string,
  unitId: string
): string {
  // Create a stable key using the three identifiers
  return `${building}_${floor}_${unitId}`.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Preload an image and cache it with thumbnail fallback
 */
export async function preloadImage(url: string, allowThumbnailFallback: boolean = false): Promise<HTMLImageElement> {
  // Update access order for LRU if already cached
  if (imageCache.has(url)) {
    cacheAccessOrder.delete(url);
    cacheAccessOrder.add(url);
    return imageCache.get(url)!;
  }

  // Return existing loading promise if image is being loaded
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  // Create loading promise
  const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Add to cache and update access order
      imageCache.set(url, img);
      cacheAccessOrder.delete(url);
      cacheAccessOrder.add(url);
      
      // Evict old images to stay under memory limit
      evictLRUImages();
      
      loadingPromises.delete(url);
      
      console.log(`✅ Cached floorplan (${imageCache.size}/${MAX_CACHED_IMAGES}): ${url.split('/').pop()}`);
      resolve(img);
    };
    
    img.onerror = () => {
      loadingPromises.delete(url);
      
      // If thumbnail fallback is allowed and this looks like a thumbnail URL, try the full version
      if (allowThumbnailFallback && (url.includes('/thumbs/') || url.includes('thumb_'))) {
        const fullResUrl = convertThumbnailToFullUrl(url);
        console.log(`📸 Thumbnail failed, trying full-res: ${fullResUrl}`);
        
        // Try loading the full resolution version
        preloadImage(fullResUrl, false).then(resolve).catch(() => {
          // If both fail, reject
          reject(new Error(`Failed to load both thumbnail and full-res image: ${url}`));
        });
        return;
      }
      
      // Don't cache failed loads
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    img.src = url;
  });

  loadingPromises.set(url, loadingPromise);
  return loadingPromise;
}

/**
 * Convert thumbnail URL back to full resolution URL
 */
function convertThumbnailToFullUrl(thumbnailUrl: string): string {
  try {
    if (thumbnailUrl.startsWith('http')) {
      const url = new URL(thumbnailUrl);
      // Convert /thumbnails/ back to /converted/ and remove thumb_ prefix
      let pathname = url.pathname.replace('/thumbnails/', '/converted/');
      const pathParts = pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      if (fileName.startsWith('thumb_')) {
        pathParts[pathParts.length - 1] = fileName.substring(6); // Remove 'thumb_' prefix
        pathname = pathParts.join('/');
      }
      url.pathname = pathname;
      return url.toString();
    } else {
      // Handle relative paths
      let path = thumbnailUrl.replace('/thumbnails/', '/converted/');
      const pathParts = path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      if (fileName.startsWith('thumb_')) {
        pathParts[pathParts.length - 1] = fileName.substring(6);
        path = pathParts.join('/');
      }
      return path;
    }
  } catch (error) {
    return thumbnailUrl;
  }
}

/**
 * Preload all floorplans for a specific floor
 */
export async function preloadFloorFloorplans(
  units: Array<{ floorplan_url?: string }>
): Promise<void> {
  const urls = units
    .map(unit => unit.floorplan_url)
    .filter((url): url is string => !!url);

  // Preload all images in parallel
  const promises = urls.map(url => 
    preloadImage(url).catch(() => {
      logger.warn('FLOORPLAN', '⚠️', `Failed to preload floorplan: ${url}`);
    })
  );

  await Promise.all(promises);
}

/**
 * Get floorplan URL with fallback and proper base URL handling
 * @param floorplanUrl - The floorplan URL to process
 * @param fallbackUrl - Fallback URL if none provided
 * @param useThumbnail - Whether to use thumbnail version for faster loading
 */
export function getFloorplanUrl(
  floorplanUrl: string | null | undefined,
  fallbackUrl: string = FALLBACK_FLOORPLAN,
  useThumbnail: boolean = false
): string {
  if (!floorplanUrl) {
    return fallbackUrl;
  }
  
  // If it's already a full URL, return as-is (but may need thumbnail conversion)
  if (floorplanUrl.startsWith('http://') || floorplanUrl.startsWith('https://')) {
    return useThumbnail ? convertToThumbnailUrl(floorplanUrl) : floorplanUrl;
  }
  
  // Handle relative paths with proper base URL
  let normalizedPath = floorplanUrl;
  
  // Remove leading slash if present since BASE_URL includes trailing slash
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.substring(1);
  }
  
  // Convert to thumbnail path if requested
  if (useThumbnail) {
    normalizedPath = convertToThumbnailPath(normalizedPath);
  }
  
  // Combine with base URL - Vite handles URL encoding automatically
  const finalUrl = import.meta.env.BASE_URL + normalizedPath;
  return finalUrl;
}

/**
 * Convert a full-resolution floorplan path to thumbnail version
 * Looks for thumbnails in the /thumbnails/ subdirectory with thumb_ prefix
 * Falls back to original if thumbnails don't exist
 */
function convertToThumbnailPath(originalPath: string): string {
  // Extract the directory and filename
  const pathParts = originalPath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  
  // For floorplan paths like 'floorplans/converted/filename.png'
  // Convert to 'floorplans/thumbnails/thumb_filename.png'
  if (originalPath.includes('floorplans/converted/')) {
    const thumbnailPath = originalPath.replace(
      'floorplans/converted/',
      'floorplans/thumbnails/'
    );
    // Add thumb_ prefix to filename
    const pathWithoutFile = thumbnailPath.substring(0, thumbnailPath.lastIndexOf('/'));
    const thumbFileName = 'thumb_' + fileName;
    return `${pathWithoutFile}/${thumbFileName}`;
  }
  
  // Generic approach for other paths
  const directory = pathParts.slice(0, -1).join('/');
  const thumbFileName = 'thumb_' + fileName;
  
  if (directory) {
    // Replace the last directory component with 'thumbnails'
    const dirParts = directory.split('/');
    dirParts[dirParts.length - 1] = 'thumbnails';
    const thumbDir = dirParts.join('/');
    return `${thumbDir}/${thumbFileName}`;
  }
  
  // Fallback: just add thumb_ prefix in same directory
  return `thumbnails/${thumbFileName}`;
}

/**
 * Convert a full URL to thumbnail version
 */
function convertToThumbnailUrl(originalUrl: string): string {
  try {
    const url = new URL(originalUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const directory = pathParts.slice(0, -1).join('/');
    
    // Try thumb_ prefix and /thumbs/ subdirectory
    const thumbFileName = 'thumb_' + fileName;
    url.pathname = `${directory}/thumbs/${thumbFileName}`;
    
    return url.toString();
  } catch (error) {
    // If URL parsing fails, return original
    return originalUrl;
  }
}

/**
 * Check if an image is already cached
 */
export function isImageCached(url: string): boolean {
  return imageCache.has(url);
}

/**
 * Clear the image cache (useful for memory management)
 */
export function clearImageCache(): void {
  imageCache.clear();
  loadingPromises.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    cachedImages: imageCache.size,
    loadingImages: loadingPromises.size,
    totalMemoryEstimate: Array.from(imageCache.values()).reduce((total, img) => {
      // Rough estimate: width * height * 4 bytes per pixel
      return total + (img.width * img.height * 4);
    }, 0)
  };
}