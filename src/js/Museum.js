import * as THREE from 'three';

export class Museum {
  constructor(scene, loadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    
    // Create museum structure
    this.createFloor();
    this.createWalls();
    this.createCeiling();
    
    // Add environmental elements
    this.addSkybox();
  }
  
  createFloor() {
    // Floor geometry and material
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.2
    });
    
    // Create floor mesh
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.floor.position.y = -0.01; // Slightly below origin to prevent z-fighting
    this.floor.receiveShadow = true;
    
    // Add to scene
    this.scene.add(this.floor);
  }
  
  createWalls() {
    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.1
    });
    
    // North wall
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(50, 10, 0.5),
      wallMaterial
    );
    northWall.position.set(0, 5, -25);
    northWall.receiveShadow = true;
    
    // South wall
    const southWall = new THREE.Mesh(
      new THREE.BoxGeometry(50, 10, 0.5),
      wallMaterial
    );
    southWall.position.set(0, 5, 25);
    southWall.receiveShadow = true;
    
    // East wall
    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 10, 50),
      wallMaterial
    );
    eastWall.position.set(25, 5, 0);
    eastWall.receiveShadow = true;
    
    // West wall
    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 10, 50),
      wallMaterial
    );
    westWall.position.set(-25, 5, 0);
    westWall.receiveShadow = true;
    
    // Add walls to scene
    this.scene.add(northWall);
    this.scene.add(southWall);
    this.scene.add(eastWall);
    this.scene.add(westWall);
    
    // Store walls in an array for potential interactions
    this.walls = [northWall, southWall, eastWall, westWall];
  }
  
  createCeiling() {
    // Ceiling geometry and material
    const ceilingGeometry = new THREE.PlaneGeometry(50, 50);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Create ceiling mesh
    this.ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    this.ceiling.rotation.x = Math.PI / 2; // Rotate to be horizontal
    this.ceiling.position.y = 10; // 10 units high
    this.ceiling.receiveShadow = true;
    
    // Add to scene
    this.scene.add(this.ceiling);
  }
  
  addSkybox() {
    // In a more complex implementation, you might use a cubemap texture
    // For now, we'll just set the scene background to a dark color
    this.scene.background = new THREE.Color(0x000011);
    
    // Create subtle fog for atmospheric depth
    this.scene.fog = new THREE.FogExp2(0x000011, 0.01);
  }
  
  // Method to add interior details like benches, plants, etc.
  addInteriorDetails() {
    // Example: Add center pedestal or feature
    const pedestalGeometry = new THREE.CylinderGeometry(2, 2, 1, 32);
    const pedestalMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.6,
      metalness: 0.2
    });
    
    const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
    pedestal.position.set(0, 0.5, 0);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    
    this.scene.add(pedestal);
  }
  
  // Utility method to create a room divider wall
  createRoomDivider(width, height, depth, position, rotation) {
    const dividerMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.1
    });
    
    const divider = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      dividerMaterial
    );
    divider.position.copy(position);
    
    if (rotation) {
      divider.rotation.copy(rotation);
    }
    
    divider.castShadow = true;
    divider.receiveShadow = true;
    
    this.scene.add(divider);
    return divider;
  }
  
  // Method to create additional museum rooms or sections
  expandMuseum() {
    // This could be implemented to add more sections or rooms to the museum
    console.log("Museum expansion not implemented yet");
  }
} 