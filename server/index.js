const express = require('express');
const cors = require('cors');
const analysis = require('./analysis');
const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.get('/api/health', (req, res) => res.json({ok:true, now: new Date().toISOString()}));
app.get('/api/assets/:symbol/analysis', async (req, res) => {
  try {
    const symbol = (req.params.symbol || 'BTCUSDT').toUpperCase();
    const timeframe = req.query.tf || '1h';
    const limit = parseInt(req.query.limit || '200', 10);
    const result = await analysis.analyzeSymbol(symbol, timeframe, limit);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
});
app.listen(PORT, ()=> console.log('Server listening on', PORT));
