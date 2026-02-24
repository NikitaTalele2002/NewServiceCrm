import { useState, useCallback } from 'react';

/**
 * useAsync Hook
 * Wrapper for async operations with automatic loading/error state management
 * Eliminates duplicate try-catch-finally patterns across 8+ files
 * 
 * Usage:
 * const { execute, loading, error, data } = useAsync(async () => {
 *   return await api.fetchData();
 * });
 * 
 * execute().then(result => console.log(result));
 */

export const useAsync = (asyncFunction, immediate = false) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Execute the async function
  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const response = await asyncFunction(...args);
        setData(response);
        return response;
      } catch (err) {
        const errorMessage = err?.message || 'An error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction]
  );

  return {
    execute,
    loading,
    error,
    data,
    setData,
    setError,
    setLoading,
  };
};

/**
 * useAsyncEffect Hook
 * Similar to useAsync but runs the async function automatically on mount or dependency change
 * 
 * Usage:
 * const { loading, error, data } = useAsyncEffect(
 *   async () => await api.fetchData(),
 *   [dependency]
 * );
 */
export const useAsyncEffect = (asyncFunction, dependencies = []) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  React.useEffect(() => {
    let isMounted = true;

    const executeAsync = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await asyncFunction();
        if (isMounted) {
          setData(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'An error occurred');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    executeAsync();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return {
    loading,
    error,
    data,
    setData,
    setError,
  };
};

export default useAsync;
