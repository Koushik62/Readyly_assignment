import React, {  useCallback, useRef } from 'react';
import ReactFlow from 'react-flow-renderer';
import { MiniMap, Controls } from 'react-flow-renderer';

import { useFlow } from './FlowContext';
import ImageNode from './customNodes/ImageNode';
import CircularNode from './customNodes/CircularNode';
import CustomNodeComponent from './customNodes/CustomNodeComponent';
import IconNode from './customNodes/IconNode';
import myImage from './logo_1.png';

const FlowDiagram = () => {
  const { nodes, edges, setNodes, setEdges, history, currentHistoryIndex,
    setHistory,setCurrentHistoryIndex } = useFlow();
  const reactFlowWrapper = useRef(null);
  const nodeIdRef = useRef(nodes.length + 1);
  const pushToHistory = useCallback((newNodes, newEdges) => {
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push({ nodes: newNodes, edges: newEdges });
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  }, [history, currentHistoryIndex]);

  const addNode = useCallback((type) => {
    let newNode = {
      id: `node_${nodeIdRef.current++}`,
      type, // This directly assigns the type passed to the function
      position: { x: Math.random() * window.innerWidth * 0.5, y: Math.random() * window.innerHeight * 0.5 },
    };

    // Adjust data based on node type
    if (type === 'circular' || type === 'iconNode' || type === 'imageNode') {
      newNode.data = { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node ${nodeIdRef.current}` };
      if (type === 'imageNode') {
        newNode.data.imageUrl = myImage; // Directly use the imported image for image nodes
      }
    } else {
      // Default and other predefined types like 'input' or 'output'
      newNode.data = { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node ${nodeIdRef.current}` };
    }

    const newNodes = [...nodes, newNode];
    pushToHistory(newNodes, edges);
    setNodes(newNodes);
  }, [nodes, edges, pushToHistory]);

  const branchTracker = useRef({}); // { nodeId: { parent: parentId, branchId: "2.3.1" } });
  const circularNodesIdx = useRef(0); // Ensures unique branch IDs globally

  // Add this at component level
const convergencePoints = useRef(new Map()); // Tracks points where branches converge
const divergencePoints = useRef(new Map()); // Tracks points where branches diverge

const onConnect = useCallback(
  (params) => {
    const { source, target } = params;

    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);

    // Validate the connection
    if (shouldPreventConnection(sourceNode, targetNode, edges, nodes)) {
      return;
    }

    let updatedNodes = [...nodes];

    // Initialize branch tracking for root circular nodes
    if (!branchTracker.current[source] && sourceNode.type === 'circular') {
      branchTracker.current[source] = { parent: null, branchId: `${circularNodesIdx.current}` };
      circularNodesIdx.current += 1;
    }

    const sourceBranchId = branchTracker.current[source]?.branchId;

    // Track divergence from circular nodes
    if (sourceNode.type === 'circular') {
      if (!divergencePoints.current.has(source)) {
        divergencePoints.current.set(source, {
          parentBranch: sourceBranchId,
          childCount: 1
        });
      } else {
        const divergence = divergencePoints.current.get(source);
        divergence.childCount += 1;
      }
    }

    // Handle branch ID assignment
    let newBranchId = sourceBranchId;
    if (!branchTracker.current[target]) {
      const divergence = divergencePoints.current.get(source);
      if (divergence) {
        // This is a diverging path
        newBranchId = `${divergence.parentBranch}.${divergence.childCount}`;
      } else {
        // Check if this is a convergence point
        const incomingEdges = edges.filter(e => e.target === source);
        if (incomingEdges.length === 2 && sourceNode.type === 'circular') {
          // This is a convergence point - get the common ancestor branch
          const branch1 = branchTracker.current[incomingEdges[0].source]?.branchId;
          const branch2 = branchTracker.current[incomingEdges[1].source]?.branchId;
          if (branch1 && branch2) {
            const commonPrefix = getCommonBranchPrefix(branch1, branch2);
            newBranchId = commonPrefix;
            convergencePoints.current.set(source, commonPrefix);
          }
        }
      }

      branchTracker.current[target] = { parent: source, branchId: newBranchId };
    }

    // Update node labels
    updatedNodes = updatedNodes.map((node) => {
      if (node.id === source) {
        if (targetNode.type === 'circular') {
          return {
            ...node,
            data: {
              ...node.data,
              branch: sourceBranchId,
              label: `Parallel end ${sourceBranchId}`,
            },
          };
        }
        return {
          ...node,
          data: {
            ...node.data,
            branch: sourceBranchId,
          },
        };
      } else if (node.id === target) {
        const convergencePoint = convergencePoints.current.get(source);
        const branchToUse = convergencePoint || newBranchId;
        return {
          ...node,
          data: {
            ...node.data,
            branch: branchToUse,
          },
        };
      }
      return node;
    });

    setNodes(updatedNodes);
    setEdges((eds) => [
      ...eds,
      {
        id: `e${source}-${target}`,
        ...params,
        data: { branch: newBranchId },
      },
    ]);
  },
  [nodes, edges, setNodes, setEdges]
);

// Helper function to get common branch prefix
function getCommonBranchPrefix(branch1, branch2) {
  const parts1 = branch1.split('.');
  const parts2 = branch2.split('.');
  
  // If they don't share the same root, return the first branch
  if (parts1[0] !== parts2[0]) return branch1;
  
  // Find the point where they diverged and return the common part
  let commonParts = [];
  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] === parts2[i]) {
      commonParts.push(parts1[i]);
    } else {
      break;
    }
  }
  
  return commonParts.join('.');
}
  
  function shouldPreventConnection(sourceNode, targetNode, edges, nodes) {
    // Helper to get node's outdegree
    function getNodeOutdegree(nodeId) {
      return edges.filter(edge => edge.source === nodeId).length;
    }
    
    function getNodeIndegree(nodeId) {
      return edges.filter(edge => edge.target === nodeId).length;
    }
  
    // Updated helper to check if a node has a circular ancestor
    function hasCircularAncestor(nodeId, visited = new Set()) {
      // Prevent infinite recursion
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      
      // Get all incoming edges to this node
      const parentEdges = edges.filter(edge => edge.target === nodeId);
      
      for (const edge of parentEdges) {
        const parentNode = nodes.find(node => node.id === edge.source);
        
        // If parent is circular, we found what we're looking for
        if (parentNode?.type === 'circular') {
          return true;
        }
        
        // Recursively check parent's ancestors
        if (hasCircularAncestor(edge.source, visited)) {
          return true;
        }
      }
      
      return false;
    }
  
    // Helper to check if node is already connected to a circular node as output
    function hasCircularOutput(nodeId) {
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      return outgoingEdges.some(edge => {
        const targetNode = nodes.find(node => node.id === edge.target);
        return targetNode?.type === 'circular';
      });
    }
  
    // Rule 1: Prevent loops
    const visited = new Set();
    function hasLoop(currentId, targetId) {
      if (currentId === targetId) return true;
      if (visited.has(currentId)) return false;
      
      visited.add(currentId);
      return edges
        .filter(e => e.source === currentId)
        .some(e => hasLoop(e.target, targetId));
    }
    
    if (hasLoop(targetNode.id, sourceNode.id)) {
      alert("Cannot create a loop in the flow.");
      return true;
    }
  
    // Rule 2: Non circular node should have a single incoming edge
    if (targetNode.type !== 'circular' && getNodeIndegree(targetNode.id) > 0) {
      alert("Non-circular nodes can only have one incoming connection.");
      return true;
    }
  
    // Rule 3: Source and target cannot both be circular
    if (sourceNode.type === 'circular' && targetNode.type === 'circular') { 
      alert("Cannot connect two circular nodes.");
      return true;
    }
  
    // Rule 4: Non-circular nodes can only connect to circular nodes if they have a circular ancestor
    if (sourceNode.type !== 'circular' && targetNode.type === 'circular') {
      if (!hasCircularAncestor(sourceNode.id)) {
        alert("Node must have a circular ancestor to connect to another circular node.");
        return true;
      }
    }
  
    // Rule 5: Prevent divergence from image nodes (multiple outgoing connections)
    if (sourceNode.type === 'imageNode' && getNodeOutdegree(sourceNode.id) > 0) {
      alert("Image nodes cannot have multiple outgoing connections.");
      return true;
    }
  
    // Rule 6: If image node is already connected to a circular node as output, prevent new connections
    if (sourceNode.type === 'imageNode' && hasCircularOutput(sourceNode.id)) {
      alert("Image node is already connected to a parallel node as output.");
      return true;
    }
  
    return false;
  }
  function isEndOfParallelBranch(sourceNode, targetNode, edges) {
    // Rule 1: Check if the source node has multiple outgoing edges (parallel paths)
    const outgoingEdges = edges.filter((edge) => edge.source === sourceNode.id);
    const isParallelPath = outgoingEdges.length > 1;
  
    // Rule 2: Check if the target node is marked as circular or an endpoint
    const isEndpoint = targetNode.type === 'circular' || targetNode.data?.isEnd;
  
    // Rule 3: Ensure the target node belongs to the same branch
    const sameBranch = sourceNode.data.branch && targetNode.data.branch && sourceNode.data.branch === targetNode.data.branch;
  
    // Determine if it's the end of a parallel branch
    return isParallelPath && isEndpoint && sameBranch;
  }
  

  const onNodeDragStop = useCallback((event, node) => {
    const newNodes = nodes.map((nd) => {
      if (nd.id === node.id) {
        return {
          ...nd,
          position: node.position,
        };
      }
      return nd;
    });
    pushToHistory(newNodes, edges);
    setNodes(newNodes);
    
  }, [nodes, edges, pushToHistory]);

  // const makeNodesEquispacedAndCentered = useCallback(() => {
  //   if (!reactFlowWrapper.current) return;
  //   const spacing = 100; // Vertical spacing between nodes
  //   const containerWidth = reactFlowWrapper.current.offsetWidth;
  //   const centerX = containerWidth / 2;
  //   const updatedNodes = nodes.map((node, index) => ({
  //     ...node,
  //     position: { x: centerX - 50, y: index * spacing + 100 }
  //   }));
  //   pushToHistory(updatedNodes, edges);
  //   setNodes(updatedNodes);
  //   console.log(updatedNodes)
  // }, [nodes, edges, pushToHistory]);

  const makeNodesEquispacedAndCentered = useCallback(() => {
    if (!reactFlowWrapper.current) return;
  
    // Get container dimensions
    const containerWidth = reactFlowWrapper.current.offsetWidth;
    const containerHeight = reactFlowWrapper.current.offsetHeight;
  
    // Helper functions for tree traversal
    const getChildren = (parentId) => 
      edges
        .filter((edge) => edge.source === parentId)
        .map((edge) => nodes.find((node) => node.id === edge.target));
  
    const getParents = (nodeId) =>
      edges
        .filter((edge) => edge.target === nodeId)
        .map((edge) => nodes.find((node) => node.id === edge.source));
  
    // Calculate node dimensions including padding
    const calculateNodeDimensions = (nodes) => {
      const defaultNodeWidth = 150;  // Adjust based on your nodes
      const defaultNodeHeight = 50;
      const horizontalPadding = 50;  // Minimum space between nodes
      const verticalPadding = 75;    // Minimum space between levels
  
      return {
        nodeWidth: defaultNodeWidth + horizontalPadding,
        nodeHeight: defaultNodeHeight + verticalPadding
      };
    };
  
    // Get levels with optimized breadth-first traversal
    const getLevels = () => {
      const levels = [];
      const visited = new Set();
      
      // Find root nodes (nodes with no parents)
      let currentLevel = nodes.filter(
        (node) => !edges.some((edge) => edge.target === node.id)
      );
  
      while (currentLevel.length > 0) {
        levels.push(currentLevel);
        
        // Get next level nodes
        const nextLevel = currentLevel
          .flatMap((node) => getChildren(node.id))
          .filter((node) => node && !visited.has(node.id));
        
        // Mark current level nodes as visited
        currentLevel.forEach((node) => visited.add(node.id));
        
        currentLevel = nextLevel;
      }
  
      return levels;
    };
  
    // Calculate optimal spacing based on container and number of nodes
    const calculateOptimalSpacing = (levels) => {
      const { nodeWidth, nodeHeight } = calculateNodeDimensions(nodes);
      
      // Find the level with maximum nodes to determine horizontal spacing
      const maxNodesInLevel = Math.max(...levels.map(level => level.length));
      
      // Calculate spacing that will fit all nodes
      const horizontalSpacing = Math.min(
        Math.max(nodeWidth * 1.5, containerWidth / (maxNodesInLevel + 1)),
        containerWidth / 2
      );
      
      const verticalSpacing = Math.min(
        Math.max(nodeHeight * 1.5, containerHeight / (levels.length + 1)),
        containerHeight / 2
      );
  
      return { horizontalSpacing, verticalSpacing };
    };
  
    // Position nodes with dynamic spacing
    const positionNodes = (levels) => {
      const { horizontalSpacing, verticalSpacing } = calculateOptimalSpacing(levels);
      const updatedNodes = [];
  
      levels.forEach((levelNodes, levelIndex) => {
        const levelWidth = (levelNodes.length - 1) * horizontalSpacing;
        const startX = (containerWidth - levelWidth) / 2;
  
        levelNodes.forEach((node, nodeIndex) => {
          // Calculate base position
          let xPos = startX + nodeIndex * horizontalSpacing;
          let yPos = levelIndex * verticalSpacing;
  
          // Adjust position based on parent nodes for better alignment
          const parents = getParents(node.id);
          if (parents.length > 0) {
            const parentX = parents.reduce((sum, parent) => {
              const parentNode = updatedNodes.find(n => n.id === parent.id);
              return sum + (parentNode ? parentNode.position.x : 0);
            }, 0) / parents.length;
  
            // Weight the position between grid alignment and parent alignment
            xPos = (xPos * 0.6) + (parentX * 0.4);
          }
  
          updatedNodes.push({
            ...node,
            position: { x: xPos, y: yPos }
          });
        });
      });
  
      return updatedNodes;
    };
  
    // Execute the layout
    const levels = getLevels();
    const updatedNodes = positionNodes(levels);
    
    pushToHistory(updatedNodes, edges);
    setNodes(updatedNodes);
  }, [nodes, edges, pushToHistory]);

  const undo = useCallback(() => {
    if (currentHistoryIndex === 0) return;
    const newIndex = currentHistoryIndex - 1;
    const prevState = history[newIndex];
    setCurrentHistoryIndex(newIndex);
    setNodes(prevState.nodes);
    setEdges(prevState.edges);
  }, [history, currentHistoryIndex]);

  const redo = useCallback(() => {
    if (currentHistoryIndex >= history.length - 1) return;
    const newIndex = currentHistoryIndex + 1;
    const nextState = history[newIndex];
    setCurrentHistoryIndex(newIndex);
    setNodes(nextState.nodes);
    setEdges(nextState.edges);

  }, [history, currentHistoryIndex]);


  // React Flow setup and event handlers here
  const nodeTypes = {
    customNodeType: CustomNodeComponent,
    circular: CircularNode,
    imageNode: ImageNode,
    iconNode: IconNode,

  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ justifyContent: 'space-evenly', padding: '10px' }}>
        <button onClick={makeNodesEquispacedAndCentered}>Equispace Nodes</button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <button onClick={() => addNode('circular')}>Add Circular Node</button>
        <button onClick={() => addNode('iconNode')}>Add ICON Node</button>
        <button onClick={() => addNode('imageNode')}>Add Image Node</button>
        <button onClick={() => addNode('default')}>Add Default Node</button>
      </div>
      <div ref={reactFlowWrapper} style={{ height: '100vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeDragStop={onNodeDragStop}
        // other props
        >
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowDiagram;