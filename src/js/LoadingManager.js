import * as THREE from 'three';

export class LoadingManager {
  constructor() {
    this.manager = new THREE.LoadingManager();
    this.totalItems = 0;
    this.loadedItems = 0;
    this.onComplete = null;
    
    // Set up manager callbacks
    this.manager.onStart = (url, itemsLoaded, itemsTotal) => {
      this.totalItems = itemsTotal;
      console.log(`Started loading: ${url}`);
    };
    
    this.manager.onLoad = () => {
      console.log('Loading complete!');
      if (typeof this.onComplete === 'function') {
        this.onComplete();
      }
    };
    
    this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      this.loadedItems = itemsLoaded;
      this.totalItems = itemsTotal;
      const progressPercent = (itemsLoaded / itemsTotal) * 100;
      
      // Update loading bar
      const progressBar = document.querySelector('.progress-bar');
      if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
      }
      
      // Update loading text
      const loadingText = document.querySelector('.loading-text');
      if (loadingText) {
        loadingText.textContent = `Loading experience... ${Math.round(progressPercent)}%`;
      }
      
      console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
    };
    
    this.manager.onError = (url) => {
      console.error(`Error loading: ${url}`);
    };
  }
  
  // Get the THREE.LoadingManager instance
  getManager() {
    return this.manager;
  }
  
  // Check if all assets are loaded
  isComplete() {
    return this.loadedItems === this.totalItems;
  }
  
  // Get the current loading progress as a percentage
  getProgress() {
    if (this.totalItems === 0) return 0;
    return (this.loadedItems / this.totalItems) * 100;
  }
} 