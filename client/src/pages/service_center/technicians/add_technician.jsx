// src/pages/service_center/AddTechnician.jsx
import React, { useState, useEffect } from "react";
import FormInput from "../../../components/common/FormInput";
import FilterSelect from "../../../components/common/FilterSelect";
import Button from "../../../components/common/Button";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function AddTechnician({ selectedTech, onSave }) {
  const initialFormData = {
    id: "",
    name: "",
    mobileNo: "",
    email: "",
    status: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If editing, populate data
  useEffect(() => {
    if (selectedTech) setFormData(selectedTech);
  }, [selectedTech]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");
    
    if (!formData.name || !formData.mobileNo || !formData.email || !formData.status) {
      setErrorMessage("All fields are required");
      return;
    }

    setIsLoading(true);
    try {
      onSave(formData);
      setFormData(initialFormData);
    } catch (err) {
      setErrorMessage(err.message || "Failed to save technician");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-bold mb-6">
        {formData.id ? "Edit Technician" : "Add Technician"}
      </h2>

      {errorMessage && <ErrorMessage message={errorMessage} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter Name"
            required
          />

          <FormInput
            label="Mobile No."
            name="mobileNo"
            type="tel"
            value={formData.mobileNo}
            onChange={handleChange}
            placeholder="Enter Mobile Number"
            required
          />

          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter Email"
            required
          />

          <FilterSelect
            label="Status"
            value={formData.status}
            onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
            options={[
              { id: "Active", label: "Active" },
              { id: "Deactive", label: "Deactive" }
            ]}
            optionValue="id"
            optionLabel="label"
            required
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            type="submit" 
            variant="primary" 
            loading={isLoading}
          >
            {formData.id ? "Update Technician" : "Add Technician"}
          </Button>
        </div>
      </form>
    </div>
  );
}

