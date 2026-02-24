import fetch from 'node-fetch';

(async ()=>{
  try{
    const res = await fetch('http://localhost:5000/api/call-center/complaints/by-service-center/4');
    const data = await res.json();
    const raw = data.complaints && data.complaints[0];
    console.log('Raw keys:', raw ? Object.keys(raw).join(', ') : 'no raw');
    const normalize = (raw)=>{
      if(!raw) return null;
      return {
        ComplaintId: raw.ComplaintId || raw.call_id || raw.CallId || raw.callId || null,
        CreatedAt: raw.CreatedAt || raw.created_at || raw.createdAt || null,
        CustomerName: raw.CustomerName || raw.customer_name || raw.customerName || '-',
        MobileNo: raw.MobileNo || raw.customer_mobile || raw.customer_mobile || raw.CallerMobile || raw.caller_mobile_no || raw.caller_mobile || null,
        City: raw.City || raw.city || raw.city_id || raw.City || '-',
        Product: raw.Product || raw.product || raw.Product || '',
        Model: raw.Model || raw.model || raw.ModelDescription || raw.model_description || '',
        ProductSerialNo: raw.ProductSerialNo || raw.product_serial_no || raw.serial_number || raw.ProductSerialNo || '',
        CallStatus: raw.CallStatus || raw.call_type || raw.CallType || '',
        AssignedTechnicianId: raw.AssignedTechnicianId || raw.assigned_tech_id || raw.assignedTechnicianId || null,
        TechnicianName: raw.TechnicianName || raw.technician_name || raw.technician || '',
        CustomerRemarks: raw.CustomerRemarks || raw.customer_remark || raw.Remark || raw.remark || '' ,
      };
    };
    const norm = normalize(raw);
    console.log('Normalized sample:', JSON.stringify(norm, null, 2));
  }catch(e){
    console.error(e);
  }
})();
