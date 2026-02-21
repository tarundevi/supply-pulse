import { useState, useEffect } from 'react';

export function useSupplierGraph() {
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/data/supplier_graph.json')
      .then((res) => {
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
          }
          if (res.status >= 500) {
            throw new Error('Server error. The data service may be temporarily unavailable.');
          }
          throw new Error(`Failed to load graph: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setGraph(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError('Unable to connect to data service. Please check your internet connection.');
        } else {
          setError(err.message);
        }
        setLoading(false);
      });
  }, []);

  return { graph, loading, error };
}
