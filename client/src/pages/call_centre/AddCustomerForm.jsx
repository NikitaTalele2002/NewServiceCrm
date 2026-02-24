import React, { useState } from "react";
import FormInput from "../../components/common/FormInput";
import Button from "../../components/common/Button";
import { createCustomer } from "../api";
import LocationSelector from "../../components/LocationSelector";

export default function AddCustomerForm({ onCreated }) {
  const [form, setForm] = useState({
    name: "",
    mobileNo: "",
    altMobileNo: "",
    email: "",
    address: "",
    houseNumber: "",
    buildingName: "",
    streetName: "",
    landmark: "",
    state: "",
    city: "",
    area: "",
    pinCode: "",
    preferredLanguage: "",
    customerCode: "",
    customerType: "",
    customerPriority: "",
  });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Trim critical fields to prevent duplicate issues
    const trimmedForm = {
      ...form,
      name: form.name.trim(),
      mobileNo: form.mobileNo.trim(),
    };
    const res = await createCustomer(trimmedForm);
    if (onCreated) onCreated(res.customer);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New Customer</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <FormInput
          label="Customer Name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />

        <FormInput
          label="Mobile Number"
          value={form.mobileNo}
          onChange={(e) => update("mobileNo", e.target.value)}
          required
        />

        <FormInput
          label="Alternate Mobile"
          value={form.altMobileNo}
          onChange={(e) => update("altMobileNo", e.target.value)}
        />

        <FormInput
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />

        <div className="md:col-span-3">
          <FormInput
            label="Full Address"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            required
          />
        </div>

        <FormInput
          label="House Number"
          value={form.houseNumber}
          onChange={(e) => update("houseNumber", e.target.value)}
        />

        <FormInput
          label="Building Name"
          value={form.buildingName}
          onChange={(e) => update("buildingName", e.target.value)}
        />

        <FormInput
          label="Street Name"
          value={form.streetName}
          onChange={(e) => update("streetName", e.target.value)}
        />

        <FormInput
          label="Landmark"
          value={form.landmark}
          onChange={(e) => update("landmark", e.target.value)}
        />

        <FormInput
          label="Area"
          value={form.area}
          onChange={(e) => update("area", e.target.value)}
        />

        {/* Location Selector (Spans 2 columns) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>

          <LocationSelector
            value={{
              state: form.state,
              city: form.city,
              pincode: form.pinCode,
            }}
            onChange={(loc) =>
              setForm((prev) => ({
                ...prev,
                state: loc.state,
                city: loc.city,
                pinCode: loc.pincode,
              }))
            }
          />
        </div>

        <FormInput
          label="Preferred Language"
          value={form.preferredLanguage}
          onChange={(e) => update("preferredLanguage", e.target.value)}
        />

        <FormInput
          label="Customer Type"
          value={form.customerType}
          onChange={(e) => update("customerType", e.target.value)}
        />

        <FormInput
          label="Customer Priority"
          value={form.customerPriority}
          onChange={(e) => update("customerPriority", e.target.value)}
        />
      </div>

      <Button type="submit" variant="primary" className="mt-4">
        Create Customer
      </Button>
    </form>
  );
}


