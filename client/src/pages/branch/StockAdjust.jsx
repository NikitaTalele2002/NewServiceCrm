import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranch } from '../../hooks/useBranch';
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';

export default function StockAdjust() {
  const navigate = useNavigate();
  const { loading, error, adjustBranchInventory } = useBranch();
  
  const [sku, setSku] = useState('');
  const [deltaGood, setDeltaGood] = useState(0);
  const [deltaDef, setDeltaDef] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!sku) {
      setErrorMessage('SKU is required');
      return;
    }

    setIsLoading(true);
    try {
      const result = await adjustBranchInventory({
        sku,
        deltaGood: Number(deltaGood),
        deltaDefective: Number(deltaDef)
      });

      if (result.success) {
        setSuccessMessage('Adjusted successfully');
        setTimeout(() => navigate('/branch/inventory'), 800);
      } else {
        setErrorMessage(result.error || 'Stock adjustment failed');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Stock adjustment failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Stock Adjustment</h2>
      
      {errorMessage && <ErrorMessage message={errorMessage} />}
      {successMessage && <SuccessMessage message={successMessage} />}
      {error && <ErrorMessage message={error} />}

      <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <FormInput 
          label="SKU" 
          name="sku" 
          type="text" 
          value={sku} 
          onChange={(e) => setSku(e.target.value)}
          required/>
        
        <FormInput 
          label="Delta Good (+/-)" 
          name="deltaGood" 
          type="number" 
          value={deltaGood} 
          onChange={(e) => setDeltaGood(e.target.value)}/>
        
        <FormInput 
          label="Delta Defective (+/-)" 
          name="deltaDef" 
          type="number" 
          value={deltaDef} 
          onChange={(e) => setDeltaDef(e.target.value)}/>
        
        <div className="flex gap-3 pt-4">
          <Button 
            type="submit" 
            variant="success" 
            loading={isLoading || loading}>
            Submit
          </Button>

          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}








