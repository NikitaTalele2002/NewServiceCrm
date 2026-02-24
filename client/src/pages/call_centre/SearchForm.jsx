import React, { useState } from 'react';
import Button from '../../components/common/Button';
import { useSearch } from '../../hooks/useSearch';
import SearchFormFields from '../../components/search/SearchFormFields';
import SearchResults from '../../components/search/SearchResults';
import NoCustomerFound from '../../components/search/NoCustomerFound';
import CustomerCard from './CustomerCard';
import AddCustomerForm from './AddCustomerForm';

export default function SearchForm() {
  const {
    searchForm,
    updateSearchField,
    updateSearchFields,
    searchResult,
    loading,
    error,
    performSearch,
    clearSearch,
    resetSearchResult,
  } = useSearch();

  const [showAddForm, setShowAddForm] = useState(false); 

  const handleAddNewClick = () => {
    setShowAddForm(true);
  };

  const handleCustomerCreated = () => {
    setShowAddForm(false);
    resetSearchResult();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-l-4 border-blue-600">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">🔍</div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Search</h1>
          </div>
          <p className="text-gray-600 mt-2">
            Search for customers using any available information
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <span className="text-red-600 text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-900">Search Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Search Form Card */}
        {!showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <SearchFormFields
              searchForm={searchForm}
              updateSearchField={updateSearchField}
              updateSearchFields={updateSearchFields}
              loading={loading}
              onSearch={performSearch}
              onClear={clearSearch}
            />
          </div>
        )}

        {/* Results Section */}
        {searchResult && !showAddForm && (
          <div>
            {searchResult.exists ? (
              <div>
                <SearchResults customer={searchResult.customer} />
                {/* Show CustomerCard if it exists */}
                {CustomerCard && <CustomerCard customer={searchResult.customer} />}
              </div>
            ) : (
              <NoCustomerFound onAddNew={handleAddNewClick} />
            )}
          </div>
        )}

        {/* Add Customer Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <Button
              onClick={() => setShowAddForm(false)}
              variant="secondary"
              className="mb-4 text-sm"
            >
              ← Back to Search
            </Button>
            {AddCustomerForm && (
              <AddCustomerForm onCreated={handleCustomerCreated} />
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Need help? Contact customer support at support@company.com</p>
        </div>
      </div>
    </div>
  );
}
