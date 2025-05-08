# PhotoMuseum - WebGL Photography Portfolio

An interactive 3D virtual museum for displaying photography portfolios, built with Three.js and WebGL.

## Features

- Immersive 3D museum environment with realistic lighting and shadows
- Navigate the space as a floating orb of light that leaves a trail
- Interactive photo exhibits with frames and information displays
- Fullscreen photo viewing mode
- Responsive design for both desktop and mobile
- Loading screen with progress indicator

## Technologies

- Three.js for 3D rendering
- WebGL for hardware-accelerated graphics
- Custom GLSL shaders for advanced visual effects
- Vite for fast development and bundling

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/photo-museum.git
   cd photo-museum
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Controls

- **Move**: WASD or Arrow Keys
- **Look around**: Mouse movement
- **Zoom**: Mouse wheel
- **Interact with photos**: Click on a frame

## Customization

### Adding Your Own Photos

1. Place your photos in the `public/images` directory
2. Edit the photos array in `src/js/main.js` to include your images:
   ```javascript
   this.photos = [
     {
       id: 'unique-id',
       title: 'Photo Title',
       description: 'Description of the photo',
       metadata: 'f/8 | 1/125s | ISO 100 | 24mm',
       path: '/images/your-photo.jpg',
       position: new THREE.Vector3(x, y, z),
       rotation: new THREE.Euler(x, y, z)
     },
     // Add more photos here
   ];
   ```

### Customizing the Museum

The museum layout, materials, and lighting can be customized in `src/js/Museum.js`.

## Building for Production

To build for production, run:

```
npm run build
```

The built files will be in the `dist` directory, ready to be deployed to any static web host.

## Future Enhancements

- Multi-user exploration with WebSockets
- Physics-based interactions
- Audio ambience and immersive sound effects
- Dynamic content loading from external APIs
- VR support with WebXR

## License

MIT

## Acknowledgments

- Built with Three.js (https://threejs.org/)
- Inspired by virtual museum exhibits and photography galleries