import * as THREE from 'three';

export class OrbLight {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.previousPositions = [];
    this.maxTrailLength = 50; // Increased for longer trails
    this.trailSegments = [];
    this.lastPositionAddTime = 0;
    this.positionUpdateInterval = 60; // milliseconds between adding trail positions
    this.colorCycle = 0;
    this.colorSpeed = 0.005;
    this.trailWidth = 0.1;
    this.trailColors = [
      new THREE.Color(0x00ffff), // Cyan
      new THREE.Color(0xff00ff), // Magenta
      new THREE.Color(0xffff00), // Yellow
      new THREE.Color(0xff8800), // Orange
      new THREE.Color(0x00ff88)  // Teal
    ];
    
    // Create the main orb light
    this.createOrbLight();
    
    // Create the light trail
    this.createLightTrail();
  }
  
  createOrbLight() {
    // Point light for the orb
    this.light = new THREE.PointLight(0xffffff, 1.5, 15);
    this.light.position.set(0, 0, 0);
    this.light.castShadow = true;
    
    // Improve shadow quality
    this.light.shadow.mapSize.width = 512;
    this.light.shadow.mapSize.height = 512;
    this.light.shadow.radius = 4;
    this.light.shadow.bias = -0.0005;
    
    // Create the visible sphere for the orb
    const sphereGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    
    this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.35, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xffffff) },
        viewVector: { value: new THREE.Vector3() }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.6 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        varying float intensity;
        void main() {
          vec3 glow = color * intensity;
          float pulse = 0.5 + 0.5 * sin(time * 2.0);
          gl_FragColor = vec4(glow * pulse, 1.0);
        }
      `,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    // Add lens flare effect
    const flareTextureLoader = new THREE.TextureLoader();
    flareTextureLoader.load('/images/lens_flare.png', (texture) => {
      const flareMaterial = new THREE.SpriteMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      
      this.flare = new THREE.Sprite(flareMaterial);
      this.flare.scale.set(2, 2, 1);
      this.sphere.add(this.flare);
    });
    
    // Combine light and sphere into a group
    this.orbGroup = new THREE.Group();
    this.orbGroup.add(this.light);
    this.orbGroup.add(this.sphere);
    this.orbGroup.add(this.glow);
    
    // Add to scene
    this.scene.add(this.orbGroup);
  }
  
  createLightTrail() {
    // Create trail material with custom shader for better effects
    this.trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        time: { value: 0 },
        opacity: { value: 0.8 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
          float fadeEdges = pow(sin(vUv.y * 3.14159), 0.5);
          vec3 finalColor = color * fadeEdges;
          float alpha = opacity * fadeEdges;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    // Create ribbon for continuous trail
    this.ribbonGeometry = new THREE.BufferGeometry();
    this.ribbonPositions = new Float32Array(this.maxTrailLength * 6 * 3); // 2 triangles (6 vertices) per segment, 3 coordinates per vertex
    this.ribbonGeometry.setAttribute('position', new THREE.BufferAttribute(this.ribbonPositions, 3));
    
    this.ribbonUvs = new Float32Array(this.maxTrailLength * 6 * 2); // 2 UV coordinates per vertex
    this.ribbonGeometry.setAttribute('uv', new THREE.BufferAttribute(this.ribbonUvs, 2));
    
    this.ribbonMaterial = this.trailMaterial.clone();
    this.ribbon = new THREE.Mesh(this.ribbonGeometry, this.ribbonMaterial);
    this.scene.add(this.ribbon);
    
    // Initialize UVs
    for (let i = 0; i < this.maxTrailLength; i++) {
      const idx = i * 12; // 6 vertices * 2 coordinates
      
      // First triangle
      this.ribbonUvs[idx + 0] = 0; this.ribbonUvs[idx + 1] = i / this.maxTrailLength;
      this.ribbonUvs[idx + 2] = 1; this.ribbonUvs[idx + 3] = i / this.maxTrailLength;
      this.ribbonUvs[idx + 4] = 0; this.ribbonUvs[idx + 5] = (i + 1) / this.maxTrailLength;
      
      // Second triangle
      this.ribbonUvs[idx + 6] = 1; this.ribbonUvs[idx + 7] = i / this.maxTrailLength;
      this.ribbonUvs[idx + 8] = 1; this.ribbonUvs[idx + 9] = (i + 1) / this.maxTrailLength;
      this.ribbonUvs[idx + 10] = 0; this.ribbonUvs[idx + 11] = (i + 1) / this.maxTrailLength;
    }
    
    this.ribbon.geometry.getAttribute('uv').needsUpdate = true;
  }
  
  // Get color based on cycle
  getTrailColor() {
    const totalColors = this.trailColors.length;
    const idx1 = Math.floor(this.colorCycle * totalColors) % totalColors;
    const idx2 = (idx1 + 1) % totalColors;
    const ratio = (this.colorCycle * totalColors) % 1;
    
    const color = new THREE.Color();
    color.copy(this.trailColors[idx1]).lerp(this.trailColors[idx2], ratio);
    return color;
  }
  
  // Update ribbon geometry based on positions
  updateRibbonGeometry() {
    if (this.previousPositions.length < 2) return;
    
    const up = new THREE.Vector3(0, 1, 0);
    const segments = Math.min(this.previousPositions.length - 1, this.maxTrailLength);
    
    for (let i = 0; i < segments; i++) {
      const curr = this.previousPositions[this.previousPositions.length - 1 - i];
      const next = this.previousPositions[this.previousPositions.length - 2 - i];
      
      // Calculate direction and perpendicular
      const direction = new THREE.Vector3().subVectors(next, curr).normalize();
      const perpendicular = new THREE.Vector3().crossVectors(direction, up).normalize();
      
      // Width decreases along the trail
      const width = this.trailWidth * (1 - i / segments);
      
      // Set vertices positions for each segment
      const vIdx = i * 18; // 6 vertices * 3 coordinates
      
      // Left vertex of current position
      const leftCurr = new THREE.Vector3().copy(curr).add(perpendicular.clone().multiplyScalar(width));
      this.ribbonPositions[vIdx + 0] = leftCurr.x;
      this.ribbonPositions[vIdx + 1] = leftCurr.y;
      this.ribbonPositions[vIdx + 2] = leftCurr.z;
      
      // Right vertex of current position
      const rightCurr = new THREE.Vector3().copy(curr).sub(perpendicular.clone().multiplyScalar(width));
      this.ribbonPositions[vIdx + 3] = rightCurr.x;
      this.ribbonPositions[vIdx + 4] = rightCurr.y;
      this.ribbonPositions[vIdx + 5] = rightCurr.z;
      
      // Left vertex of next position
      const leftNext = new THREE.Vector3().copy(next).add(perpendicular.clone().multiplyScalar(width));
      this.ribbonPositions[vIdx + 6] = leftNext.x;
      this.ribbonPositions[vIdx + 7] = leftNext.y;
      this.ribbonPositions[vIdx + 8] = leftNext.z;
      
      // Second triangle
      this.ribbonPositions[vIdx + 9] = rightCurr.x;
      this.ribbonPositions[vIdx + 10] = rightCurr.y;
      this.ribbonPositions[vIdx + 11] = rightCurr.z;
      
      const rightNext = new THREE.Vector3().copy(next).sub(perpendicular.clone().multiplyScalar(width));
      this.ribbonPositions[vIdx + 12] = rightNext.x;
      this.ribbonPositions[vIdx + 13] = rightNext.y;
      this.ribbonPositions[vIdx + 14] = rightNext.z;
      
      this.ribbonPositions[vIdx + 15] = leftNext.x;
      this.ribbonPositions[vIdx + 16] = leftNext.y;
      this.ribbonPositions[vIdx + 17] = leftNext.z;
    }
    
    // Need to mark as needing update
    this.ribbon.geometry.getAttribute('position').needsUpdate = true;
  }
  
  // Update orb position and trail
  update(delta) {
    // Update color cycle
    this.colorCycle = (this.colorCycle + this.colorSpeed) % 1.0;
    const currentColor = this.getTrailColor();
    
    // Update glow shader time
    if (this.glow && this.glow.material.uniforms) {
      this.glow.material.uniforms.time.value += delta;
      this.glow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        this.camera.position,
        this.orbGroup.position
      );
    }
    
    // Update orb color to match current trail color
    if (this.light) {
      this.light.color.copy(currentColor);
    }
    
    if (this.sphere) {
      this.sphere.material.color.copy(currentColor);
    }
    
    // Update ribbon material
    if (this.ribbonMaterial && this.ribbonMaterial.uniforms) {
      this.ribbonMaterial.uniforms.color.value.copy(currentColor);
      this.ribbonMaterial.uniforms.time.value += delta;
    }
    
    // Position the orb slightly in front of the camera
    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const orbPosition = new THREE.Vector3().copy(this.camera.position).add(
      cameraDirection.multiplyScalar(1.2) // 1.2 units in front of camera
    );
    
    // Add some oscillation to the orb position for more dynamic feel
    const time = Date.now() * 0.001;
    orbPosition.y += Math.sin(time * 2.5) * 0.03;
    orbPosition.x += Math.sin(time * 1.5) * 0.02;
    orbPosition.z += Math.cos(time * 2.0) * 0.02;
    
    // Update orb position
    this.orbGroup.position.copy(orbPosition);
    
    // Store position for trail at intervals
    const now = Date.now();
    if (now - this.lastPositionAddTime > this.positionUpdateInterval || 
        (this.previousPositions.length > 0 && 
         orbPosition.distanceTo(this.previousPositions[this.previousPositions.length - 1]) > 0.25)) {
      
      this.previousPositions.push(orbPosition.clone());
      this.lastPositionAddTime = now;
      
      // Remove oldest position if we have too many
      if (this.previousPositions.length > this.maxTrailLength + 1) {
        this.previousPositions.shift();
      }
      
      // Update the ribbon geometry
      this.updateRibbonGeometry();
    }
    
    // If user is moving fast, create more intermediate points
    if (this.previousPositions.length > 1) {
      const lastPos = this.previousPositions[this.previousPositions.length - 1];
      const prevPos = this.previousPositions[this.previousPositions.length - 2];
      const distance = lastPos.distanceTo(prevPos);
      
      if (distance > 0.5) {
        // Create intermediate points
        const numPoints = Math.ceil(distance / 0.2);
        for (let i = 1; i < numPoints; i++) {
          const t = i / numPoints;
          const interpPos = new THREE.Vector3().lerpVectors(prevPos, lastPos, t);
          // Add small random variation
          interpPos.x += (Math.random() - 0.5) * 0.02;
          interpPos.y += (Math.random() - 0.5) * 0.02;
          interpPos.z += (Math.random() - 0.5) * 0.02;
          this.previousPositions.splice(this.previousPositions.length - 1, 0, interpPos);
        }
        
        // Trim if too many
        while (this.previousPositions.length > this.maxTrailLength + 1) {
          this.previousPositions.shift();
        }
        
        this.updateRibbonGeometry();
      }
    }
  }
} 