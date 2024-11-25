import React from 'react';
import { Handle } from 'react-flow-renderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { useFlow } from '../FlowContext'; // Ensure the correct path

const IconNode = ({ id, data }) => {
  const { deleteNode } = useFlow();

  const handleDelete = () => {
    deleteNode(id);
  };

 return ( <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '25px',
    backgroundColor: '#f9f9f9',
  }}>
    <Handle type="target" position="left" />
    <FontAwesomeIcon icon={faCoffee} />
    <div>{data.label}</div>
    <button onClick={handleDelete} style={{ marginTop: '10px' }}>Delete</button>
    <Handle type="source" position="right" />
    
  </div>
);
}

export default IconNode;
