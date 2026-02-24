import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import FormInput from "../../components/common/FormInput";
import Button from "../../components/common/Button";
import { registerComplaintByMobileAndSerial } from "../../services/callCenterService";

export default function ComplaintForm() {
  const [form, setForm] = useState({
    customer_mobile_no: "",
    customers_product_serial_no: "",
    call_type: "complaint", // complaint, serviceRequest, followup
    remark: "",
    visit_date: "",
    visit_time: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  function update(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.customer_mobile_no || !form.customers_product_serial_no || !form.remark) {
      setError("Mobile number, serial number, and remark are required");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customer_mobile_no: form.customer_mobile_no,
        customers_product_serial_no: form.customers_product_serial_no,
        call_type: form.call_type,
        remark: form.remark,
        visit_date: form.visit_date || new Date().toISOString().split('T')[0],
        visit_time: form.visit_time || new Date().toTimeString().split(' ')[0]
      };

      const res = await registerComplaintByMobileAndSerial(payload);

      if (res.success) {
        setSuccess("✓ Complaint registered successfully!");
        setTimeout(() => {
          setForm({
            customer_mobile_no: "",
            customers_product_serial_no: "",
            call_type: "complaint",
            remark: "",
            visit_date: "",
            visit_time: ""
          });
          navigate("/call-centre");
        }, 2000);
      } else {
        setError(res.error || "Failed to register complaint");
      }
    } catch (err) {
      console.error("Complaint error:", err);
      setError(err.message || "Failed to register complaint");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-l-4 border-red-600">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">📋</div>
            <h1 className="text-3xl font-bold text-gray-900">Register Complaint</h1>
          </div>
          <p className="text-gray-600 mt-2">
            Register a new complaint or service request for a customer product
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 font-semibold">{success}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Mobile */}
            <FormInput
              label="Customer Mobile Number"
              placeholder="Enter mobile number"
              value={form.customer_mobile_no}
              onChange={(e) => update("customer_mobile_no", e.target.value)}
              required
            />

            {/* Serial Number */}
            <FormInput
              label="Product Serial Number"
              placeholder="Enter serial number"
              value={form.customers_product_serial_no}
              onChange={(e) => update("customers_product_serial_no", e.target.value)}
              required
            />

            {/* Call Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Call Type
              </label>
              <select
                value={form.call_type}
                onChange={(e) => update("call_type", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="complaint">Complaint</option>
                <option value="serviceRequest">Service Request</option>
                <option value="followup">Follow Up</option>
              </select>
            </div>

            {/* Remark */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Remark / Description
              </label>
              <textarea
                placeholder="Enter complaint details"
                value={form.remark}
                onChange={(e) => update("remark", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows="4"
                required
              />
            </div>

            {/* Visit  Date */}
            <FormInput
              label="Visit Date"
              type="date"
              value={form.visit_date}
              onChange={(e) => update("visit_date", e.target.value)}
            />

            {/* Visit Time */}
            <FormInput
              label="Visit Time"
              type="time"
              value={form.visit_time}
              onChange={(e) => update("visit_time", e.target.value)}
            />

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                loading={loading}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {loading ? "Registering..." : "Register Complaint"}
              </Button>
              <button
                type="button"
                onClick={() => navigate("/call-centre")}
                className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}





