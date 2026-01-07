const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from your frontend (Netlify/localhost)
app.use(express.json()); // Parse JSON bodies

// --- Helper Functions (Replicated from Frontend) ---

// Power Model: D(p) = D0 * (p/p0)^ε
function demandPower(baseDemand, elasticity, price, p0 = 1) {
  // Prevent 0 or negative price from breaking Math.pow
  const safePrice = Math.max(price, 0.0001);
  const d = baseDemand * Math.pow(safePrice / p0, elasticity);
  return Math.max(d, 0);
}

// Linear Model: Constructs a line passing through a reference point
// derived from the power model to ensure continuity.
function demandLinear(baseDemand, elasticity, price, maxPrice) {
  const pr = Math.max(maxPrice / 2, 0.01);
  const Dr = demandPower(baseDemand, elasticity, pr);
  
  // Slope (a) = (Elasticity * Demand) / Price
  const a = (elasticity * Dr) / pr; 
  
  // Intercept (m) = Demand - (Slope * Price)
  const m = Dr - a * pr; 
  
  const d = m + a * price;
  return Math.max(d, 0);
}

// --- The API Endpoint ---

app.post('/api/analyze', (req, res) => {
  try {
    const { baseDemand, elasticity, cost, priceMin, priceMax, model } = req.body;

    // Basic Validation
    if (baseDemand === undefined || elasticity === undefined || cost === undefined) {
      return res.status(400).json({ error: "Missing required parameters: baseDemand, elasticity, or cost." });
    }

    // Parse inputs as numbers
    const D0 = Number(baseDemand);
    const e = Number(elasticity);
    const c = Number(cost);
    let pMin = Number(priceMin);
    let pMax = Number(priceMax);

    // Fallback if range is invalid
    if (pMax <= pMin) pMax = pMin + 1;

    // Generate 120 data points (matching your frontend logic)
    const steps = 120;
    const data = [];

    for (let i = 0; i <= steps; i++) {
      // Calculate current price
      const price = pMin + (i / steps) * (pMax - pMin);

      // Calculate Demand based on model type
      let demand = 0;
      if (model === 'linear') {
        demand = demandLinear(D0, e, price, pMax);
      } else {
        // Default to 'power' model
        demand = demandPower(D0, e, price);
      }

      // Calculate Revenue and Profit
      const revenue = price * demand;
      const profit = (price - c) * demand;

      data.push({
        price: parseFloat(price.toFixed(2)),
        demand: parseFloat(demand.toFixed(2)),
        revenue: parseFloat(revenue.toFixed(2)),
        profit: parseFloat(profit.toFixed(2))
      });
    }

    // Send response back to frontend
    res.json({ data });

  } catch (error) {
    console.error("Error calculating analysis:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});