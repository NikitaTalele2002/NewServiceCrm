/**
 * FRONTEND STATUS DISPLAY GUIDE
 * How to display status and sub-status in the CRM Dashboard frontend
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

// ============================================================================
// 1. STATUS BADGE COMPONENT
// ============================================================================

/**
 * StatusBadge - Display current status with color coding
 * Shows both status and sub-status
 */
export const StatusBadge = ({ callId, status, subStatus }) => {
  const [displayStatus, setDisplayStatus] = useState(null);
  const [loading, setLoading] = useState(!status);

  useEffect(() => {
    if (!status && callId) {
      // Fetch current status if not provided
      axios.get(`/api/call-center/complaint/${callId}/status`)
        .then(res => {
          setDisplayStatus({
            status: res.data.status,
            subStatus: res.data.subStatus
          });
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching status:', err);
          setLoading(false);
        });
    } else if (status) {
      setDisplayStatus({ status, subStatus });
    }
  }, [callId, status, subStatus]);

  if (loading) return <span className="badge badge-secondary">Loading...</span>;
  if (!displayStatus) return <span className="badge badge-secondary">Unknown</span>;

  const { status: stat, subStatus: subStat } = displayStatus;
  const statusColors = {
    'open': 'primary',
    'pending': 'warning',
    'closed': 'success',
    'cancelled': 'secondary',
    'rejected': 'danger',
    'approved': 'success'
  };

  const statusColor = statusColors[stat?.statusName] || 'secondary';

  return (
    <div className="status-badge">
      <span className={`badge badge-${statusColor}`}>
        {stat?.statusName?.toUpperCase() || 'N/A'}
      </span>
      {subStat && (
        <span className="ms-2 text-muted small">
          ({subStat.subStatusName})
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 2. STATUS HISTORY TIMELINE COMPONENT
// ============================================================================

/**
 * StatusTimeline - Display status change history with timeline
 */
export const StatusTimeline = ({ callId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (callId) {
      axios.get(`/api/call-center/complaint/${callId}/status-history`)
        .then(res => {
          if (res.data.statusHistory) {
            setHistory(res.data.statusHistory);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching status history:', err);
          setLoading(false);
        });
    }
  }, [callId]);

  if (loading) return <div>Loading status history...</div>;
  if (!history || history.length === 0) {
    return <div className="text-muted">No status history available</div>;
  }

  return (
    <div className="status-timeline">
      <div className="timeline">
        {history.map((entry, idx) => (
          <div key={entry.logId} className="timeline-item">
            <div className="timeline-marker">
              <div className="marker-dot"></div>
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="status-name">
                  {entry.status?.statusName?.toUpperCase()}
                </span>
                {entry.subStatus && (
                  <span className="ms-2 text-muted">
                    ({entry.subStatus.subStatusName})
                  </span>
                )}
              </div>
              <div className="timeline-meta">
                <small className="text-muted">
                  {new Date(entry.timestamp).toLocaleString()}
                </small>
                {entry.user && (
                  <small className="ms-2 text-muted">
                    by {entry.user.username}
                  </small>
                )}
              </div>
              {entry.remarks && (
                <div className="timeline-remarks">
                  <small>{entry.remarks}</small>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 3. COMPLAINT LIST WITH STATUS DISPLAY
// ============================================================================

/**
 * ComplaintListWithStatus - Display complaints with their current status
 */
export const ComplaintListWithStatus = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/complaints/list')
      .then(res => {
        // Fetch detailed status for each complaint
        const complaintPromises = res.data.complaints.map(complaint => 
          axios.get(`/api/call-center/complaint/${complaint.call_id}/status`)
            .then(statusRes => ({
              ...complaint,
              status: statusRes.data.status,
              subStatus: statusRes.data.subStatus
            }))
            .catch(() => complaint)
        );
        return Promise.all(complaintPromises);
      })
      .then(complaintsWithStatus => {
        setComplaints(complaintsWithStatus);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching complaints:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading complaints...</div>;

  return (
    <div className="complaint-list">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Call ID</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Sub-Status</th>
            <th>Service Center</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map(complaint => (
            <tr key={complaint.call_id}>
              <td>{complaint.call_id}</td>
              <td>{complaint.customer_name}</td>
              <td>
                <StatusBadge 
                  status={complaint.status}
                  subStatus={complaint.subStatus}
                />
              </td>
              <td>
                <small className="text-muted">
                  {complaint.subStatus?.subStatusName || '-'}
                </small>
              </td>
              <td>{complaint.service_center_name}</td>
              <td>
                <button 
                  className="btn btn-sm btn-info"
                  onClick={() => viewComplaintDetails(complaint.call_id)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// 4. COMPLAINT DETAIL VIEW WITH STATUS HISTORY
// ============================================================================

/**
 * ComplaintDetailView - Show complaint details with status history
 */
export const ComplaintDetailView = ({ callId }) => {
  const [complaint, setComplaint] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (callId) {
      Promise.all([
        axios.get(`/api/complaints/${callId}`),
        axios.get(`/api/call-center/complaint/${callId}/status`)
      ])
        .then(([complaintRes, statusRes]) => {
          setComplaint(complaintRes.data);
          setCurrentStatus(statusRes.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching complaint details:', err);
          setLoading(false);
        });
    }
  }, [callId]);

  if (loading) return <div>Loading...</div>;
  if (!complaint) return <div>Complaint not found</div>;

  return (
    <div className="complaint-detail">
      <div className="card">
        <div className="card-header">
          <h5>Complaint #{complaint.call_id}</h5>
          {currentStatus && (
            <div className="mt-2">
              <StatusBadge 
                status={currentStatus.status}
                subStatus={currentStatus.subStatus}
              />
            </div>
          )}
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>Customer:</strong> {complaint.customer_name}</p>
              <p><strong>Mobile:</strong> {complaint.mobile_no}</p>
              <p><strong>Service Center:</strong> {complaint.service_center_name}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Technician:</strong> {complaint.technician_name || '-'}</p>
              <p><strong>Created:</strong> {new Date(complaint.created_at).toLocaleDateString()}</p>
              <p><strong>Remark:</strong> {complaint.remark}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status History Section */}
      <div className="card mt-3">
        <div className="card-header">
          <h6>Status History</h6>
        </div>
        <div className="card-body">
          <StatusTimeline callId={callId} />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. STATUS FILTER COMPONENT
// ============================================================================

/**
 * StatusFilter - Filter complaints by status
 */
export const StatusFilterComponent = ({ onFilterChange }) => {
  const statuses = [
    { id: 6, name: 'open', label: 'Open', color: 'primary' },
    { id: 1, name: 'pending', label: 'Pending', color: 'warning' },
    { id: 8, name: 'closed', label: 'Closed', color: 'success' },
    { id: 9, name: 'cancelled', label: 'Cancelled', color: 'secondary' },
    { id: 3, name: 'rejected', label: 'Rejected', color: 'danger' }
  ];

  return (
    <div className="status-filter mb-3">
      <label className="me-2">Filter by Status:</label>
      <div className="btn-group" role="group">
        <button 
          type="button" 
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onFilterChange(null)}
        >
          All
        </button>
        {statuses.map(status => (
          <button
            key={status.id}
            type="button"
            className={`btn btn-sm btn-outline-${status.color}`}
            onClick={() => onFilterChange(status.name)}
          >
            {status.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 6. USAGE EXAMPLES
// ============================================================================

/*

Example 1: Display status badge on complaint list item
=========================================================
<StatusBadge callId={complaint.call_id} />

Example 2: Display status badge with manual data
=================================================
<StatusBadge 
  status={{ statusId: 6, statusName: 'open' }}
  subStatus={{ subStatusId: 2, subStatusName: 'assigned to the service center' }}
/>

Example 3: Display status history in modal
===========================================
<div className="modal-body">
  <StatusTimeline callId={complaintId} />
</div>

Example 4: Filter complaints by status
=======================================
const [selectedStatus, setSelectedStatus] = useState(null);
<StatusFilterComponent onFilterChange={setSelectedStatus} />

Example 5: Show complaint detail with status history
====================================================
<ComplaintDetailView callId={callId} />

*/

// ============================================================================
// 7. CSS STYLING
// ============================================================================

/*

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.status-timeline {
  margin-top: 1rem;
}

.timeline {
  position: relative;
  padding-left: 2rem;
}

.timeline-item {
  position: relative;
  margin-bottom: 2rem;
}

.timeline-marker {
  position: absolute;
  left: -2rem;
  top: 0;
}

.marker-dot {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: #007bff;
  border: 3px solid white;
  box-shadow: 0 0 0 3px #dee2e6;
}

.timeline-content {
  padding-left: 1rem;
  border-left: 2px solid #dee2e6;
  padding-bottom: 1rem;
}

.timeline-header {
  font-weight: 500;
  color: #212529;
}

.timeline-meta {
  margin-top: 0.25rem;
  font-size: 0.875rem;
}

.timeline-remarks {
  margin-top: 0.5rem;
  color: #6c757d;
}

.status-filter .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

*/

export default {
  StatusBadge,
  StatusTimeline,
  ComplaintListWithStatus,
  ComplaintDetailView,
  StatusFilterComponent
};
