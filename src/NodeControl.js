// NodeControl.js
import React, { useState } from 'react';
import { useFlow } from './FlowContext';

const NodeControl = () => {
  const { addNode, deleteNode } = useFlow();
  const [nodeIdToDelete, setNodeIdToDelete] = useState('');

  const handleAddNode = () => {
    const newNode = {
      id: `node_${Date.now()}`,
      data: { label: `New Node` },
      position: { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }
    };
    addNode(newNode);
  };

  const handleDeleteNode = () => {
    deleteNode(nodeIdToDelete);
    setNodeIdToDelete(''); // Clear the input after deletion
  };

  return (
    <div>
    </div>
  );
};

export default NodeControl;
