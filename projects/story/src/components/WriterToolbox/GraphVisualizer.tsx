import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PlotNode {
    id: string;
    label: string;
    type: 'setup' | 'incident' | 'turning-point' | 'climax' | 'resolution';
    x: number;
    y: number;
}

interface PlotEdge {
    id: string;
    sourceId: string;
    targetId: string;
}

interface GraphVisualizerProps {
    initialNodes?: PlotNode[];
    initialEdges?: PlotEdge[];
    onNodeMove?: (id: string, x: number, y: number) => void;
}

const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
    initialNodes = [
        { id: '1', label: 'Einführung', type: 'setup', x: 50, y: 150 },
        { id: '2', label: 'Auslösendes Ereignis', type: 'incident', x: 250, y: 150 },
        { id: '3', label: 'Wendepunkt 1', type: 'turning-point', x: 450, y: 100 },
        { id: '4', label: 'Höhepunkt', type: 'climax', x: 650, y: 150 }
    ],
    initialEdges = [
        { id: 'e1-2', sourceId: '1', targetId: '2' },
        { id: 'e2-3', sourceId: '2', targetId: '3' },
        { id: 'e3-4', sourceId: '3', targetId: '4' }
    ],
    onNodeMove
}) => {
    const [nodes, setNodes] = useState<PlotNode[]>(initialNodes);
    const [edges] = useState<PlotEdge[]>(initialEdges);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const handleMouseDown = (id: string) => {
        setDraggingNodeId(id);
    };

    const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (!draggingNodeId || !svgRef.current) return;

        const svg = svgRef.current;
        const CTM = svg.getScreenCTM();
        if (!CTM) return;

        const x = (e.clientX - CTM.e) / CTM.a;
        const y = (e.clientY - CTM.f) / CTM.d;

        setNodes(prevNodes => prevNodes.map(node => 
            node.id === draggingNodeId ? { ...node, x, y } : node
        ));
    }, [draggingNodeId]);

    const handleMouseUp = useCallback(() => {
        if (draggingNodeId && onNodeMove) {
            const node = nodes.find(n => n.id === draggingNodeId);
            if (node) onNodeMove(node.id, node.x, node.y);
        }
        setDraggingNodeId(null);
    }, [draggingNodeId, nodes, onNodeMove]);

    useEffect(() => {
        if (draggingNodeId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingNodeId, handleMouseMove, handleMouseUp]);

    const getNodeColor = (type: PlotNode['type']) => {
        switch (type) {
            case 'setup': return '#3b82f6';
            case 'incident': return '#f59e0b';
            case 'turning-point': return '#8b5cf6';
            case 'climax': return '#ef4444';
            case 'resolution': return '#10b981';
            default: return '#9ca3af';
        }
    };

    return (
        <div style={{ width: '100%', height: '500px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', background: '#f9fafb', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, pointerEvents: 'none', fontSize: '12px', color: '#666' }}>
                Plot-Konsistenz-Prüfung: Kausale Verknüpfungen (Drag & Drop zum Anordnen)
            </div>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox="0 0 800 400"
                style={{ cursor: draggingNodeId ? 'grabbing' : 'default' }}
            >
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="22"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                    </marker>
                </defs>

                {/* Render Edges */}
                {edges.map(edge => {
                    const source = nodes.find(n => n.id === edge.sourceId);
                    const target = nodes.find(n => n.id === edge.targetId);
                    if (!source || !target) return null;

                    return (
                        <line
                            key={edge.id}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            stroke="#94a3b8"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}

                {/* Render Nodes */}
                {nodes.map(node => (
                    <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onMouseDown={() => handleMouseDown(node.id)}
                        style={{ cursor: 'grab' }}
                    >
                        <circle
                            r="20"
                            fill={getNodeColor(node.type)}
                            stroke="#fff"
                            strokeWidth="2"
                            boxShadow="0 2px 4px rgba(0,0,0,0.1)"
                        />
                        <text
                            y="35"
                            textAnchor="middle"
                            style={{ fontSize: '12px', fontWeight: 'bold', fill: '#374151', userSelect: 'none' }}
                        >
                            {node.label}
                        </text>
                        <text
                            y="50"
                            textAnchor="middle"
                            style={{ fontSize: '10px', fill: '#6b7280', userSelect: 'none', textTransform: 'uppercase' }}
                        >
                            {node.type}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default GraphVisualizer;