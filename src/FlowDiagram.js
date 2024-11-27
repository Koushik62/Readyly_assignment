import React, { useCallback, useRef } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background,
  MarkerType 
} from 'react-flow-renderer';

import { useFlow } from './FlowContext';
import ImageNode from './customNodes/ImageNode';
import CircularNode from './customNodes/CircularNode';
import CustomNodeComponent from './customNodes/CustomNodeComponent';
import IconNode from './customNodes/IconNode';
import myImage from './logo_1.png';

const FlowDiagram = () => {
  const { 
    nodes, 
    edges, 
    setNodes, 
    setEdges, 
    history, 
    currentHistoryIndex,
    setHistory,
    setCurrentHistoryIndex 
  } = useFlow();
  
  const reactFlowWrapper = useRef(null);
  const nodeIdRef = useRef(nodes.length + 1);

  const pushToHistory = useCallback((newNodes, newEdges) => {
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push({ nodes: newNodes, edges: newEdges });
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  }, [history, currentHistoryIndex]);

  const addNode = useCallback((type) => {
    const newId = `node_${nodeIdRef.current++}`;
    let newNode = {
      id: newId,
      type,
      position: { 
        x: Math.random() * window.innerWidth * 0.5, 
        y: Math.random() * window.innerHeight * 0.5 
      },
      data: { 
        label: `${type === 'circular' ? 'Branch' : 'Node'} ${nodeIdRef.current}`,
        parallelBranch: null,
        isParallelEnd: false
      },
      style: {
        border: '1px solid #ddd',
        padding: 10,
        borderRadius: type === 'circular' ? '50%' : '3px',
        backgroundColor: type === 'circular' ? '#e6e6e6' : '#ffffff'
      }
    };

    if (type === 'imageNode') {
      newNode.data.imageUrl = myImage;
    }

    const newNodes = [...nodes, newNode];
    pushToHistory(newNodes, edges);
    setNodes(newNodes);
  }, [nodes, edges, pushToHistory]);

  const getParallelBranches = useCallback(() => {
    const branches = new Map();
    nodes.forEach(node => {
      if (node.type === 'circular') {
        const outgoingEdges = edges.filter(edge => edge.source === node.id);
        if (outgoingEdges.length > 0) {
          branches.set(node.id, outgoingEdges.map(edge => edge.target));
        }
      }
    });
    return branches;
  }, [nodes, edges]);

  const shouldPreventConnection = useCallback((sourceNode, targetNode) => {
    // Prevent connections to circular nodes except from the top level
    if (targetNode.type === 'circular' && sourceNode.data.parallelBranch) {
      alert("Cannot connect to a parallel branch node from within a branch");
      return true;
    }

    // Prevent cross-branch connections
    if (sourceNode.data.parallelBranch && 
        targetNode.data.parallelBranch && 
        sourceNode.data.parallelBranch !== targetNode.data.parallelBranch) {
      alert("Cannot connect nodes from different parallel branches");
      return true;
    }

    // Prevent loops
    const sourceInPath = edges.some(edge => 
      edge.source === targetNode.id && edge.target === sourceNode.id
    );
    if (sourceInPath) {
      alert("Cannot create loops in the workflow");
      return true;
    }

    return false;
  }, [edges]);

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    if (shouldPreventConnection(sourceNode, targetNode)) {
      return;
    }

    let updatedNodes = [...nodes];
    
    // Handle parallel branch creation and labeling
    if (sourceNode.type === 'circular') {
      const branchId = `parallel_${params.source}`;
      updatedNodes = nodes.map(node => {
        if (node.id === params.target) {
          return {
            ...node,
            data: {
              ...node.data,
              parallelBranch: branchId,
              label: `${node.data.label} (Branch ${branchId})`
            }
          };
        }
        return node;
      });
    }

    // Update end nodes of parallel branches
    const branches = getParallelBranches();
    branches.forEach((branchNodes, circularNodeId) => {
      const endNodes = branchNodes.filter(nodeId => 
        !edges.some(edge => edge.source === nodeId)
      );
      
      updatedNodes = updatedNodes.map(node => {
        if (endNodes.includes(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              isParallelEnd: true,
              label: node.data.label.includes('[End]') 
                ? node.data.label 
                : `${node.data.label} [End]`
            },
            style: {
              ...node.style,
              borderColor: '#ff4d4d',
              borderWidth: 2
            }
          };
        }
        return node;
      });
    });

    setNodes(updatedNodes);
    setEdges(eds => [...eds, {
      ...params,
      id: `e${params.source}-${params.target}`,
      type: 'smoothstep',
      animated: sourceNode.type === 'circular',
      style: { stroke: '#666' },
      markerEnd: { type: MarkerType.ArrowClosed }
    }]);
  }, [nodes, edges, setNodes, setEdges, shouldPreventConnection, getParallelBranches]);

  const onNodeDragStop = useCallback((event, node) => {
    const newNodes = nodes.map((nd) => {
      if (nd.id === node.id) {
        return {
          ...nd,
          position: {
            x: Math.round(node.position.x / 15) * 15,
            y: Math.round(node.position.y / 15) * 15
          }
        };
      }
      return nd;
    });

    pushToHistory(newNodes, edges);
    setNodes(newNodes);
  }, [nodes, edges, pushToHistory]);

  const makeNodesEquispacedAndCentered = useCallback(() => {
    if (!reactFlowWrapper.current) return;

    const spacingX = 200;
    const spacingY = 100;
    const containerWidth = reactFlowWrapper.current.offsetWidth;
    const centerX = containerWidth / 2;

    const branchesMap = new Map();
    let topLevelNodes = [];
    
    // First identify all branches and top-level nodes
    nodes.forEach(node => {
      if (node.data.parallelBranch) {
        if (!branchesMap.has(node.data.parallelBranch)) {
          branchesMap.set(node.data.parallelBranch, []);
        }
        branchesMap.get(node.data.parallelBranch).push(node);
      } else {
        topLevelNodes.push(node);
      }
    });

    let updatedNodes = [];
    let currentY = 50;

    // Position top-level nodes
    topLevelNodes.forEach((node, index) => {
      updatedNodes.push({
        ...node,
        position: {
          x: centerX + (index - topLevelNodes.length / 2) * spacingX,
          y: currentY
        }
      });
    });

    currentY += spacingY * 2;

    // Position branch nodes
    branchesMap.forEach((branchNodes, branchId) => {
      const branchWidth = (branchNodes.length - 1) * spacingX;
      const branchStartX = centerX - (branchWidth / 2);

      branchNodes.forEach((node, index) => {
        updatedNodes.push({
          ...node,
          position: {
            x: branchStartX + (index * spacingX),
            y: currentY + (node.data.isParallelEnd ? spacingY : 0)
          }
        });
      });

      currentY += spacingY * 3;
    });

    pushToHistory(updatedNodes, edges);
    setNodes(updatedNodes);
  }, [nodes, edges, pushToHistory]);

  const nodeTypes = {
    customNodeType: CustomNodeComponent,
    circular: CircularNode,
    imageNode: ImageNode,
    iconNode: IconNode,
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '15px', 
        display: 'flex', 
        gap: '10px',
        background: '#f5f5f5',
        borderBottom: '1px solid #ddd'
      }}>
        <button onClick={makeNodesEquispacedAndCentered} className="flow-button">
          Arrange Nodes
        </button>
        <button onClick={() => addNode('circular')} className="flow-button">
          Add Branch Node
        </button>
        <button onClick={() => addNode('default')} className="flow-button">
          Add Node
        </button>
      </div>
      <div ref={reactFlowWrapper} style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeDragStop={onNodeDragStop}
          snapToGrid={true}
          snapGrid={[15, 15]}
          defaultZoom={1}
          minZoom={0.2}
          maxZoom={4}
          fitView
        >
          <Background 
            variant="dots" 
            gap={15} 
            size={1} 
            color="#e0e0e0" 
          />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <style jsx>{`
        .flow-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: #4a90e2;
          color: white;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .flow-button:hover {
          background: #357abd;
        }

        .flow-button:active {
          background: #2a5f9e;
        }
      `}</style>
    </div>
  );
};

export default FlowDiagram;