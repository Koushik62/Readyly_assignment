import React from 'react';
import  { Handle } from 'react-flow-renderer';


const CustomNodeComponent = ({ data }) => (
    <div style={{ padding: 10, backgroundColor: '#ddd', border: '1px solid #ccc' }}>
      <Handle type="target" position="top" style={{ borderRadius: 0 }} />
      {data.label}
      <Handle type="source" position="bottom" style={{ borderRadius: 0 }} />
    </div>
  );

  export default CustomNodeComponent;