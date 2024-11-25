const nodes = require('./nodes.json');
const edges = require('./edges.json');

// Helper function to find the next nodes connected by an edge
function findNextNodes(sourceId) {
  return edges.filter(edge => edge.source === sourceId).map(edge => edge.target);
}

// Recursive function to construct paths
function constructPaths(currentNode, path = []) {
  const newPath = [...path, currentNode]; // Add the current node to the path
  const nextNodes = findNextNodes(currentNode); // Find next nodes based on edges

  if (nextNodes.length === 0) {
    // If there are no next nodes, return the current path
    return [newPath];
  }

  // Accumulate paths from all next nodes
  let paths = [];
  nextNodes.forEach(nextNode => {
    const nextPaths = constructPaths(nextNode, newPath);
    paths.push(...nextPaths);
  });

  return paths;
}

// Start constructing paths from the initial node
const initialNodeId = "node_1"; // Assuming `node_1` is the starting point
const paths = constructPaths(initialNodeId);

console.log(paths);