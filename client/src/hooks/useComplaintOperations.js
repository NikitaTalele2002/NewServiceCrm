import { useState, useCallback } from 'react';
import { useProducts } from './useProducts';

/**
 * Reusable hook for complaint operations (assignment and submission)
 * Used by both ProductDetailsPage and CallView
 */
export const useComplaintOperations = (customer) => {
  const [assigning, setAssigning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { assignServiceCentre, createComplaint, searchCustomers } = useProducts();

  /**
   * Assign nearest service center based on customer location
   */
  const handleAssignNearestCenter = useCallback(async (callInfo, onSuccess) => {
    if (!customer && !callInfo.CallerMobile) {
      alert('Customer or caller mobile required');
      return false;
    }

    try {
      setAssigning(true);

      // Prefer caller mobile's customer record for assignment
      let authoritativeCustomer = null;
      if (callInfo?.CallerMobile) {
        try {
          const result = await searchCustomers({ mobileNo: callInfo.CallerMobile });
          if (result.success && result.data.exists) {
            authoritativeCustomer = result.data.customer;
            console.log('Using caller mobile customer for assignment:', authoritativeCustomer);
          }
        } catch (e) {
          console.warn('Caller mobile lookup failed, will fallback to searched customer if available', e);
        }
      }

      // Fallback to customer if caller mobile didn't resolve
      if (!authoritativeCustomer && customer) {
        authoritativeCustomer = customer;
      }

      if (!authoritativeCustomer) {
        alert('Customer data not available for assignment');
        return false;
      }

      // Build payload using city/state/pincode
      const payload = {
        pincode: authoritativeCustomer?.PinCode || authoritativeCustomer?.Pin || '',
        customerAddress: [
          authoritativeCustomer?.Address,
          authoritativeCustomer?.City,
          authoritativeCustomer?.State,
          authoritativeCustomer?.PinCode,
        ]
          .filter(Boolean)
          .join(', '),
      };

      const result = await assignServiceCentre(payload);
      if (!result.success) {
        alert(result.error || 'Assignment failed');
        return false;
      }

      const assignmentResult = {
        AssignedCenter: result.data.serviceCenter?.CenterName || '',
        Distance: result.data.distance || '',
        OutCity: !!result.data.outCity,
      };

      onSuccess(assignmentResult);
      alert('Assigned successfully!');
      return true;
    } catch (err) {
      console.error(err);
      alert('Error during assignment');
      return false;
    } finally {
      setAssigning(false);
    }
  }, [customer, assignServiceCentre, searchCustomers]);

  /**
   * Submit complaint with validation
   */
  const handleSubmitComplaint = useCallback(async (complaintPayload, onSuccess) => {
    // Validate required fields
    if (!complaintPayload.product) {
      alert('Product information required');
      return false;
    }
    if (!complaintPayload.callInfo?.CallType) {
      alert('Select Call Type');
      return false;
    }

    const callerMobile =
      complaintPayload.callInfo?.CallerMobile ||
      complaintPayload.customer?.MobileNo ||
      complaintPayload.customer?.mobile;

    if (!callerMobile) {
      alert('Enter Caller Mobile');
      return false;
    }
    if (!complaintPayload.callInfo?.CustomerRemarks) {
      alert('Enter Customer Remarks');
      return false;
    }

    try {
      setSubmitting(true);
      const result = await createComplaint(complaintPayload);
      if (!result.success) {
        console.error('Complaint register failed:', result.error);
        alert(result.error || 'Error registering complaint');
        return false;
      }

      alert('Complaint Registered Successfully!');
      onSuccess(result.data);
      return true;
    } catch (err) {
      console.error('Submit complaint error:', err);
      alert('Failed to submit complaint');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [createComplaint]);

  return {
    assigning,
    submitting,
    handleAssignNearestCenter,
    handleSubmitComplaint,
  };
};
