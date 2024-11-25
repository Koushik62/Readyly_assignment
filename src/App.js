import React from 'react';
import { FlowProvider } from './FlowContext';
import FlowDiagram from './FlowDiagram';
import NodeControl from './NodeControl';

function App() {
  return (
    <FlowProvider>
      <NodeControl />
      <FlowDiagram />
    </FlowProvider>
  );
}

export default App;
