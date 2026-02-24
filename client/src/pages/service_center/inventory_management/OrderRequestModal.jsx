import React from "react";

export default function OrderRequestModal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 300 }}>
        <button onClick={onClose} style={{ float: "right" }}>Close</button>
        {children}
      </div>
    </div>
  );
}
