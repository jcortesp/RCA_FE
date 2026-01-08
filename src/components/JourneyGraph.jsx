// src/components/JourneyGraph.jsx
import { useMemo, useCallback, useState } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from "react-flow-renderer";
import "react-flow-renderer/dist/style.css";
import dagre from "dagre";

import {
  Drawer,
  Box,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Colores por tipo
const nodeTypeColor = {
  transaction: "#FF9800",
  flow: "#1976D2",
  service: "#43A047",
  server: "#FBC02D",
};
const nodeBgColor = {
  transaction: "#FFF3E0",
  flow: "#E3F2FD",
  service: "#E8F5E9",
  server: "#FFFDE7",
};

function safeTrim(v) {
  if (v == null) return "";
  return (typeof v === "string" ? v.trim() : String(v).trim()) || "";
}

function getTxKey(node) {
  return safeTrim(node?.transactionKey || node?.TRANSACTION_KEY || node?.label);
}
function getServerKey(node) {
  return safeTrim(node?.serverKey || node?.SERVER_KEY || "");
}
function getFlowName(node) {
  return safeTrim(node?.flowName || node?.FLOW_NAME || node?.label);
}
function getLabel(node) {
  return safeTrim(node?.label);
}

// Etiqueta amigable del nodo (para header del Drawer)
function nodeLabel(node) {
  if (!node) return "";
  const type = safeTrim(node.type);

  if (type === "transaction") return `TX: ${getTxKey(node)}`;
  if (type === "server") return `SERVER: ${getServerKey(node)}`;
  if (type === "flow") return getFlowName(node);
  if (type === "service") return getLabel(node);
  return getLabel(node);
}

// Label controlado para que NO se salga del nodo
function NodeLabel({ text }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        textAlign: "center",
        fontSize: 12,
        lineHeight: 1.2,
        padding: "2px 6px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={text}
    >
      {text}
    </div>
  );
}

// ID estable por tipo+valor; fallback único si quedara vacío
function getNodeId(step, ri, si) {
  const type = safeTrim(step?.type) || "node";

  if (type === "transaction") {
    const tx = safeTrim(step?.transactionKey || step?.TRANSACTION_KEY || step?.label);
    return tx ? `tx_${tx}` : `tx_${ri}_${si}`;
  }
  if (type === "server") {
    const srv = safeTrim(step?.serverKey || step?.SERVER_KEY);
    return srv ? `srv_${srv}` : `srv_${ri}_${si}`;
  }
  if (type === "flow") {
    const flow = safeTrim(step?.flowName || step?.FLOW_NAME || step?.label);
    return flow ? `flow_${flow}` : `flow_${ri}_${si}`;
  }
  if (type === "service") {
    const svc = safeTrim(step?.label);
    return svc ? `svc_${svc}` : `svc_${ri}_${si}`;
  }

  const lbl = safeTrim(step?.label);
  return lbl ? `${type}_${lbl}` : `${type}_${ri}_${si}`;
}

function renderValue(v) {
  if (v === null || v === undefined || v === "") return "-";

  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }

  try {
    const pretty = JSON.stringify(v, null, 2);
    return (
      <pre
        style={{
          margin: 0,
          fontSize: 11,
          lineHeight: 1.25,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          background: "rgba(25, 118, 210, 0.05)",
          border: "1px solid rgba(25, 118, 210, 0.15)",
          borderRadius: 8,
          padding: 8,
        }}
      >
        {pretty}
      </pre>
    );
  } catch {
    return String(v);
  }
}

/**
 * ✅ Drawer: SOLO los campos requeridos
 *
 * Requerimiento:
 * - service/flow: flowName, flowKey, serverKey, flowGroupName
 * - transaction: serverKey, transactionKey, transactionName, owner, createUserId, createTs, modifyTs
 *
 * Fuente:
 * - preferir node.details (que arma el backend)
 * - fallback: armar desde root fields del nodo si details no existe
 */
function pickDetailsForDrawer(node) {
  const type = safeTrim(node?.type);

  const d = (node && typeof node.details === "object" && node.details !== null) ? node.details : {};

  if (type === "service" || type === "flow") {
    return {
      flowName: d.flowName ?? node.flowName ?? null,
      flowKey: d.flowKey ?? node.flowKey ?? null,
      serverKey: d.serverKey ?? node.serverKey ?? null,
      flowGroupName: d.flowGroupName ?? null,
    };
  }

  if (type === "transaction") {
    return {
      serverKey: d.serverKey ?? node.serverKey ?? null,
      transactionKey: d.transactionKey ?? node.transactionKey ?? null,
      transactionName: d.transactionName ?? null,
      owner: d.owner ?? null,
      createUserId: d.createUserId ?? null,
      createTs: d.createTs ?? null,
      modifyTs: d.modifyTs ?? null,
    };
  }

  // Default: si aparece otro tipo, al menos intenta mostrar details
  return d;
}

function layoutNodesAndEdges(routes) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 80 });

  const nodeMap = new Map();
  const edges = [];
  let edgeCounter = 0;

  (routes || []).forEach((route, ri) => {
    let prevId = null;

    (route || []).forEach((step, si) => {
      const id = getNodeId(step, ri, si);
      const type = safeTrim(step?.type) || "flow";

      if (!nodeMap.has(id)) {
        const labelText = nodeLabel(step);

        // ✅ MUY IMPORTANTE:
        // - Guardamos el nodo COMPLETO en data (incluye details)
        // - Y el label de ReactFlow lo dejamos como componente (ellipsis)
        nodeMap.set(id, {
          id,
          type: "default",
          data: {
            ...step,
            __labelText: labelText,
            label: <NodeLabel text={labelText} />,
          },
          style: {
            border: `2.5px solid ${nodeTypeColor[type] ?? "#1976D2"}`,
            borderRadius: 12,
            background: nodeBgColor[type] ?? "#E3F2FD",
            color: "#072246",
            fontWeight: 600,
            boxShadow: "0 1px 8px rgba(12,50,80,0.11)",
            padding: 6,
            width: 220,
          },
        });

        g.setNode(id, { width: 220, height: 60 });
      }

      if (prevId) {
        const eid = `e_${ri}_${si}_${prevId}_to_${id}_${edgeCounter++}`;
        edges.push({
          id: eid,
          source: prevId,
          target: id,
          animated: true,
          style: { stroke: nodeTypeColor[type] ?? "#1976D2", strokeWidth: 2 },
        });
        g.setEdge(prevId, id);
      }

      prevId = id;
    });
  });

  dagre.layout(g);

  nodeMap.forEach((node, id) => {
    const d = g.node(id);
    const x = d?.x ?? 0;
    const y = d?.y ?? 0;
    node.position = { x: x - 110, y: y - 30 };
  });

  return { nodes: Array.from(nodeMap.values()), edges };
}

export default function JourneyGraph({ routes }) {
  const { nodes, edges } = useMemo(() => layoutNodesAndEdges(routes || []), [routes]);

  const [nodesState, , onNodesChange] = useNodesState(nodes);
  const [edgesState, , onEdgesChange] = useEdgesState(edges);

  const [open, setOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const onNodeClick = useCallback((_evt, node) => {
    setSelectedNode(node?.data ?? null);
    setOpen(true);
  }, []);

  const handleClose = () => setOpen(false);

  const drawerDetails = useMemo(() => pickDetailsForDrawer(selectedNode), [selectedNode]);

  return (
    <Box
      sx={{
        width: "100%",
        height: 520,
        border: 1,
        borderRadius: 2,
        background: "rgba(33, 150, 243, 0.08)",
        position: "relative",
        boxShadow: 3,
        overflow: "visible",
      }}
    >
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.45}
        maxZoom={2}
        panOnDrag
        zoomOnPinch
      >
        <MiniMap
          nodeColor={(n) => nodeTypeColor[safeTrim(n?.data?.type) || "flow"] ?? "#1976D2"}
        />
        <Controls />
        <Background variant="dots" gap={22} size={2} color="rgba(33, 150, 243, 0.18)" />
      </ReactFlow>

      {/* PANEL DE DETALLES */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: { xs: 320, sm: 380, md: 420 }, p: 2, boxSizing: "border-box" },
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="h6" fontWeight={600} noWrap>
            Detalles del nodo
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {selectedNode ? (
          <>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              {selectedNode?.type && (
                <Chip
                  label={selectedNode.type}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ textTransform: "capitalize" }}
                />
              )}
            </Box>

            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, wordBreak: "break-word" }}>
              {nodeLabel(selectedNode)}
            </Typography>

            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableBody>
                {Object.entries(drawerDetails)
                  .filter(([, v]) => v !== undefined) // dejamos null para que se vea como "-"
                  .map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell
                        sx={{
                          width: "38%",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          verticalAlign: "top",
                          fontSize: 12,
                        }}
                      >
                        {k}
                      </TableCell>
                      <TableCell sx={{ wordBreak: "break-word", fontSize: 12 }}>
                        {renderValue(v)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <Typography>Selecciona un nodo para ver detalles</Typography>
        )}
      </Drawer>
    </Box>
  );
}
