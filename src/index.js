const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path');

const BINANCE_API_URL = 'https://fapi.binance.com/fapi/v1/ticker/price?symbol=LTCUSDT';

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const leverage = 1;              // 1x leverage
const amountInUSDT = 100;        // Simulated trading amount (100 USDT)
const discrepancyThreshold = 0.1;  // Price difference of 0.1 USDT triggers trade

let position = 'long';           // Track current position (long/short)
let entryPrice = null;           // Entry price for the position
let profit = 0;                  // Track cumulative profit
let totalProfit = 0;             // Track total profit
let isTrading = false;           // Flag to track if trading is in progress

// Set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// Endpoint to serve the main page
app.get('/', (req, res) => {
  res.render('home'); // Render the home.ejs page
});

// Endpoint to handle claim requests
app.post('/claim', async (req, res) => {
  const currentPrice = await getCurrentPrice();
  
  if (position) {
    await closePosition(currentPrice);
  }

  // Determine the new position based on the previous position
  if (position === 'long') {
    await openLong(currentPrice);
  } else if (position === 'short') {
    await openShort(currentPrice);
  }

  // Emit the trade update after the claim process is complete
  io.emit('tradeUpdate', {
    profit: totalProfit.toFixed(2),
    position,
    entryPrice: entryPrice ? entryPrice.toFixed(2) : '0.00',
    currentPrice: currentPrice.toFixed(2),
    currentProfitOrLoss: '0.00' // Reset current P/L
  });

  res.sendStatus(200); // Respond with a status code without a message
});

// Endpoint to handle start/stop requests
app.post('/startstop', async (req, res) => {
  if (isTrading) {
    // Stop trading
    isTrading = false;
    const currentPrice = await getCurrentPrice();
    if (position) {
      await closePosition(currentPrice);
    }
    res.json({ message: 'Trading stopped' });
  } else {
    // Start trading
    isTrading = true;
    const initialPrice = await getCurrentPrice();
    if (initialPrice) {
      await openLong(initialPrice);  // Start with a long position
      monitorMarket();
    }
    res.json({ message: 'Trading started' });
  }
});

// Function to fetch current LTC/USDT price from Binance
async function getCurrentPrice() {
  try {
    const response = await axios.get(BINANCE_API_URL);
    return parseFloat(response.data.price);
  } catch (error) {
    console.error('Error fetching price:', error.message);
    return null;
  }
}

// Function to simulate opening a long position
async function openLong(price) {
  entryPrice = price;
  position = 'long';
  console.log(`Opened long position at ${price}`);
}

// Function to simulate opening a short position
async function openShort(price) {
  entryPrice = price;
  position = 'short';
  console.log(`Opened short position at ${price}`);
}

// Function to simulate closing the current position and calculating profit or loss
async function closePosition(price) {
  const priceDifference = position === 'long'
    ? price - entryPrice   // Profit if the price goes up in a long position
    : entryPrice - price;  // Profit if the price goes down in a short position

  const tradeProfit = priceDifference * (amountInUSDT / entryPrice);
  totalProfit += tradeProfit; // Update total profit
  console.log(`Closed ${position} position at ${price}. Profit/Loss: ${tradeProfit.toFixed(2)} USDT`);

  // Emit the updated profit and trade status to the frontend
  io.emit('tradeUpdate', {
    profit: totalProfit.toFixed(2),
    position,
    entryPrice: entryPrice ? entryPrice.toFixed(2) : '0.00',
    currentPrice: price.toFixed(2),
    currentProfitOrLoss: tradeProfit.toFixed(2)
  });
}

// Function to calculate current profit or loss based on the open position
function calculateCurrentProfit(currentPrice) {
  const priceDifference = position === 'long'
    ? currentPrice - entryPrice
    : entryPrice - currentPrice;
  return (priceDifference * (amountInUSDT / entryPrice)).toFixed(2);
}

// Main function to monitor the market and switch positions
async function monitorMarket() {
  while (isTrading) {
    const currentPrice = await getCurrentPrice();
    if (!currentPrice) continue;

    console.log(`Current price: ${currentPrice}`);

    // Check discrepancy and switch position
    if (position === 'long' && currentPrice < entryPrice - discrepancyThreshold) {
      await closePosition(currentPrice);
      await openShort(currentPrice);
    } else if (position === 'short' && currentPrice > entryPrice + discrepancyThreshold) {
      await closePosition(currentPrice);
      await openLong(currentPrice);
    }

    // Emit the updated profit, position, entry price, and current price to the frontend every 2 seconds
    const currentProfitOrLoss = calculateCurrentProfit(currentPrice);
    io.emit('tradeUpdate', {
      profit: totalProfit.toFixed(2),
      position,
      entryPrice: entryPrice ? entryPrice.toFixed(2) : '0.00',
      currentPrice: currentPrice.toFixed(2),
      currentProfitOrLoss
    });

    await new Promise(resolve => setTimeout(resolve, 2000));  // Run every 2 seconds
  }
}

// Start server on port 5010
server.listen(5010, () => {
  console.log('Server running on http://localhost:5010');
});