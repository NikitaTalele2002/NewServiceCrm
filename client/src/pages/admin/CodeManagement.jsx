import React, { useState } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import FormInput from '../../components/common/FormInput';
import FilterSelect from '../../components/common/FilterSelect';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function CodeManagement() {
  const { loading, error, searchMasterData } = useAdmin();
  
  const [type, setType] = useState('product');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const typeLabels = {
    product: "Product",
    group: "Group",
    pincode: "Pincode",
    banks: "Banks",
    callsources: "Call Sources",
    documenttype: "Document Type",
    calltype: "Call Type",
    cancelreason: "Cancel Reason",
    cities: "Cities",
    couriers: "Couriers",
    languages: "Languages",
    customertype: "Customer Type",
    state: "State",
    roles: "Roles",
    productgroups: "Product Groups",
    zones: "Zones",
  };

  async function search() {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      const result = await searchMasterData(type, q);
      if (result.success) {
        setRows(result.data.rows || []);
        setPage(1);
        setSuccessMessage(`Found ${(result.data.rows || []).length} records`);
      } else {
        setErrorMessage('Search failed: ' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Search failed');
    }
  }

  function downloadCSV() {
    if (!rows.length) {
      setErrorMessage("No data to download");
      return;
    }

    const keys = Object.keys(rows[0]);
    const csv = [
      keys.join(","),
      ...rows.map(r => keys.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_export.csv`;
    a.click();

    URL.revokeObjectURL(url);
    setSuccessMessage("CSV downloaded successfully");
  }

  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Code Management</h2>

      {errorMessage && <ErrorMessage message={errorMessage} />}
      {successMessage && <div className="text-green-600 mb-4 p-3 bg-green-50 rounded">{successMessage}</div>}

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border">
        <FilterSelect
          label="Select Type"
          value={type}
          onChange={setType}
          options={Object.entries(typeLabels).map(([key, label]) => ({ id: key, label }))}
          optionValue="id"
          optionLabel="label"
        />

        <FormInput
          label="Search Term"
          name="search"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Enter search term"
        />

        <div className="flex gap-2 items-end">
          <Button
            variant="primary"
            onClick={search}
            loading={loading}
          >
            {loading ? "Searching..." : "Search"}
          </Button>

          <Button
            variant="success"
            onClick={downloadCSV}
          >
            Download CSV
          </Button>
        </div>
      </div>

      <div>
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                {paginatedRows.length > 0 ? (
                  Object.keys(paginatedRows[0]).map((k) => (
                    <th key={k} className="p-2 border">{k}</th>
                  ))
                ) : (
                  <th className="p-2">No results</th>
                )}
              </tr>
            </thead>

            <tbody>
              {paginatedRows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {Object.keys(paginatedRows[0] || {}).map((k) => (
                    <td key={k} className="p-2 border">{String(r[k] || "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>

            <span className="text-sm">
              Page <b>{page}</b> of <b>{totalPages}</b>
            </span>

            <Button
              variant="secondary"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
