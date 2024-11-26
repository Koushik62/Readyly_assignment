import React, { createContext, useState, useContext } from 'react';

const FlowContext = createContext();
const initialNodes = [
  { id: '1', type: 'input', data: { label: 'Enter a reply...' }, position: { x: 250, y: 5 } },
  { id: '2', data: { label: 'Executing Workflow' }, position: { x: 250, y: 100 } },
  { id: '3', data: { label: 'Write a subject...' }, position: { x: 250, y: 195 } },
  { id: '4', data: { label: 'Enter a sheet name...' }, position: { x: 250, y: 290 } },
  { id: '5', data: { label: 'Your data has been updated.' }, position: { x: 250, y: 385 }, type: 'output' },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true },
  { id: 'e4-5', source: '4', target: '5', animated: true },
];


export const FlowProvider = ({ children }) => {
  const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [history, setHistory] = useState([{ nodes: initialNodes, edges: initialEdges }]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

  const addNode = (node) => {
    setNodes((prevNodes) => [...prevNodes, node]);
  };

  
  const deleteNode = (nodeId) => {
    setNodes((prevNodes) => prevNodes.filter((node) => node.id !== nodeId));
    setEdges((prevEdges) => prevEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  };

  return (
    <FlowContext.Provider value={{  nodes, edges, addNode,setNodes, deleteNode, setEdges,
      history, setHistory, currentHistoryIndex, setCurrentHistoryIndex
    }}>
      {children}
    </FlowContext.Provider>
  );
};

export const useFlow = () => useContext(FlowContext);
