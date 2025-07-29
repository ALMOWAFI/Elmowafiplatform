# 2D Family Tree

## Overview
Interactive 2D family tree with detailed member profiles and rich interactions. Built with React Flow for flexible visualization.

## When to Use
- For detailed family member information
- When rich interactions are needed
- For administrative tasks (editing, adding members)
- When a traditional family tree layout is preferred

## Key Features
- Interactive 2D graph layout
- Detailed member profiles
- Rich relationship visualization
- Support for complex family structures
- Built-in editing capabilities

## Components
- `FamilyTreeGraph.tsx` - Main graph component
- `FamilyMemberNode.tsx` - Individual member nodes
- `FamilyMemberProfile.tsx` - Detailed member information
- `FamilyConnectionLine.tsx` - Custom connection lines

## Data Structure
See `types.ts` for the complete data structure.

## Usage
```typescript
import { FamilyTree } from './FamilyTreeGraph';

function App() {
  return <FamilyTree members={members} relationships={relationships} />;
}
```

## Related
For a 3D visualization, see `../FamilyTree`

## Development
- Uses React Flow for graph visualization
- State management with React Context
- Responsive design for all screen sizes
