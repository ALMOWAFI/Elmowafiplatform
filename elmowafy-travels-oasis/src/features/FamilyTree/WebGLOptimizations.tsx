import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fps = useRef(60);

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    
    if (now - lastTime.current >= 1000) {
      fps.current = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return fps.current;
};

// Level of Detail (LOD) system for family nodes
export const useLevelOfDetail = (position: THREE.Vector3, camera: THREE.Camera) => {
  return useMemo(() => {
    const distance = position.distanceTo(camera.position);
    
    if (distance < 10) return 'high';
    if (distance < 25) return 'medium';
    return 'low';
  }, [position, camera.position]);
};

// Instanced rendering for multiple similar objects
export const InstancedFamilyNodes: React.FC<{
  positions: THREE.Vector3[];
  colors: string[];
  scales: number[];
}> = ({ positions, colors, scales }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const colorArray = useMemo(() => {
    const array = new Float32Array(positions.length * 3);
    colors.forEach((color, i) => {
      const c = new THREE.Color(color);
      array[i * 3] = c.r;
      array[i * 3 + 1] = c.g;
      array[i * 3 + 2] = c.b;
    });
    return array;
  }, [colors]);

  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();
    
    positions.forEach((position, i) => {
      dummy.position.copy(position);
      dummy.scale.setScalar(scales[i]);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, scales]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
        />
      </meshStandardMaterial>
    </instancedMesh>
  );
};

// Optimized connection lines using BufferGeometry
export const OptimizedConnectionLines: React.FC<{
  connections: Array<{ from: THREE.Vector3; to: THREE.Vector3; color: string }>;
}> = ({ connections }) => {
  const geometry = useMemo(() => {
    const positions = new Float32Array(connections.length * 6); // 2 points * 3 coordinates
    const colors = new Float32Array(connections.length * 6); // 2 points * 3 color components
    
    connections.forEach((connection, i) => {
      const startIndex = i * 6;
      
      // Positions
      positions[startIndex] = connection.from.x;
      positions[startIndex + 1] = connection.from.y;
      positions[startIndex + 2] = connection.from.z;
      positions[startIndex + 3] = connection.to.x;
      positions[startIndex + 4] = connection.to.y;
      positions[startIndex + 5] = connection.to.z;
      
      // Colors
      const color = new THREE.Color(connection.color);
      colors[startIndex] = color.r;
      colors[startIndex + 1] = color.g;
      colors[startIndex + 2] = color.b;
      colors[startIndex + 3] = color.r;
      colors[startIndex + 4] = color.g;
      colors[startIndex + 5] = color.b;
    });
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geo;
  }, [connections]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.7} />
    </lineSegments>
  );
};

// Frustum culling for family nodes
export const useFrustumCulling = (
  objects: Array<{ position: THREE.Vector3; id: string }>,
  camera: THREE.Camera
) => {
  return useMemo(() => {
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);

    return objects.filter(obj => {
      const sphere = new THREE.Sphere(obj.position, 1);
      return frustum.intersectsSphere(sphere);
    });
  }, [objects, camera]);
};

// Dynamic LOD geometry based on distance
export const DynamicLODGeometry: React.FC<{
  position: THREE.Vector3;
  cameraPosition: THREE.Vector3;
  type: 'sphere' | 'box';
}> = ({ position, cameraPosition, type }) => {
  const distance = position.distanceTo(cameraPosition);
  
  const getGeometry = () => {
    if (distance < 15) {
      // High detail
      return type === 'sphere' ? 
        <sphereGeometry args={[0.5, 32, 32]} /> : 
        <boxGeometry args={[1, 1, 1]} />;
    } else if (distance < 30) {
      // Medium detail
      return type === 'sphere' ? 
        <sphereGeometry args={[0.5, 16, 16]} /> : 
        <boxGeometry args={[1, 1, 1]} />;
    } else {
      // Low detail
      return type === 'sphere' ? 
        <sphereGeometry args={[0.5, 8, 8]} /> : 
        <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return getGeometry();
};

// Performance monitor component
export const PerformanceMonitor: React.FC = () => {
  const fps = usePerformanceMonitor();
  
  return (
    <div className="absolute top-4 left-4 z-50 bg-black/70 text-white p-2 rounded text-sm">
      <div>FPS: {fps}</div>
      <div className={`w-2 h-2 rounded-full ${
        fps > 50 ? 'bg-green-500' : fps > 30 ? 'bg-yellow-500' : 'bg-red-500'
      }`}></div>
    </div>
  );
};

// WebGL capabilities detector
export const useWebGLCapabilities = () => {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      return { supported: false, version: 'none' };
    }
    
    const capabilities = {
      supported: true,
      version: gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl1',
      maxTextures: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      maxVertexTextures: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      extensions: gl.getSupportedExtensions() || []
    };
    
    return capabilities;
  }, []);
};

// Adaptive quality settings based on performance
export const useAdaptiveQuality = () => {
  const fps = usePerformanceMonitor();
  const capabilities = useWebGLCapabilities();
  
  return useMemo(() => {
    let quality = 'high';
    
    if (fps < 30 || !capabilities.supported) {
      quality = 'low';
    } else if (fps < 45) {
      quality = 'medium';
    }
    
    return {
      quality,
      particleCount: quality === 'high' ? 100 : quality === 'medium' ? 50 : 20,
      shadowsEnabled: quality === 'high',
      postProcessingEnabled: quality === 'high',
      instancedRenderingEnabled: capabilities.supported,
      maxRenderDistance: quality === 'high' ? 100 : quality === 'medium' ? 50 : 25
    };
  }, [fps, capabilities]);
};

// Memory management for large family trees
export const useMemoryOptimization = (maxNodes: number = 1000) => {
  const nodePool = useRef<THREE.Object3D[]>([]);
  const activeNodes = useRef<Set<string>>(new Set());
  
  const getNode = (id: string) => {
    if (activeNodes.current.size >= maxNodes) {
      // Reuse oldest node
      const oldest = Array.from(activeNodes.current)[0];
      activeNodes.current.delete(oldest);
    }
    
    activeNodes.current.add(id);
    
    if (nodePool.current.length > 0) {
      return nodePool.current.pop()!;
    }
    
    return new THREE.Object3D();
  };
  
  const releaseNode = (id: string, node: THREE.Object3D) => {
    activeNodes.current.delete(id);
    nodePool.current.push(node);
  };
  
  return { getNode, releaseNode };
};

export default {
  usePerformanceMonitor,
  useLevelOfDetail,
  InstancedFamilyNodes,
  OptimizedConnectionLines,
  useFrustumCulling,
  DynamicLODGeometry,
  PerformanceMonitor,
  useWebGLCapabilities,
  useAdaptiveQuality,
  useMemoryOptimization
}; 