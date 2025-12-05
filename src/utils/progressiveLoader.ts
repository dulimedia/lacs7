// Progressive loading system for mobile optimization
// Loads models in priority order to prevent memory overload

export interface LoadPriority {
  essential: string[]; // Core building structure (always load)
  important: string[]; // Key units (load on demand)
  optional: string[]; // Decorative elements (load last)
}

export class ProgressiveLoader {
  private static instance: ProgressiveLoader;
  private loadQueue: string[] = [];
  private loadedModels = new Set<string>();
  private loadingState: 'idle' | 'loading' | 'paused' = 'idle';
  private isMobile: boolean;
  
  static getInstance(): ProgressiveLoader {
    if (!ProgressiveLoader.instance) {
      ProgressiveLoader.instance = new ProgressiveLoader();
    }
    return ProgressiveLoader.instance;
  }

  constructor() {
    this.isMobile = /Mobi|Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
  }

  // Define loading priorities for mobile
  getLoadPriorities(): LoadPriority {
    return {
      essential: [
        // Core building structure only
        'Fifth Street Building/Ground Floor',
        'Fifth Street Building/First Floor',
        'Maryland Building/Ground Floor',
        'Tower Building/Ground Floor'
      ],
      important: [
        // Main unit spaces
        'Fifth Street Building/Mezzanine',
        'Maryland Building/First Floor',
        'Tower Building/First Floor'
      ],
      optional: [
        // Everything else - decorative, staging areas, etc.
        'production support',
        'surface parking',
        'park',
        'lobby',
        'restrooms'
      ]
    };
  }

  // Check if a model should be loaded based on mobile constraints
  shouldLoadModel(modelPath: string): boolean {
    if (!this.isMobile) {
      return true; // Desktop can load everything
    }

    const priorities = this.getLoadPriorities();
    
    // Always load essential models
    if (priorities.essential.some(essential => modelPath.includes(essential))) {
      return true;
    }

    // Load important models only if not many are already loaded
    if (priorities.important.some(important => modelPath.includes(important))) {
      return this.loadedModels.size < 10; // Limit to 10 models on mobile
    }

    // Only load optional models if very few are loaded and memory is good
    return this.loadedModels.size < 5 && this.hasGoodMemory();
  }

  // Check if device has sufficient memory
  private hasGoodMemory(): boolean {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const perf = (window.performance as any);
      if (perf && perf.memory) {
        const memoryUsage = perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit;
        return memoryUsage < 0.3; // Only load optional models if memory usage is low
      }
    }
    return false; // Conservative approach if memory API not available
  }

  // Register that a model has been loaded
  registerLoaded(modelPath: string) {
    this.loadedModels.add(modelPath);
    console.log(`📦 Model loaded: ${modelPath} (${this.loadedModels.size} total loaded)`);
  }

  // Unload optional models to free memory
  unloadOptionalModels(): string[] {
    const priorities = this.getLoadPriorities();
    const unloadedPaths: string[] = [];

    for (const modelPath of this.loadedModels) {
      // Only unload optional models
      if (priorities.optional.some(optional => modelPath.includes(optional))) {
        this.loadedModels.delete(modelPath);
        unloadedPaths.push(modelPath);
      }
    }

    console.log(`🗑️ Unloaded ${unloadedPaths.length} optional models to free memory`);
    return unloadedPaths;
  }

  // Get current loading stats
  getStats() {
    return {
      loadedCount: this.loadedModels.size,
      loadingState: this.loadingState,
      isMobile: this.isMobile
    };
  }
}

// Utility function to check if a unit should be rendered
export function shouldRenderUnit(unitPath: string): boolean {
  const loader = ProgressiveLoader.getInstance();
  return loader.shouldLoadModel(unitPath);
}