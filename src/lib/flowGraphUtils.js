/**
 * Flow graph utilities — upstream node walking and output map building
 * for the Node Output Mapper (slash-command data mapping).
 */

/**
 * BFS backward walk from a node to find all upstream ancestors.
 * Returns an array of React Flow node objects.
 */
export function getUpstreamNodes(currentNodeId, edges, nodes) {
  if (!currentNodeId || !edges?.length || !nodes?.length) return [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set();
  const queue = [currentNodeId];
  const result = [];

  while (queue.length > 0) {
    const id = queue.shift();
    const incoming = edges.filter(e => e.target === id);
    for (const edge of incoming) {
      if (!visited.has(edge.source)) {
        visited.add(edge.source);
        const sourceNode = nodeMap.get(edge.source);
        if (sourceNode) {
          result.push(sourceNode);
          queue.push(edge.source);
        }
      }
    }
  }
  return result;
}

/**
 * Compute the effective output ports for a node.
 * If the node has a structured output schema in config, returns the schema fields
 * as output ports (+ usage). Otherwise falls back to the registry-defined outputs.
 */
export function getEffectiveOutputs(node) {
  const schema = node.data?.config?.output_schema;
  if (Array.isArray(schema) && schema.length > 0) {
    return [
      ...schema.map(f => ({
        id: f.key,
        type: f.type === 'array' ? 'json' : 'string',
      })),
      { id: 'usage', type: 'json' },
    ];
  }
  return node.data?.nodeType?.outputs || [];
}

/**
 * Transform upstream nodes into a picker-friendly list grouped by node.
 * Returns: [{ nodeId, nodeLabel, nodeIcon, category, outputs: [{ id, type }] }]
 */
export function buildOutputMap(upstreamNodes) {
  return upstreamNodes
    .map(node => {
      const nt = node.data?.nodeType;
      const outputs = getEffectiveOutputs(node);
      if (!outputs?.length) return null;
      return {
        nodeId: node.id,
        nodeLabel: node.data?.label || nt?.label || nt?.id,
        nodeIcon: nt?.icon || '⚡',
        category: nt?.category || 'utility',
        outputs: outputs.map(o => ({ id: o.id, type: o.type || 'string' })),
      };
    })
    .filter(Boolean);
}

