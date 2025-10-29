import React, { useEffect, useState } from 'react';
export default function Analysis({symbol}){
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchAnalysis = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(symbol)}/analysis`);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      setData(json);
    } catch (err){
      setError(err.message);
      setData(null);
    } finally { setLoading(false); }
  };
  useEffect(()=> {
    // auto-fetch when symbol changes
    fetchAnalysis();
  }, [symbol]);
  return (
    <div className="analysis">
      <div className="toolbar">
        <button onClick={fetchAnalysis}>Refresh</button>
      </div>
      {loading && <div className="status">Loading...</div>}
      {error && <div className="error">Error: {error}</div>}
      {data && (
        <div className="card">
          <h2>{data.symbol} — {data.price.toLocaleString()}</h2>
          <div className="pill-group">
            <div className="pill buy">Buy (Agg): {formatRange(data.buy_zone.aggressive)}</div>
            <div className="pill buy-soft">Buy: {formatRange(data.buy_zone.standard)}</div>
            <div className="pill sell">Sell: {formatRange(data.sell_zone.standard)}</div>
          </div>
          <div className="indicators">
            <strong>Indicators:</strong>
            <div>EMA50: {Math.round(data.indicators.ema50)}</div>
            <div>EMA200: {Math.round(data.indicators.ema200)}</div>
            <div>ATR14: {Math.round(data.indicators.atr14)}</div>
            <div>VWAP: {Math.round(data.indicators.vwap)}</div>
          </div>
          <div className="fvg">
            <strong>Fair Value Gap:</strong>
            {data.fvg && data.fvg.exists ? (
              <div>{data.fvg.direction} gap at {formatRange(data.fvg.range)}</div>
            ) : <div>None detected</div>}
          </div>
          <pre className="narrative">{data.narrative}</pre>
          <div className="meta">Updated: {new Date(data.updated_at).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
function formatRange(r){
  if(!r || !r.length) return '-';
  return `${Math.round(r[0])} - ${Math.round(r[1])}`;
}
