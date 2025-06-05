# 3D Vehicle Simulation Game

A modern 3D flying vehicle shooting game built with the latest Three.js (r160) using ES6 modules.

## 🚀 Features

### 🛸 Vehicle System
- **Advanced Flight Physics**: Realistic 6-DOF (6 Degrees of Freedom) flight controls
- **Dual View Modes**: Seamless switching between 1st person and 3rd person views
- **Dynamic Engine Effects**: Visual engine glow effects that respond to thrust input
- **Smooth Camera System**: Intelligent camera following with smooth interpolation

### 🎯 Combat System
- **Machine Gun**: High-rate-of-fire weapon system
- **Smart Targeting**: Visual targeting system with range and angle detection
- **Destructible Targets**: 10 randomly placed targets with explosion effects
- **Particle Effects**: Dynamic explosion animations with physics

### 🌍 Environment
- **Procedural Terrain**: Complex multi-octave noise-generated landscape
- **Dynamic Water System**: Flowing rivers with animated water surfaces
- **Volumetric Clouds**: Realistic 3D cloud clusters with movement
- **Advanced Lighting**: Directional shadows and ambient lighting

### 🎮 Controls

#### Camera (3rd Person)
- **Mouse Drag**: Rotate camera
- **Mouse Wheel**: Zoom in/out
- **Right Click + Drag**: Pan camera

#### Vehicle Controls
- **V**: Toggle 1st/3rd person view
- **W/↑**: Pitch up (nose up)
- **S/↓**: Pitch down (nose down)
- **A/←**: Yaw left (turn left)
- **D/→**: Yaw right (turn right)
- **Q**: Roll left
- **E**: Roll right
- **Shift**: Accelerate (engine thrust)
- **Ctrl**: Decelerate/Reverse
- **Space**: Ascend
- **X**: Descend

#### Combat
- **P**: Fire machine gun
- **Left Mouse Click**: Fire machine gun

#### 1st Person Mode
- **Mouse**: Look around (with pointer lock)
- All vehicle controls remain the same

## 🛠 Technical Implementation

### Modern Three.js Architecture
- **ES6 Modules**: Latest import/export syntax
- **Three.js r160**: Most recent stable version
- **Import Maps**: Browser-native module resolution
- **Modern Material System**: Updated material type checking
- **Optimized Geometry Updates**: Efficient vertex buffer management

### Performance Features
- **Efficient Rendering**: Optimized draw calls and geometry updates
- **Memory Management**: Proper cleanup and disposal
- **Smooth Animations**: 60fps target with delta time calculations
- **Responsive Design**: Automatic window resize handling

## 🚀 Getting Started

### Prerequisites
- Modern web browser with ES6 module support
- Node.js (for development server)

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd test2
   ```

2. **Start development server**
   ```bash
   npx serve . -p 3000
   ```

3. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
test2/
├── index.html          # Main HTML file with ES6 module setup
├── terrain.js          # Main game logic with modern Three.js
├── README.md          # This file
└── .git/              # Git repository
```

## 🔧 Code Architecture

### ES6 Module System
```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
```

### Modern Three.js Patterns
- **Material Type Checking**: `material.isMeshPhongMaterial`
- **Geometry Updates**: `computeBoundingBox()`, `computeBoundingSphere()`
- **Event Handling**: `DOMContentLoaded` instead of `window.load`
- **Import Maps**: Browser-native module resolution

### Game Systems
- **Physics Engine**: Custom 6-DOF flight dynamics
- **Collision Detection**: Sphere-based bullet-target collision
- **Particle System**: Custom explosion effects
- **Terrain Generation**: Multi-octave Perlin noise
- **Water Simulation**: Vertex-based wave animation

## 🎯 Gameplay

1. **Take Off**: Use Shift to accelerate and Space to gain altitude
2. **Navigate**: Use WASD for directional control, QE for rolling
3. **Switch Views**: Press V to toggle between 1st and 3rd person
4. **Target Practice**: Green glowing targets indicate they're in range
5. **Shoot**: Use P key or left mouse click to fire
6. **Survive**: Avoid crashing into terrain (minimum altitude enforced)

## 🔄 Recent Updates

### v2.0 - Modern Three.js Implementation
- ✅ Upgraded to Three.js r160
- ✅ Implemented ES6 module system
- ✅ Added Import Maps for module resolution
- ✅ Modernized material type checking
- ✅ Improved geometry update methods
- ✅ Enhanced DOM loading patterns

### v1.0 - Core Game Features
- ✅ 3D flying vehicle with realistic physics
- ✅ Dual camera system (1st/3rd person)
- ✅ Machine gun shooting mechanics
- ✅ Target system with visual feedback
- ✅ Procedural terrain and water
- ✅ Particle explosion effects
- ✅ Engine glow effects

## 🐛 Known Issues

- None currently reported

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ using Three.js r160 and modern web technologies** 