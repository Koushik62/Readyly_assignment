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
    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);
  
    let updatedNodes = [...nodes]; // Clone the current nodes array
  
    // Check if the source node is circular, indicating the potential start of a new branch
    // Or if the source node already belongs to a branch
    if (sourceNode.type === 'circular' || sourceNode.data.branch) {
      let branchName;
  
      // If the source node is circular and starting a new branch
      if (sourceNode.type === 'circular') {
        branchName = `branch_${source}`;
        // Also, update the source node to mark it as the start of a new branch if necessary
        updatedNodes = updatedNodes.map(node => node.id === source ? { ...node, data: { ...node.data, branch: branchName }} : node);
      } else {
        // Propagate the existing branch name from the source node
        branchName = sourceNode.data.branch;
      }
  
      // Assign or propagate the branch to the target node
      updatedNodes = updatedNodes.map(node => {
        if (node.id === target && (!targetNode.data.branch || targetNode.data.branch !== branchName)) {
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
  
    // Proceed with adding the edge if the connection is valid
    setEdges(eds => [...eds, { id: `e${source}-${target}`, ...params }]);
    console.log(nodes)
  }, [nodes, edges, setEdges, setNodes]);
  
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
    if (isEndOfParallelBranch(sourceNode, targetNode)) {
      // Update the label of the source node or perform any action as needed
      const updatedNodes = nodes.map(node => {
        if (node.id === source) {
          return {
            ...node,
            data: {
              ...node.data,
              label: `${node.data.label} - End of Parallel Branch`
            }
          };
        }
        return node;
      });

      // Update nodes state
      setNodes(updatedNodes);
    }
    setEdges((eds) => [...eds, { id: `e${params.source}-${params.target}`, ...params }]);
    console.log(nodes)
    console.log(edges)
  }, [nodes, edges, setEdges, setNodes]);

  function shouldPreventConnection(sourceNode, targetNode) {
    // Rule 1: Prevent direct connections between circular nodes
    if (sourceNode.type === 'circular' && targetNode.type === 'circular') {
      alert("Can't connect two circular nodes.....")
      return true;
    }
    const sourceBranch = sourceNode.data.branch; // Assuming 'branch' is a property indicating the node's branch
    const targetBranch = targetNode.data.branch;

    // Check if both branches are defined before comparing them
    if (sourceBranch && targetBranch && sourceBranch !== targetBranch) {
      alert(`Cannot connect nodes from different branches: ${sourceBranch} to ${targetBranch}`);
      return true; // Prevents connecting nodes from different branches
    }


  // Rule 2: Optionally, prevent connecting back to a node that's already in the path
  // This requires checking the edges to see if making this connection creates a loop
  const createsLoop = edges.some(edge => edge.source === targetNode.id && edge.target === sourceNode.id);
  if (createsLoop) {
    return true;
  }

    // Example: Prevent connecting if both nodes are of a specific type that shouldn't be connected
    // Adjust the logic as necessary
    return false; // Placeholder logic
  }
  
  // Helper function to check if this connection marks the end of a parallel branch
  function isEndOfParallelBranch(sourceNode, targetNode) {
    // Implement your logic to determine if the target node marks the end of a parallel branch
    // This could be based on the node types, positions, or other properties
    return targetNode.type === 'circular'; // Example condition
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

  const makeNodesEquispacedAndCentered = useCallback(() => {
    if (!reactFlowWrapper.current) return;
    const spacing = 100; // Vertical spacing between nodes
    const containerWidth = reactFlowWrapper.current.offsetWidth;
    const centerX = containerWidth / 2;
    const updatedNodes = nodes.map((node, index) => ({
      ...node,
      position: { x: centerX - 50, y: index * spacing + 100 }
    }));
    pushToHistory(updatedNodes, edges);
    setNodes(updatedNodes);
    console.log(updatedNodes)
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
