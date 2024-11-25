// customNodes/ImageNode.js
import React from 'react';
import { Handle } from 'react-flow-renderer';
import { useFlow } from '../FlowContext'; // Ensure the correct path
import myImage from '../logo_1.png'; // Update the path accordingly

const ImageNode = ({ id, data }) => {
  const { deleteNode } = useFlow();

  const handleDelete = () => {
    deleteNode(id);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      backgroundColor: '#f9f9f9',
    }}>
      <Handle type="target" position="top" />
      <img src={myImage} alt="" style={{ width: '50px', height: '50px' }} />
      <div>{data.label}</div>
      <Handle type="source" position="bottom" />
      <button onClick={handleDelete} style={{ marginTop: '10px' }}>Delete</button>
    </div>
  );
};

export default ImageNode;

