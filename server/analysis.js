const axios = require('axios');
// Utility indicator functions
function toFloat(x){ return parseFloat(x); }
function ema(values, period){
  const k = 2 / (period + 1);
  let emaArr = [];
  let prev;
  for(let i=0;i<values.length;i++){
    const v = values[i];
    if(i===0) { prev = v; emaArr.push(v); continue; }
    const cur = (v * k) + (prev * (1 - k));
    emaArr.push(cur);
    prev = cur;
  }
  return emaArr;
}
function atr(candles, period=14){
  // candles: array of [open, high, low, close] objects
  const trs = [];
  for(let i=1;i<candles.length;i++){
    const prevC = candles[i-1].close;
    const high = candles[i].high;
    const low = candles[i].low;
    const tr = Math.max(high - low, Math.abs(high - prevC), Math.abs(low - prevC));
    trs.push(tr);
  }
  // simple SMA of TRs for ATR
  const slice = trs.slice(-period);
  if(slice.length===0) return 0;
  const sum = slice.reduce((a,b)=>a+b,0);
  return sum / slice.length;
}
function detectFVG(candles){
  // Simple gap detection:
  // look for adjacent candles where current low > prev high (bullish gap)
  // or current high < prev low (bearish gap)
  for(let i=candles.length-1; i>0; i--){
    const prev = candles[i-1];
    const cur = candles[i];
    if(cur.low > prev.high){
      return { exists: true, direction: 'bullish', range: [prev.high, cur.low], index: i };
    } else if(cur.high < prev.low){
      return { exists: true, direction: 'bearish', range: [cur.high, prev.low], index: i };
    }
  }
  return { exists: false };
}
async function fetchCandles(symbol='BTCUSDT', interval='1h', limit=200){
  // Binance public Klines
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const resp = await axios.get(url, { timeout: 10000 });
  // each kline: [ openTime, open, high, low, close, volume, closeTime, ... ]
  return resp.data.map(k => ({
    openTime: k[0],
    open: toFloat(k[1]),
    high: toFloat(k[2]),
    low: toFloat(k[3]),
    close: toFloat(k[4]),
    volume: toFloat(k[5]),
    closeTime: k[6]
  }));
}
function findRecentSupport(candles, lookback=20){
  const slice = candles.slice(-lookback);
  const lows = slice.map(c=>c.low);
  return Math.min(...lows);
}
function findRecentResistance(candles, lookback=20){
  const slice = candles.slice(-lookback);
  const highs = slice.map(c=>c.high);
  return Math.max(...highs);
}
function buildNarrative({price, ema50, ema200, vwap, fvg, buyAggressive, buyStandard, sellStandard, support, resistance, atr}){
  const parts = [];
  parts.push(`Price: ${price.toFixed(2)} | EMA50: ${ema50.toFixed(2)} | EMA200: ${ema200.toFixed(2)} | ATR14: ${atr.toFixed(2)}`);
  const bias = ema50 > ema200 ? 'Bullish bias (EMA50 > EMA200).' : 'Bearish bias (EMA50 <= EMA200).';
  parts.push(bias);
  parts.push(`Support ~ ${support.toFixed(2)}, Resistance ~ ${resistance.toFixed(2)}.`);
  parts.push(`Aggressive buy zone: ${buyAggressive.map(v=>v.toFixed(2)).join(' - ')}.`);
  parts.push(`Standard buy zone: ${buyStandard.map(v=>v.toFixed(2)).join(' - ')}.`);
  parts.push(`Sell zone: ${sellStandard.map(v=>v.toFixed(2)).join(' - ')}.`);
  if(fvg && fvg.exists){
    parts.push(`Fair Value Gap detected (${fvg.direction}) at ${fvg.range.map(v=>v.toFixed(2)).join(' - ')}.`);
  } else {
    parts.push('No clear Fair Value Gap detected in recent candles.');
  }
  parts.push('Use stop-loss around 1*ATR below support for conservative positions.');
  return parts.join(' ');
}
function computeVWAP(candles){
  let pv = 0, vol = 0;
  for(const c of candles){
    const typical = (c.high + c.low + c.close)/3;
    pv += typical * c.volume;
    vol += c.volume;
  }
  if(vol===0) return candles[candles.length-1].close;
  return pv / vol;
}
async function analyzeSymbol(symbol='BTCUSDT', timeframe='1h', limit=200){
  const candles = await fetchCandles(symbol, timeframe, limit);
  if(!candles || candles.length===0) throw new Error('No candle data');
  const closes = candles.map(c=>c.close);
  const ema50arr = ema(closes, 50);
  const ema200arr = ema(closes, 200);
  const ema50 = ema50arr[ema50arr.length-1];
  const ema200 = ema200arr[ema200arr.length-1];
  const price = closes[closes.length-1];
  const atr14 = atr(candles, 14);
  const vwap = computeVWAP(candles);
  const support = findRecentSupport(candles, 20);
  const resistance = findRecentResistance(candles, 20);
  const buyAggressive = [support, Math.min(support + 0.25 * atr14, support * 1.02)];
  const buyStandard = [support, Math.min(support + 0.5 * atr14, support * 1.03)];
  const sellStandard = [resistance - Math.min(0.75*atr14, resistance*0.03), resistance];
  const fvg = detectFVG(candles);
  const narrative = buildNarrative({
    price, ema50, ema200, vwap, fvg, buyAggressive, buyStandard, sellStandard, support, resistance, atr: atr14
  });
  const score = (ema50 > ema200 ? 2 : -1) + (vwap < price ? 1 : 0) + (fvg.exists ? 1 : 0);
  return {
    symbol, timeframe, price, indicators: { ema50, ema200, atr14, vwap },
    buy_zone: { aggressive: buyAggressive, standard: buyStandard, confidence: score },
    sell_zone: { standard: sellStandard },
    fvg, narrative, updated_at: new Date().toISOString()
  };
}
module.exports = { analyzeSymbol };
