import * as THREE from 'three';

export class PhotoExhibit {
  constructor(scene, id, photoPath, position, rotation, title, description, metadata, loadingManager) {
    this.scene = scene;
    this.id = id;
    this.photoPath = photoPath;
    this.position = position;
    this.rotation = rotation;
    this.title = title;
    this.description = description;
    this.metadata = metadata;
    this.loadingManager = loadingManager;
    
    // Create the frame and photo
    this.frameGroup = new THREE.Group();
    this.initFrame();
    this.loadPhoto();
    
    // Position and rotate the frame
    this.frameGroup.position.copy(position);
    this.frameGroup.rotation.copy(rotation);
    
    // Add to scene
    this.scene.add(this.frameGroup);
  }
  
  initFrame() {
    // Frame dimensions
    const frameWidth = 2;
    const frameHeight = 1.5;
    const frameDepth = 0.1;
    const borderWidth = 0.1;
    
    // Frame material (wooden texture)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.8,
      metalness: 0.2
    });
    
    // Photo placeholder material (while loading)
    const placeholderMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333
    });
    
    // Create the photo placeholder (will be replaced when photo loads)
    const photoGeometry = new THREE.PlaneGeometry(
      frameWidth - borderWidth * 2,
      frameHeight - borderWidth * 2
    );
    this.photoMesh = new THREE.Mesh(photoGeometry, placeholderMaterial);
    this.photoMesh.position.z = 0.01; // Slightly in front of the back panel
    
    // Create the frame parts
    
    // Back panel
    const backPanel = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth / 2),
      frameMaterial
    );
    backPanel.position.z = -frameDepth / 4;
    
    // Frame borders
    // Top border
    const topBorder = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, borderWidth, frameDepth),
      frameMaterial
    );
    topBorder.position.y = frameHeight / 2 - borderWidth / 2;
    
    // Bottom border
    const bottomBorder = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, borderWidth, frameDepth),
      frameMaterial
    );
    bottomBorder.position.y = -frameHeight / 2 + borderWidth / 2;
    
    // Left border
    const leftBorder = new THREE.Mesh(
      new THREE.BoxGeometry(borderWidth, frameHeight - borderWidth * 2, frameDepth),
      frameMaterial
    );
    leftBorder.position.x = -frameWidth / 2 + borderWidth / 2;
    
    // Right border
    const rightBorder = new THREE.Mesh(
      new THREE.BoxGeometry(borderWidth, frameHeight - borderWidth * 2, frameDepth),
      frameMaterial
    );
    rightBorder.position.x = frameWidth / 2 - borderWidth / 2;
    
    // Add all parts to the frame group
    this.frameGroup.add(backPanel);
    this.frameGroup.add(this.photoMesh);
    this.frameGroup.add(topBorder);
    this.frameGroup.add(bottomBorder);
    this.frameGroup.add(leftBorder);
    this.frameGroup.add(rightBorder);
    
    // Add a small spotlight to illuminate the photo
    const spotlight = new THREE.SpotLight(0xffffff, 1);
    spotlight.position.set(0, 0, 2); // Position in front of the photo
    spotlight.target = this.frameGroup;
    spotlight.angle = Math.PI / 6; // Narrow beam
    spotlight.penumbra = 0.2;
    spotlight.distance = 5;
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 512;
    spotlight.shadow.mapSize.height = 512;
    
    this.frameGroup.add(spotlight);
    
    // Create invisible collider for interaction
    const colliderGeometry = new THREE.BoxGeometry(frameWidth + 0.5, frameHeight + 0.5, 1);
    const colliderMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    
    this.collider = new THREE.Mesh(colliderGeometry, colliderMaterial);
    this.frameGroup.add(this.collider);
    
    // Set frame to cast shadows
    this.frameGroup.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }
  
  loadPhoto() {
    // Load the photo texture
    const textureLoader = new THREE.TextureLoader(this.loadingManager.getManager());
    textureLoader.load(this.photoPath, (texture) => {
      // Create material with the loaded texture
      const photoMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide
      });
      
      // Apply the texture to the photo mesh
      this.photoMesh.material = photoMaterial;
    }, 
    undefined, // onProgress callback not needed
    (error) => {
      console.error(`Error loading photo ${this.photoPath}:`, error);
      
      // Create error texture with text
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 384;
      const context = canvas.getContext('2d');
      context.fillStyle = '#333333';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = '24px Arial';
      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.fillText('Image Not Found', canvas.width / 2, canvas.height / 2);
      
      const errorTexture = new THREE.CanvasTexture(canvas);
      const errorMaterial = new THREE.MeshBasicMaterial({
        map: errorTexture,
        side: THREE.FrontSide
      });
      
      this.photoMesh.material = errorMaterial;
    });
  }
  
  // Highlight the frame when selected
  setHighlight(isHighlighted) {
    this.frameGroup.traverse((object) => {
      if (object.isMesh && object !== this.photoMesh && object !== this.collider) {
        if (isHighlighted) {
          // Store original color if not already stored
          if (!object.userData.originalColor) {
            object.userData.originalColor = object.material.color.clone();
          }
          
          // Set highlight color (subtle glow)
          object.material.emissive = new THREE.Color(0x554433);
          object.material.emissiveIntensity = 0.5;
        } else {
          // Restore original color
          object.material.emissive = new THREE.Color(0x000000);
          object.material.emissiveIntensity = 0;
        }
      }
    });
  }
} 