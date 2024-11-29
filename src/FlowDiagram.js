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
  
      // Determine the source node's branch ID
      if (!branchTracker.current[source] && sourceNode.type === 'circular') {
        // If source node has no branch, assign it a root branch
        branchTracker.current[source] = { parent: null, branchId: `${circularNodesIdx.current}` };
        circularNodesIdx.current+=1;
      }
  
      const sourceBranchId = branchTracker.current[source].branchId;
  
      // Construct the target node's branch ID based on the source
      let newBranchId = sourceBranchId;
      if (!branchTracker.current[target]) {
        // Count children of the source to determine the next number in the hierarchy
        const siblingCount = Object.values(branchTracker.current).filter(
          (entry) => entry.parent === source
        ).length;
  
        newBranchId = `${sourceBranchId}.${siblingCount + 1}`;
  
        // Assign the new branch ID and track the parent-child relationship
        branchTracker.current[target] = { parent: source, branchId: newBranchId };
      }
  
      // Update the source and target node labels
      updatedNodes = updatedNodes.map((node) => {
        if (node.id === source) {
          if(targetNode.type === 'circular'){
            return {
              ...node,
              data: {
                ...node.data,
                branch: `${sourceBranchId}`,
                label: `Parallel end ${sourceBranchId}`,
              },
            };
          }
          return {
            ...node,
            data: {
              ...node.data,
              branch: `${sourceBranchId}`,
            },
          };
        } else if (node.id === target) {
          return {
            ...node,
            data: {
              ...node.data,
              branch: `${newBranchId}`, // Update target node label
            },
          };
        }
        return node;
      });
  
      // Add the new edge
      setNodes(updatedNodes);
      setEdges((eds) => [
        ...eds,
        {
          id: `e${source}-${target}`,
          ...params,
          data: { branch: newBranchId },
        },
      ]);
  
      console.log("Branch Tracker:", branchTracker.current); // Debugging output
    },
    [nodes, edges, setNodes, setEdges]
  );
  
  function shouldPreventConnection(sourceNode, targetNode, edges, nodes) {
    // Helper to get node's outdegree only since we don't need indegree
    function getNodeOutdegree(nodeId) {
      return edges.filter(edge => edge.source === nodeId).length;
    }
    function getNodeIndegree(nodeId) {
      return edges.filter(edge => edge.target === nodeId).length;
    }
    // Helper to get branch hierarchy level (e.g., 1.1, 1.1.1)
    function getBranchLevel(nodeId) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node?.data?.branch) return null;
      
      let level = 1;
      let currentNode = node;
      let visited = new Set();
      
      while (currentNode && !visited.has(currentNode.id)) {
        visited.add(currentNode.id);
        const parentEdge = edges.find(e => e.target === currentNode.id);
        if (parentEdge) {
          const parentNode = nodes.find(n => n.id === parentEdge.source);
          if (parentNode?.type === 'circular') level++;
          currentNode = parentNode;
        } else {
          break;
        }
      }
      return level;
    }
  
    // // Helper to check if nodes are in the same parallel branch
    // function areInSameBranch(node1Id, node2Id) {
    //   const node1 = nodes.find(n => n.id === node1Id);
    //   const node2 = nodes.find(n => n.id === node2Id);
      
    //   if (!node1?.data?.branch || !node2?.data?.branch) return false;
    //   return node1.data.branch === node2.data.branch;
    // }
  
    // Helper to check if target node already has connections
    // function hasExistingConnections(nodeId) {
    //   return edges.some(edge => edge.target === nodeId);
    // }

    // Rule 1: Prevent loops (Moved this check to be first)
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

    // Rule 3: Source and target cannot be circular
    if (sourceNode.type === 'circular' && targetNode.type === 'circular') { 
      alert("Cannot connect two circular nodes.");
      return true;
    }
  

    // if (sourceNode.type === 'circular') {
    //   // For circular nodes, ensure target isn't already connected from a different branch
    //   if (hasExistingConnections(targetNode.id) && !areInSameBranch(sourceNode.id, targetNode.id)) {
    //     alert("Target node already has a connection from a different branch.");
    //     return true;
    //   }
    // } 
    // else {
    //   // Non-circular nodes can only have one outgoing connection
    //   if (getNodeOutdegree(sourceNode.id) > 0) {
    //     alert("Parallel branches can't be connected.");
    //     return true;
    //   }
    // }
  
    // Rule 3: Branch hierarchy validation
    const sourceLevel = getBranchLevel(sourceNode.id);
    const targetLevel = getBranchLevel(targetNode.id);
    
    // if (sourceLevel && targetLevel) {
    //   if (sourceLevel !== targetLevel && targetNode.type !== 'circular') {
    //     alert("Cannot connect nodes from different branch levels.");
    //     return true;
    //   }
    // }
  
    // Rule 4: Convergence point validation
    // if (targetNode.type === 'circular') {
    //   const incomingNodes = edges
    //     .filter(e => e.target === targetNode.id)
    //     .map(e => nodes.find(n => n.id === e.source));
      
    //   if (incomingNodes.length > 0) {
    //     const firstBranch = incomingNodes[0]?.data?.branch;
    //     if (!incomingNodes.every(n => n?.data?.branch === firstBranch)) {
    //       alert("All incoming connections to a convergence point must be from the same branch.");
    //       return true;
    //     }
    //   }
    // }
  
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
  
    const spacingX = 200;
    const spacingY = 250;
    const containerWidth = reactFlowWrapper.current.offsetWidth;
    const centerX = containerWidth / 2;
  
    // Helper function to get children of a node
    const getChildren = (parentId) => {
      return edges
        .filter((edge) => edge.source === parentId)
        .map((edge) => nodes.find((node) => node.id === edge.target));
    };

    // Helper function to get parents of a node
    const getParents = (nodeId) => {
      return edges
        .filter((edge) => edge.target === nodeId)
        .map((edge) => nodes.find((node) => node.id === edge.source));
    };
  
    const updatedNodes = [];
    
    // Find nodes at each level
    const getLevels = () => {
      const levels = [];
      let currentNodes = nodes.filter(
        (node) => !edges.some((edge) => edge.target === node.id)
      );
      
      while (currentNodes.length > 0) {
        levels.push(currentNodes);
        currentNodes = currentNodes
          .flatMap((node) => getChildren(node.id))
          .filter((node, index, self) => 
            self.findIndex(n => n.id === node.id) === index
          );
      }
      return levels;
    };

    const levels = getLevels();
    
    // Position nodes level by level
    levels.forEach((levelNodes, levelIndex) => {
      const levelWidth = (levelNodes.length - 1) * spacingX;
      const startX = centerX - levelWidth / 2;
      
      levelNodes.forEach((node, nodeIndex) => {
        updatedNodes.push({
          ...node,
          position: {
            x: startX + nodeIndex * spacingX,
            y: levelIndex * spacingY
          }
        });
      });
    });
  
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