import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/apiConfig';

const AttachmentsDisplay = ({ callId }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    if (callId) {
      fetchAttachments();
    }
  }, [callId]);

  const fetchAttachments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl(`/attachments/call/${callId}`), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAttachments(data.attachments || []);

      // If no attachments found, you can optionally create sample ones
      if (data.attachments.length === 0) {
        console.log('No attachments found. You can create sample attachments for testing.');
      }
    } catch (err) {
      console.error('[AttachmentsDisplay] Error fetching attachments:', err);
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const createSampleAttachments = async () => {
    try {
      const response = await fetch(getApiUrl('/attachments/demo/create-sample'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ callId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AttachmentsDisplay] Sample attachments created:', data);
      await fetchAttachments();
    } catch (err) {
      console.error('[AttachmentsDisplay] Error creating sample attachments:', err);
      setError('Failed to create sample attachments');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb > 1) return `${mb.toFixed(2)} MB`;
    if (kb > 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const getCategoryBadgeColor = (category) => {
    const colors = {
      invoice: 'bg-blue-100 text-blue-800',
      receipt: 'bg-green-100 text-green-800',
      warranty: 'bg-purple-100 text-purple-800',
      image: 'bg-yellow-100 text-yellow-800',
      document: 'bg-gray-100 text-gray-800',
      video: 'bg-red-100 text-red-800',
      audio: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  const getFileIcon = (fileType) => {
    const icons = {
      pdf: '📄',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      doc: '📋',
      docx: '📋',
      txt: '📝',
      xls: '📊',
      xlsx: '📊',
      zip: '📦',
      mp4: '🎬',
      mp3: '🎵'
    };
    return icons[fileType?.toLowerCase()] || '📁';
  };

  const handleDownload = (attachment) => {
    // Note: In production, this would be a real download endpoint
    const link = document.createElement('a');
    link.href = attachment.fileUrl;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (attachment) => {
    setSelectedAttachment(attachment);
    setPreviewContent('');
    
    // For text files, fetch and display content
    if (['txt', 'doc', 'docx', 'text'].includes(attachment.fileType?.toLowerCase())) {
      fetch(attachment.fileUrl)
        .then(res => res.text())
        .then(content => setPreviewContent(content))
        .catch(err => {
          console.error('Error loading text file:', err);
          setPreviewContent('Unable to load file content');
        });
    }
    
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded border border-gray-300">
        <p className="text-gray-600">Loading attachments...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded border border-gray-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Attachments</h3>
        <button
          onClick={createSampleAttachments}
          className="px-3 py-1 bg-blue-500 text-black rounded text-sm hover:bg-blue-600"
          title="Create sample attachments for testing"
        >
          + Add Sample
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {attachments.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-500 mb-3">📂 No attachments yet</p>
          <p className="text-sm text-gray-400 mb-4">
            When technician uploads images/documents from the app, they will appear here.
          </p>
          <button
            onClick={createSampleAttachments}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Create Sample Attachments for Testing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-gray-50"
            >
              {/* Left: Icon and details */}
              <div className="flex items-start gap-3 flex-1">
                <span className="text-3xl">{getFileIcon(attachment.fileType)}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm" title={attachment.fileName}>
                    {attachment.fileName}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${getCategoryBadgeColor(attachment.category)}`}>
                      {attachment.category || 'document'}
                    </span>
                    <span className="text-xs text-gray-600">
                      {formatFileSize(attachment.fileSize)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {attachment.remarks && (
                    <p className="text-xs text-gray-700 mt-1">{attachment.remarks}</p>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handlePreview(attachment)}
                  className="px-3 py-1.5 bg-blue-500 text-black rounded text-xs hover:bg-blue-600 whitespace-nowrap font-medium"
                >
                  Preview
                </button>
                <button
                  onClick={() => handleDownload(attachment)}
                  className="px-3 py-1.5 bg-green-500 text-black rounded text-xs hover:bg-green-600 whitespace-nowrap font-medium"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>

      )}
      {/* Preview Modal */}
      {showPreview && selectedAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="font-semibold">{selectedAttachment.fileName}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-red-500 text-2xl hover:text-red-700"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              {selectedAttachment.fileType && (
                ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(selectedAttachment.fileType.toLowerCase()) ? (
                  <img
                    src={selectedAttachment.fileUrl}
                    alt={selectedAttachment.fileName}
                    className="w-full h-auto"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22%23999%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESample Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : ['txt', 'text', 'doc', 'docx'].includes(selectedAttachment.fileType.toLowerCase()) ? (
                  <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-80 text-sm whitespace-pre-wrap break-words font-mono">
                    {previewContent || 'Loading...'}
                  </pre>
                ) : (
                  <div className="bg-gray-100 p-8 rounded text-center">
                    <p className="text-gray-600 mb-2">{getFileIcon(selectedAttachment.fileType)} {selectedAttachment.fileType.toUpperCase()}</p>
                    <p className="text-sm text-gray-500">{selectedAttachment.fileName}</p>
                  </div>
                )
              )}

              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => handleDownload(selectedAttachment)}
                  className="w-full px-4 py-2 bg-green-600 text-black rounded hover:bg-green-700"
                >Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
};

export default AttachmentsDisplay;
