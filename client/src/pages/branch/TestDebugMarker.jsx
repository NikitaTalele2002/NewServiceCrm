import React from 'react';

export default function TestDebugMarker() {
  return (
    <div style={{background: 'lime', color: 'black', padding: 32, fontWeight: 'bold', fontSize: 32, textAlign: 'center', border: '5px solid red', margin: 32}}>
      TEST COMPONENT: If you see this, your frontend is serving new code! {new Date().toLocaleString()}
    </div>
  );
}
