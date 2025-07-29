# 3D Family Tree (WebGL)

## Overview
High-performance 3D visualization of family trees using WebGL. Optimized for rendering large family trees with smooth navigation.

## When to Use
- For visualizing large family trees (100+ members)
- When 3D visualization is preferred
- For presentations or interactive displays

## Key Features
- WebGL-based 3D rendering
- Smooth camera controls
- Performance optimizations for large datasets
- Basic family member interactions

## Components
- `WebGLFamilyTree.tsx` - Main 3D visualization component
- `WebGLOptimizations.tsx` - Performance optimization utilities
- `FamilyMemberForm.tsx` - Form for adding/editing members

## Dependencies
- Three.js
- @react-three/fiber
- @react-three/drei

## Usage
```typescript
import { WebGLFamilyTree } from './WebGLFamilyTree';

function App() {
  return <WebGLFamilyTree familyData={data} />;
}
```

## Related
For a more detailed 2D view with member profiles, see `../family-tree`
