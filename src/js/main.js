import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Museum } from './Museum.js';
import { OrbLight } from './OrbLight.js';
import { PhotoExhibit } from './PhotoExhibit.js';
import { LoadingManager } from './LoadingManager.js';

// Main application class
class App {
  constructor() {
    this.canvas = document.getElementById('canvas-container');
    this.loadingManager = new LoadingManager();
    
    // Initialize the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.canvas.appendChild(this.renderer.domElement);
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);
    this.scene.fog = new THREE.FogExp2(0x000011, 0.015);
    
    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 5);
    
    // Movement controls - simplified
    this.moveSpeed = 0.15;
    this.rotationSpeed = 0.02;
    this.velocity = new THREE.Vector3();
    this.targetRotation = new THREE.Vector2();
    this.currentRotation = new THREE.Vector2();
    this.firstPersonMode = false; // Start in orbit mode by default
    this.controlsEnabled = true;
    
    // Key state tracking
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      boost: false,
      slow: false
    };
    
    // Mouse tracking
    this.mouse = {
      x: 0,
      y: 0,
      isDown: false
    };
    
    // Audio setup
    this.setupAudio();
    
    // Sample photos for the museum - in a real application, these would be loaded dynamically
    this.photos = [
      {
        id: 'photo1',
        title: 'Mountain Sunset',
        description: 'A breathtaking sunset over mountain ranges.',
        metadata: 'f/8 | 1/125s | ISO 100 | 24mm',
        path: '/images/photo1.jpg',
        position: new THREE.Vector3(-5, 1.5, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0)
      },
      {
        id: 'photo2',
        title: 'Ocean Waves',
        description: 'Powerful waves crashing against coastal rocks during storm.',
        metadata: 'f/11 | 1/500s | ISO 200 | 16mm',
        path: '/images/photo2.jpg',
        position: new THREE.Vector3(0, 1.5, -5),
        rotation: new THREE.Euler(0, 0, 0)
      },
      {
        id: 'photo3',
        title: 'Urban Night',
        description: 'City lights reflecting in a puddle after rain.',
        metadata: 'f/2.8 | 1/15s | ISO 800 | 35mm',
        path: '/images/photo3.jpg',
        position: new THREE.Vector3(5, 1.5, 0),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0)
      },
      {
        id: 'photo4',
        title: 'Forest Path',
        description: 'Morning light filtering through ancient trees.',
        metadata: 'f/5.6 | 1/60s | ISO 400 | 50mm',
        path: '/images/photo4.jpg',
        position: new THREE.Vector3(0, 1.5, 5),
        rotation: new THREE.Euler(0, Math.PI, 0)
      }
    ];
    
    // Initialize museum, lighting, and controls
    this.museum = new Museum(this.scene, this.loadingManager);
    this.initLighting();
    this.orbLight = new OrbLight(this.scene, this.camera);
    this.setupControls();
    
    // Set up photo exhibits
    this.photoExhibits = [];
    this.initPhotoExhibits();
    
    // Raycasting for interactive elements
    this.raycaster = new THREE.Raycaster();
    this.mouseVector = new THREE.Vector2();
    this.selectedExhibit = null;
    
    // Post-processing composer
    this.setupPostProcessing();
    
    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('click', this.onMouseClick.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    document.getElementById('fullscreen-btn').addEventListener('click', this.viewPhotoFullscreen.bind(this));
    
    // Add view mode toggle button
    this.addViewModeToggle();
    
    // Start the animation loop
    this.clock = new THREE.Clock();
    this.animate();
    
    // Initialize debug panel
    this.initDebugPanel();
    
    // Initialize loading
    this.loadingManager.onComplete = () => {
      document.getElementById('loading-screen').style.display = 'none';
      // Play ambient sound when loaded
      if (this.ambientSound) {
        this.ambientSound.play();
      }
    };
    
    // Initialize debug panel
    this.initDebugPanel();
  }
  
  setupAudio() {
    try {
      // Create an audio listener and add it to the camera
      this.listener = new THREE.AudioListener();
      
      if (this.camera) {
        this.camera.add(this.listener);
      }
      
      // Create ambient sound
      this.ambientSound = new THREE.Audio(this.listener);
      
      // Create a sound effect for movement
      this.movementSound = new THREE.Audio(this.listener);
      
      // Load ambient sound
      const audioLoader = new THREE.AudioLoader(this.loadingManager.getManager());
      audioLoader.load('/audio/ambient.mp3', (buffer) => {
        this.ambientSound.setBuffer(buffer);
        this.ambientSound.setLoop(true);
        this.ambientSound.setVolume(0.5);
        console.log("Ambient sound loaded");
      }, undefined, (error) => {
        console.warn('Failed to load ambient sound:', error);
      });
      
      // Load movement sound
      audioLoader.load('/audio/whoosh.mp3', (buffer) => {
        this.movementSound.setBuffer(buffer);
        this.movementSound.setVolume(0.2);
        console.log("Movement sound loaded");
      }, undefined, (error) => {
        console.warn('Failed to load movement sound:', error);
      });
    } catch (error) {
      console.error("Error setting up audio:", error);
      // Create dummy methods to prevent errors if audio fails
      this.ambientSound = { play: () => {}, isPlaying: false };
      this.movementSound = { play: () => {}, isPlaying: false };
    }
  }
  
  setupPostProcessing() {
    // This would use EffectComposer for bloom and other effects
    // For simplicity, we'll just use the built-in renderer for now
    this.renderer.outputEncoding = THREE.sRGBEncoding;
  }
  
  addViewModeToggle() {
    // Create a toggle button for first person / orbit mode
    const viewModeToggle = document.createElement('button');
    viewModeToggle.textContent = 'Toggle View Mode';
    viewModeToggle.className = 'view-mode-toggle';
    viewModeToggle.style.position = 'absolute';
    viewModeToggle.style.top = '20px';
    viewModeToggle.style.right = '20px';
    viewModeToggle.style.zIndex = '100';
    viewModeToggle.style.padding = '10px 15px';
    viewModeToggle.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    viewModeToggle.style.color = 'white';
    viewModeToggle.style.border = '1px solid white';
    viewModeToggle.style.borderRadius = '4px';
    viewModeToggle.style.cursor = 'pointer';
    
    viewModeToggle.addEventListener('click', () => {
      this.toggleViewMode();
    });
    
    document.body.appendChild(viewModeToggle);
  }
  
  toggleViewMode() {
    this.firstPersonMode = !this.firstPersonMode;
    
    if (this.firstPersonMode) {
      // First person mode - disable orbit controls
      this.controls.enabled = false;
      console.log("Switched to first person mode");
    } else {
      // Orbit mode - enable orbit controls
      this.controls.enabled = true;
      console.log("Switched to orbit mode");
    }
    
    // Update the UI to reflect the mode
    const toggleButton = document.querySelector('.view-mode-toggle');
    if (toggleButton) {
      toggleButton.textContent = this.firstPersonMode ? 'Switch to Orbit Mode' : 'Switch to First Person';
    }
  }
  
  initLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    // Directional light (main light source)
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
    mainLight.position.set(10, 10, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    
    const d = 15;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;
    mainLight.shadow.camera.far = 50;
    
    this.scene.add(mainLight);
    
    // Add some random point lights for atmosphere
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff8800];
    
    for (let i = 0; i < 5; i++) {
      const light = new THREE.PointLight(colors[i % colors.length], 1, 15);
      const x = Math.random() * 30 - 15;
      const y = Math.random() * 5 + 1;
      const z = Math.random() * 30 - 15;
      light.position.set(x, y, z);
      light.intensity = 0.5 + Math.random() * 0.5;
      this.scene.add(light);
    }
  }
  
  setupControls() {
    // Create orbit controls for non-first-person mode
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // Configure orbit controls
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 1.5;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;  // Disable panning
    this.controls.enableRotate = true;  // Keep rotation enabled
    this.controls.rotateSpeed = 0.7;
    
    // Make sure controls are enabled since we start in orbit mode
    this.controls.enabled = true;
    
    // Set initial target to be in front of the camera
    const targetDistance = 5;
    const target = new THREE.Vector3().copy(this.camera.position).add(
      new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).multiplyScalar(targetDistance)
    );
    this.controls.target.copy(target);
    
    // Add camera to audio listener (if available)
    if (this.listener) {
      this.camera.add(this.listener);
    }
    
    console.log("Controls setup complete, orbit controls enabled:", this.controls.enabled);
  }
  
  initPhotoExhibits() {
    this.photos.forEach(photo => {
      const exhibit = new PhotoExhibit(
        this.scene,
        photo.id,
        photo.path,
        photo.position,
        photo.rotation,
        photo.title,
        photo.description,
        photo.metadata,
        this.loadingManager
      );
      this.photoExhibits.push(exhibit);
    });
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  onMouseMove(event) {
    // Update mouse position
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Store normalized coordinates for raycasting
    this.mouseVector.x = this.mouse.x;
    this.mouseVector.y = this.mouse.y;
    
    // In first person mode, use mouse for camera rotation
    if (this.firstPersonMode && this.mouse.isDown) {
      // Calculate rotation based on mouse movement
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;
      
      this.targetRotation.x -= movementX * this.rotationSpeed;
      this.targetRotation.y = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.targetRotation.y - movementY * this.rotationSpeed)
      );
    }
    
    // Handle hover effects for exhibits
    this.checkIntersections();
  }
  
  onMouseDown(event) {
    if (event.button === 0) { // Left button
      this.mouse.isDown = true;
      
      if (this.firstPersonMode) {
        // Lock pointer for first person view
        this.canvas.requestPointerLock = this.canvas.requestPointerLock ||
                                         this.canvas.mozRequestPointerLock ||
                                         this.canvas.webkitRequestPointerLock;
        this.canvas.requestPointerLock();
      }
    }
  }
  
  onMouseUp(event) {
    if (event.button === 0) { // Left button
      this.mouse.isDown = false;
      
      if (this.firstPersonMode) {
        // Release pointer lock
        document.exitPointerLock = document.exitPointerLock ||
                                  document.mozExitPointerLock ||
                                  document.webkitExitPointerLock;
        document.exitPointerLock();
      }
    }
  }
  
  onMouseClick(event) {
    // Only handle clicks when not in first-person mode to avoid conflicts
    if (!this.firstPersonMode) {
      if (this.selectedExhibit) {
        this.showPhotoInfo(this.selectedExhibit);
      } else {
        this.hidePhotoInfo();
      }
    }
  }
  
  onKeyDown(event) {
    if (!this.controlsEnabled) return;
    
    console.log("Key down:", event.key);
    
    // Special debug key to test movement
    if (event.key === 't' || event.key === 'T') {
      console.log("TEST MOVE");
      // Move forward a bit as a test
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      this.camera.position.add(forward.multiplyScalar(0.5));
      return;
    }
    
    // Basic direct movement for testing
    if (event.key === 'b' || event.key === 'B') {
      console.log("BASIC DIRECT MOVEMENT");
      let moveX = 0, moveZ = 0;
      
      document.addEventListener('keydown', (e) => {
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') moveZ = -0.1;
        if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') moveZ = 0.1;
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') moveX = -0.1;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') moveX = 0.1;
      });
      
      document.addEventListener('keyup', (e) => {
        if ((e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && moveZ < 0) moveZ = 0;
        if ((e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') && moveZ > 0) moveZ = 0;
        if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && moveX < 0) moveX = 0;
        if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && moveX > 0) moveX = 0;
      });
      
      // Override the animate loop to use direct movement
      const oldAnimate = this.animate;
      this.animate = () => {
        requestAnimationFrame(this.animate.bind(this));
        
        if (moveX !== 0 || moveZ !== 0) {
          this.camera.position.x += moveX;
          this.camera.position.z += moveZ;
          console.log("Direct move", moveX, moveZ);
        }
        
        this.controls.update();
        if (this.orbLight) this.orbLight.update(0.016);
        this.renderer.render(this.scene, this.camera);
      };
      
      return;
    }
    
    switch(event.key) {
      case 'w':
      case 'W':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 's':
      case 'S':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'a':
      case 'A':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'd':
      case 'D':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'Shift':
        this.keys.boost = true;
        break;
      case 'Alt':
        this.keys.slow = true;
        event.preventDefault(); // Prevent browser's default Alt behavior
        break;
      case 'v':
      case 'V':
        this.toggleViewMode();
        break;
    }
    
    // Log current key state for debugging
    console.log("Key state:", this.keys);
  }
  
  onKeyUp(event) {
    console.log("Key up:", event.key);
    
    switch(event.key) {
      case 'w':
      case 'W':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 's':
      case 'S':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'a':
      case 'A':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'd':
      case 'D':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Shift':
        this.keys.boost = false;
        break;
      case 'Alt':
        this.keys.slow = false;
        break;
    }
  }
  
  moveCamera(delta) {
    // Determine if we should use keyboard movement
    const useKeyboardMovement = this.firstPersonMode || !this.controls.enabled;
    
    // Clear velocity if not using keyboard movement
    if (!useKeyboardMovement) {
      this.velocity.set(0, 0, 0);
      return;
    }
    
    // Set a fixed delta if not provided (for consistent movement speed)
    delta = delta || 0.016; // Default to ~60fps
    
    // Base speed with delta time applied
    let currentSpeed = this.moveSpeed;
    
    // Apply boost or slow modifiers
    if (this.keys.boost) currentSpeed *= 2;
    if (this.keys.slow) currentSpeed *= 0.5;
    
    // Get camera's forward and right vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0; // Keep movement horizontal
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0; // Keep movement horizontal
    right.normalize();
    
    // Calculate movement vector directly
    const moveVector = new THREE.Vector3();
    
    if (this.keys.forward) moveVector.add(forward.clone().multiplyScalar(currentSpeed * delta * 60));
    if (this.keys.backward) moveVector.sub(forward.clone().multiplyScalar(currentSpeed * delta * 60));
    if (this.keys.right) moveVector.add(right.clone().multiplyScalar(currentSpeed * delta * 60));
    if (this.keys.left) moveVector.sub(right.clone().multiplyScalar(currentSpeed * delta * 60));
    
    // Apply the movement directly if there's input
    if (moveVector.length() > 0) {
      console.log("Moving camera:", moveVector);
      this.camera.position.add(moveVector);
      
      // Add slight bob effect when moving
      const bobAmount = Math.sin(Date.now() * 0.01) * 0.01;
      this.camera.position.y += bobAmount;
      
      // Update orbit controls target when in orbit mode
      if (!this.firstPersonMode) {
        const targetDistance = 5;
        const target = new THREE.Vector3().copy(this.camera.position).add(
          new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).multiplyScalar(targetDistance)
        );
        this.controls.target.copy(target);
      }
      
      // Simple collision detection with the museum walls
      this.checkWallCollisions();
    }
    
    // Apply rotation in first person mode
    if (this.firstPersonMode) {
      // Smooth the rotation
      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;
      
      // Apply the rotation to the camera
      this.camera.rotation.y = this.currentRotation.x;
      this.camera.rotation.x = this.currentRotation.y;
    }
  }
  
  checkWallCollisions() {
    const wallMargin = 0.5; // Keep distance from walls
    const museumSize = 25; // Size of museum from center
    const minHeight = 0.5; // Minimum height
    const maxHeight = 9.5; // Maximum height below ceiling
    
    // Restrict movement within the museum boundaries
    if (this.camera.position.x > museumSize - wallMargin) {
      this.camera.position.x = museumSize - wallMargin;
    }
    if (this.camera.position.x < -museumSize + wallMargin) {
      this.camera.position.x = -museumSize + wallMargin;
    }
    if (this.camera.position.z > museumSize - wallMargin) {
      this.camera.position.z = museumSize - wallMargin;
    }
    if (this.camera.position.z < -museumSize + wallMargin) {
      this.camera.position.z = -museumSize + wallMargin;
    }
    
    // Restrict vertical movement
    if (this.camera.position.y < minHeight) {
      this.camera.position.y = minHeight;
    }
    if (this.camera.position.y > maxHeight) {
      this.camera.position.y = maxHeight;
    }
  }
  
  checkIntersections() {
    this.raycaster.setFromCamera(this.mouseVector, this.camera);
    
    const intersects = this.raycaster.intersectObjects(
      this.photoExhibits.map(exhibit => exhibit.frameGroup)
    );
    
    if (intersects.length > 0) {
      // Find which exhibit was intersected
      const intersectedObject = intersects[0].object;
      const intersectedExhibit = this.photoExhibits.find(exhibit => 
        exhibit.frameGroup.children.includes(intersectedObject) || exhibit.frameGroup === intersectedObject
      );
      
      if (intersectedExhibit && this.selectedExhibit !== intersectedExhibit) {
        // Unhighlight previous selection
        if (this.selectedExhibit) {
          this.selectedExhibit.setHighlight(false);
        }
        
        // Highlight new selection
        this.selectedExhibit = intersectedExhibit;
        this.selectedExhibit.setHighlight(true);
      }
    } else if (this.selectedExhibit) {
      // Remove highlight if no intersection
      this.selectedExhibit.setHighlight(false);
      this.selectedExhibit = null;
    }
  }
  
  showPhotoInfo(exhibit) {
    const photoInfo = document.getElementById('photo-info');
    document.getElementById('photo-title').textContent = exhibit.title;
    document.getElementById('photo-description').textContent = exhibit.description;
    document.getElementById('photo-metadata').textContent = exhibit.metadata;
    photoInfo.classList.remove('hidden');
    
    // Store reference to current exhibit for fullscreen view
    this.currentlyViewedExhibit = exhibit;
  }
  
  hidePhotoInfo() {
    const photoInfo = document.getElementById('photo-info');
    photoInfo.classList.add('hidden');
    this.currentlyViewedExhibit = null;
  }
  
  viewPhotoFullscreen() {
    if (this.currentlyViewedExhibit) {
      // In a real application, this would create a fullscreen view of the photo
      console.log('Viewing photo fullscreen:', this.currentlyViewedExhibit.title);
      
      // Basic implementation - create a fullscreen overlay with the image
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
      overlay.style.zIndex = '1000';
      overlay.style.display = 'flex';
      overlay.style.justifyContent = 'center';
      overlay.style.alignItems = 'center';
      
      const img = document.createElement('img');
      img.src = this.currentlyViewedExhibit.photoPath;
      img.style.maxWidth = '90%';
      img.style.maxHeight = '90%';
      img.style.objectFit = 'contain';
      
      overlay.appendChild(img);
      
      // Close on click
      overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
      document.body.appendChild(overlay);
    }
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    
    // For debugging issues with keyboard input not registering
    if (Math.random() < 0.01) { // Log state occasionally
      console.log("Animation frame:", {
        firstPersonMode: this.firstPersonMode,
        controlsEnabled: this.controlsEnabled,
        orbitControlsEnabled: this.controls.enabled,
        keys: { ...this.keys }
      });
    }
    
    // Move camera based on keyboard input
    this.moveCamera(delta);
    
    // Update orbit controls if in orbit mode
    if (this.controls && !this.firstPersonMode) {
      this.controls.update();
    }
    
    // Update orb light position to follow camera
    if (this.orbLight) {
      this.orbLight.update(delta);
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
  
  initDebugPanel() {
    // Set up debug panel elements
    const toggleModeBtn = document.getElementById('toggle-mode-btn');
    const testMoveBtn = document.getElementById('test-move-btn');
    const directMoveBtn = document.getElementById('direct-move-btn');
    const positionDisplay = document.getElementById('position-display');
    
    // Key indicators
    const keyW = document.getElementById('key-w');
    const keyA = document.getElementById('key-a');
    const keyS = document.getElementById('key-s');
    const keyD = document.getElementById('key-d');
    
    // Add event listeners to buttons
    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', () => {
        this.toggleViewMode();
      });
    }
    
    if (testMoveBtn) {
      testMoveBtn.addEventListener('click', () => {
        // Move forward a bit as a test
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.camera.position.add(forward.multiplyScalar(0.5));
        console.log("Test move triggered from debug panel");
      });
    }
    
    if (directMoveBtn) {
      directMoveBtn.addEventListener('click', () => {
        // Activate basic direct movement mode
        alert("Basic movement mode activated. Use WASD to move directly.");
        console.log("Direct movement mode activated from debug panel");
        
        let moveX = 0, moveZ = 0;
        
        const handleKeyDown = (e) => {
          if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') moveZ = -0.1;
          if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') moveZ = 0.1;
          if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') moveX = -0.1;
          if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') moveX = 0.1;
          
          // Update key indicators
          if (keyW) keyW.textContent = (e.key === 'w' || e.key === 'W') ? '✅' : keyW.textContent;
          if (keyA) keyA.textContent = (e.key === 'a' || e.key === 'A') ? '✅' : keyA.textContent;
          if (keyS) keyS.textContent = (e.key === 's' || e.key === 'S') ? '✅' : keyS.textContent;
          if (keyD) keyD.textContent = (e.key === 'd' || e.key === 'D') ? '✅' : keyD.textContent;
        };
        
        const handleKeyUp = (e) => {
          if ((e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && moveZ < 0) moveZ = 0;
          if ((e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') && moveZ > 0) moveZ = 0;
          if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && moveX < 0) moveX = 0;
          if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && moveX > 0) moveX = 0;
          
          // Update key indicators
          if (keyW) keyW.textContent = (e.key === 'w' || e.key === 'W') ? '❌' : keyW.textContent;
          if (keyA) keyA.textContent = (e.key === 'a' || e.key === 'A') ? '❌' : keyA.textContent;
          if (keyS) keyS.textContent = (e.key === 's' || e.key === 'S') ? '❌' : keyS.textContent;
          if (keyD) keyD.textContent = (e.key === 'd' || e.key === 'D') ? '❌' : keyD.textContent;
        };
        
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        
        // Override the animate loop to use direct movement
        const oldAnimate = this.animate;
        this.animate = () => {
          requestAnimationFrame(this.animate.bind(this));
          
          if (moveX !== 0 || moveZ !== 0) {
            this.camera.position.x += moveX;
            this.camera.position.z += moveZ;
            console.log("Direct move", moveX, moveZ);
            
            // Update position display
            if (positionDisplay) {
              positionDisplay.textContent = `Position: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`;
            }
          }
          
          this.controls.update();
          if (this.orbLight) this.orbLight.update(0.016);
          this.renderer.render(this.scene, this.camera);
        };
      });
    }
    
    // Update key indicators on normal key events
    document.addEventListener('keydown', (e) => {
      if (keyW) keyW.textContent = (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') ? '✅' : keyW.textContent;
      if (keyA) keyA.textContent = (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') ? '✅' : keyA.textContent;
      if (keyS) keyS.textContent = (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') ? '✅' : keyS.textContent;
      if (keyD) keyD.textContent = (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') ? '✅' : keyD.textContent;
    });
    
    document.addEventListener('keyup', (e) => {
      if (keyW) keyW.textContent = (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') ? '❌' : keyW.textContent;
      if (keyA) keyA.textContent = (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') ? '❌' : keyA.textContent;
      if (keyS) keyS.textContent = (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') ? '❌' : keyS.textContent;
      if (keyD) keyD.textContent = (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') ? '❌' : keyD.textContent;
    });
    
    // Update position display in regular animation frame
    const originalAnimate = this.animate;
    this.animate = () => {
      originalAnimate.call(this);
      
      // Update position display
      if (positionDisplay) {
        positionDisplay.textContent = `Position: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`;
      }
    };
  }
}

// Initialize the application when the window loads
window.addEventListener('load', () => {
  new App();
}); 