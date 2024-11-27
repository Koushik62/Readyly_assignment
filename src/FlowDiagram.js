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


  const onConnect = useCallback((params) => {
    const { source, target } = params;
    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
  
    // Validate the connection
    if (shouldPreventConnection(sourceNode, targetNode, edges, nodes)) {
      return;
    }
  
    let updatedNodes = [...nodes];
    let branchId = sourceNode.data?.branch;
  
    // If connecting from a circular node, create new parallel structure
    if (sourceNode.type === 'circular' && !sourceNode.data?.branch) {
      branchId = `parallel_${source}_${Date.now()}`;
      
      // Update the circular node with branch information
      updatedNodes = updatedNodes.map(node =>
        node.id === source ? {
          ...node,
          data: {
            ...node.data,
            branch: branchId,
            isParallel: true
          }
        } : node
      );
    }
  
    // Update target node with parallel information
    if (branchId) {
      updatedNodes = updatedNodes.map(node =>
        node.id === target ? {
          ...node,
          data: {
            ...node.data,
            branch: branchId,
            isParallel: true
          }
        } : node
      );
    }
  
    // Add the edge with parallel information
    setNodes(updatedNodes);
    setEdges(eds => [...eds, {
      id: `e${source}-${target}`,
      ...params,
      data: { 
        branch: branchId,
        isParallel: true
      }
    }]);
  
  }, [nodes, edges, setNodes, setEdges]);


  
  const onConnect1 = useCallback((params) => {
    const { source, target } = params;
    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
    
    // Determine if we're starting a new branch or continuing an existing one
    if (sourceNode.type === 'circular' || sourceNode.data.branch) {
      // If the source is a circular node or already has a branch assigned, propagate or assign branch info
      const branchName = sourceNode.type === 'circular' ? `branch_${source}` : sourceNode.data.branch;

      // Assign or propagate the branch to the target node
      const updatedNodes = nodes.map(node => {
        if (node.id === target) {
          return {
            ...node,
            data: {
              ...node.data,
              branch: branchName, // Assign the branch name
            },
          };
        }
        return node;
      });

      // Update the nodes state with the new branch information
      setNodes(updatedNodes);
    }
    if (shouldPreventConnection(sourceNode, targetNode)) {
      console.error("Invalid connection between parallel nodes.");
      return;
      
    }
    // Determine if the connection is leading to the end of a parallel branch
    if (isEndOfParallelBranch(sourceNode, targetNode, edges)) {
      const updatedNodes = nodes.map(node => {
        if (node.id === sourceNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: `${node.data.label} - End of Parallel Branch`,
            },
          };
        }
        return node;
      });
    
      setNodes(updatedNodes);
    }
    setEdges((eds) => [...eds, { id: `e${params.source}-${params.target}`, ...params }]);
    console.log(nodes)
    console.log(edges)
  }, [nodes, edges, setEdges, setNodes]);

  function shouldPreventConnection(sourceNode, targetNode, edges, nodes) {
    // Helper to check if a node has any connections
    function hasConnection(nodeId, edgeType = 'both') {
      return edges.some(edge => 
        (edgeType === 'both' && (edge.source === nodeId || edge.target === nodeId)) ||
        (edgeType === 'source' && edge.source === nodeId) ||
        (edgeType === 'target' && edge.target === nodeId)
      );
    }
  
    // Helper to get all nodes in a parallel branch
    function getNodesInBranch(branchId) {
      return nodes.filter(node => node.data?.branch === branchId);
    }
  
    // Helper to check if node is a circular node
    function isCircularNode(node) {
      return node.type === 'circular';
    }
  
    // Helper to find the start circular node of a branch
    function findBranchStartNode(branchId) {
      return nodes.find(node => 
        node.data?.branch === branchId && 
        isCircularNode(node) && 
        !hasConnection(node.id, 'target')
      );
    }
  
    // Log node data for debugging
    console.log('Validating connection:', { sourceNode, targetNode });
  
    // Rule 1: Prevent circular-to-circular connections unless they're part of valid parallel flow
    if (isCircularNode(sourceNode) && isCircularNode(targetNode)) {
      const sourceBranches = edges.filter(edge => edge.source === sourceNode.id);
      const targetBranches = edges.filter(edge => edge.target === targetNode.id);
  
      // Allow connection only if both circular nodes are properly connected to parallel branches
      if (sourceBranches.length === 0 && targetBranches.length === 0) {
        alert("Circular nodes must be connected to parallel branches first.");
        return true;
      }
    }
  
    // Rule 2: Parallel branch validation
    if (sourceNode.data?.isParallel || targetNode.data?.isParallel) {
      // Find the start and end circular nodes for this parallel structure
      const branchStartNode = findBranchStartNode(sourceNode.data?.branch);
      
      if (!branchStartNode) {
        alert("Invalid parallel branch structure - missing start node.");
        return true;
      }
  
      // Check if this connection would create an invalid parallel structure
      const existingParallelPaths = edges.filter(edge => 
        edge.source === sourceNode.id || 
        edge.target === targetNode.id
      );
  
      // Prevent multiple outgoing connections from parallel branches
      if (sourceNode.data?.isParallel && hasConnection(sourceNode.id, 'source')) {
        alert("Parallel branch nodes can only have one outgoing connection.");
        return true;
      }
  
      // Prevent multiple incoming connections to parallel branches
      if (targetNode.data?.isParallel && hasConnection(targetNode.id, 'target')) {
        alert("Parallel branch nodes can only have one incoming connection.");
        return true;
      }
    }
  
    // Rule 3: Prevent loops
    const createsLoop = edges.some(
      edge => edge.source === targetNode.id && edge.target === sourceNode.id
    );
    if (createsLoop) {
      alert("Cannot create a loop in the flow.");
      return true;
    }
  
    // Rule 4: Branch integrity
    if (sourceNode.data?.branch && targetNode.data?.branch && 
        sourceNode.data.branch !== targetNode.data.branch) {
      alert("Cannot connect nodes from different branches.");
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
  
    const spacingX = 200; // Horizontal spacing between child nodes
    const spacingY = 250; // Vertical spacing between levels
    const containerWidth = reactFlowWrapper.current.offsetWidth;
    const centerX = containerWidth / 2;
  
    // Helper function to get children of a node
    const getChildren = (parentId) => {
      return edges
        .filter((edge) => edge.source === parentId)
        .map((edge) => nodes.find((node) => node.id === edge.target));
    };
  
    // Recursive function to position nodes
    const positionNode = (node, level, xOffset) => {
      const children = getChildren(node.id);
      const numChildren = children.length;
  
      // Calculate position for current node
      const nodeX = centerX + xOffset;
      const nodeY = level * spacingY;
  
      updatedNodes.push({
        ...node,
        position: { x: nodeX, y: nodeY },
      });
  
      if (numChildren > 0) {
        // Calculate total width required for children
        const totalWidth = (numChildren - 1) * spacingX;
  
        // Recursively position children
        children.forEach((child, index) => {
          const childOffset = xOffset + index * spacingX - totalWidth / 2;
          positionNode(child, level + 1, childOffset);
        });
      }
    };
  
    const updatedNodes = [];
    const rootNodes = nodes.filter(
      (node) => !edges.some((edge) => edge.target === node.id)
    );
  
    // Position all root nodes and their children
    rootNodes.forEach((rootNode, index) => {
      positionNode(rootNode, 0, (index - rootNodes.length / 2) * spacingX * 2);
    });
  
    pushToHistory(updatedNodes, edges);
    setNodes(updatedNodes);
    console.log(updatedNodes);
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