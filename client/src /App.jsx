import React, { useState } from 'react';
import Analysis from './components/Analysis';
export default function App(){
  const [symbol, setSymbol] = useState('BTCUSDT');
  return (
    <div className="container">
      <header>
        <h1>Crypto Advisor — Starter</h1>
        <p>Enter symbol (e.g. BTCUSDT, ETHUSDT) and click Analyze.</p>
      </header>
      <div className="controls">
        <input value={symbol} onChange={e=>setSymbol(e.target.value)} />
        <button id="analyze">Analyze</button>
      </div>
      <Analysis symbol={symbol} />
      <footer>
        <p>Server provides simple buy/sell ranges & FVG detection. Not financial advice.</p>
      </footer>
    </div>
  );
}
// Add small script to trigger analyze button for accessibility (handled in Analysis component)
