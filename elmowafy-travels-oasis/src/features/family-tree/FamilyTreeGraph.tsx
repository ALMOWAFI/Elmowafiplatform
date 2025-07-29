import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { FamilyMember, FamilyConnection, FamilyTreeLayoutOptions } from './types';
import { FamilyMemberNode } from './FamilyMemberNode';
import { FamilyConnectionLine } from './FamilyConnectionLine';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FamilyTreeGraphProps {
  members: FamilyMember[];
  connections: FamilyConnection[];
  layoutOptions: FamilyTreeLayoutOptions;
  onMemberSelect: (id: string) => void;
  onMemberExpand: (id: string) => void;
  selectedMemberId?: string;
  className?: string;
}

/**
 * Interactive D3-powered family tree visualization component
 */
export const FamilyTreeGraph: React.FC<FamilyTreeGraphProps> = ({
  members,
  connections,
  layoutOptions,
  onMemberSelect,
  onMemberExpand,
  selectedMemberId,
  className
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  
  // Calculate tree layout using D3's tree layout algorithm
  const treeData = React.useMemo(() => {
    // Create a root node (virtual node if there's not a single root)
    const rootMembers = members.filter(m => 
      !m.parentIds || m.parentIds.length === 0
    );
    
    if (rootMembers.length === 0) return null;
    
    // Use d3 hierarchy to build the tree
    const rootNode = d3.hierarchy(
      { id: 'root', children: rootMembers },
      d => {
        // Get children for this node
        if (d.id === 'root') return d.children;
        
        // Find the actual member
        const member = members.find(m => m.id === d.id);
        if (!member || !member.childrenIds || !member.expanded) return [];
        
        // Return the actual children objects
        return member.childrenIds
          .map(id => members.find(m => m.id === id))
          .filter(Boolean);
      }
    );
    
    // Calculate the layout
    const treeLayout = d3.tree<any>()
      .nodeSize([
        layoutOptions.orientation === 'horizontal' 
          ? layoutOptions.nodeSize + layoutOptions.nodePadding 
          : layoutOptions.nodeSize,
        layoutOptions.orientation === 'vertical' 
          ? layoutOptions.nodeSize + layoutOptions.nodePadding 
          : layoutOptions.nodeSize
      ])
      .separation((a, b) => a.parent === b.parent ? 1.2 : 1.8);
    
    // Apply the layout
    treeLayout(rootNode);
    
    return rootNode;
  }, [members, layoutOptions]);
  
  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };
  
  // Handle panning/dragging
  const handleDragStart = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };
  
  const handleDragMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Reset the view
  const handleResetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };
  
  // Update dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const { width, height } = svgRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Render connections based on visualization type
  const renderConnections = () => {
    if (!treeData) return null;
    
    // First, render the tree connections
    const treeConnections = treeData.links().map(link => {
      if (!link.source.data.id || !link.target.data.id) return null;
      if (link.source.data.id === 'root') return null;
      
      const sourceX = layoutOptions.orientation === 'horizontal' ? link.source.y : link.source.x;
      const sourceY = layoutOptions.orientation === 'horizontal' ? link.source.x : link.source.y;
      const targetX = layoutOptions.orientation === 'horizontal' ? link.target.y : link.target.x;
      const targetY = layoutOptions.orientation === 'horizontal' ? link.target.x : link.target.y;
      
      return (
        <FamilyConnectionLine
          key={`tree-${link.source.data.id}-${link.target.data.id}`}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          type="parent-child"
          isHighlighted={
            selectedMemberId === link.source.data.id || 
            selectedMemberId === link.target.data.id
          }
        />
      );
    });
    
    // Then, render the spouse connections
    const spouseConnections = connections
      .filter(conn => conn.type === 'spouse' && conn.isExpanded)
      .map(conn => {
        const sourceMember = treeData.descendants().find(d => d.data.id === conn.sourceId);
        const targetMember = treeData.descendants().find(d => d.data.id === conn.targetId);
        
        if (!sourceMember || !targetMember) return null;
        
        const sourceX = layoutOptions.orientation === 'horizontal' ? sourceMember.y : sourceMember.x;
        const sourceY = layoutOptions.orientation === 'horizontal' ? sourceMember.x : sourceMember.y;
        const targetX = layoutOptions.orientation === 'horizontal' ? targetMember.y : targetMember.x;
        const targetY = layoutOptions.orientation === 'horizontal' ? targetMember.x : targetMember.y;
        
        return (
          <FamilyConnectionLine
            key={`spouse-${conn.sourceId}-${conn.targetId}`}
            sourceX={sourceX}
            sourceY={sourceY}
            targetX={targetX}
            targetY={targetY}
            type="spouse"
            isHighlighted={
              selectedMemberId === conn.sourceId || 
              selectedMemberId === conn.targetId
            }
          />
        );
      });
    
    return (
      <>
        {treeConnections}
        {spouseConnections}
      </>
    );
  };
  
  // Render family member nodes
  const renderNodes = () => {
    if (!treeData) return null;
    
    return treeData.descendants().map(node => {
      if (node.data.id === 'root') return null;
      
      const member = members.find(m => m.id === node.data.id);
      if (!member) return null;
      
      const x = layoutOptions.orientation === 'horizontal' ? node.y : node.x;
      const y = layoutOptions.orientation === 'horizontal' ? node.x : node.y;
      
      return (
        <FamilyMemberNode
          key={member.id}
          member={member}
          x={x}
          y={y}
          isExpanded={member.expanded || false}
          isHighlighted={selectedMemberId === member.id}
          isSearchResult={layoutOptions.searchQuery ? 
            member.name.toLowerCase().includes(layoutOptions.searchQuery.toLowerCase()) ||
            member.arabicName.toLowerCase().includes(layoutOptions.searchQuery.toLowerCase())
            : false
          }
          isRoot={!member.parentIds || member.parentIds.length === 0}
          onExpand={() => onMemberExpand(member.id)}
          onSelect={() => onMemberSelect(member.id)}
          layoutOptions={layoutOptions}
        />
      );
    });
  };
  
  return (
    <div className={cn("relative w-full h-[600px] overflow-hidden bg-background/50 rounded-xl border", 
      isDragging ? "cursor-grabbing" : "cursor-grab", className)}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <g
          transform={`translate(${position.x + dimensions.width / 2}, ${position.y + dimensions.height / 3}) scale(${zoom})`}
        >
          {/* Render connections first (so they're behind the nodes) */}
          {renderConnections()}
          
          {/* Render nodes on top */}
          {renderNodes()}
        </g>
      </svg>
      
      {/* Zoom controls */}
      <div className={`absolute bottom-4 ${isArabic ? 'left-4' : 'right-4'} flex flex-col gap-2`}>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleZoomIn}
          title={isArabic ? 'تكبير' : 'Zoom In'}
        >
          <ZoomIn size={16} />
        </Button>
        
        <Button
          size="icon"
          variant="outline" 
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleZoomOut}
          title={isArabic ? 'تصغير' : 'Zoom Out'}
        >
          <ZoomOut size={16} />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleResetView}
          title={isArabic ? 'إعادة ضبط العرض' : 'Reset View'}
        >
          <RefreshCw size={16} />
        </Button>
      </div>
    </div>
  );
};
