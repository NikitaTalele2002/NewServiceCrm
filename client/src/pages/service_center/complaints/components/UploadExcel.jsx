import React, { useRef } from 'react';

const UploadExcel = ({ onUploaded }) => {
  const [mode, setMode] = React.useState('replace');
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(getApiUrl(`/location/uploadExcel?mode=${mode}`), {
        method: 'POST',
        body: formData,
      });
      const js = await res.json();
      alert(js.message || 'Upload complete');
      if (onUploaded) onUploaded();
      // reset file input so user can upload again
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      console.error('upload error', err);
      alert('Upload failed');
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium border-3">Upload Excel</label>
      <div className="mt-2 flex items-center gap-2">
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="border p-1 rounded">
          <option value="replace">Replace data</option>
          <option value="append">Append data</option>
        </select>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleUpload} />
      </div>
    </div>
  );
};

export default UploadExcel;