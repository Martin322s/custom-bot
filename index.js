const Binance = require('binance-api-node').default;
const WebSocket = require('ws');
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

const client = Binance({
    apiKey: 'KVB4hxKAlSZ4Ecqhj3KWaPTBchHchXsXlMt3UiAdKTJ3N10crBGbgVX3Z0O0X6wv',
    apiSecret: '408U515fkngx5WYipyUpFPzBvKhttiCwUuvjPR2SIMhBLwXMdUy8si77UqE72Pyx',
});

const buyPriceThreshold = 0.065; // Example buy price threshold (in USDT)
const sellPriceThreshold = 0.070; // Example sell price threshold (in USDT)
const minimumTradeAmount = 10; // Minimum trade amount for DOGE on Binance

let usdtBalance = 0;
let dogeBalance = 0;

async function checkBalances() {
    try {
        const accountInfo = await client.accountInfo();
        const usdt = accountInfo.balances.find(asset => asset.asset === 'USDT');
        const doge = accountInfo.balances.find(asset => asset.asset === 'DOGE');

        usdtBalance = parseFloat(usdt.free);
        dogeBalance = parseFloat(doge.free);

        console.log(`Balance Check - USDT Balance: ${usdt.free}, DOGE Balance: ${doge.free}`);
    } catch (error) {
        console.error('Error in fetching account info:', error);
    }
}

async function placeOrder(side, quantity) {
    try {
        const order = await client.order({
            symbol: 'DOGEUSDT',
            side,
            type: 'MARKET',
            quantity: quantity.toFixed(2),
        });
        console.log(`${side} Order Placed:`, order);
        await checkBalances(); // Update balances after placing an order
    } catch (error) {
        console.error(`Error in placing ${side} order:`, error);
    }
}

async function main() {
    await checkBalances(); // Initial balance check

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/dogeusdt@trade');

    ws.on('message', async (data) => {
        const message = JSON.parse(data);
        const dogeUsdtPrice = parseFloat(message.p);

        console.log(`Price Update - Current DOGE/USDT Price: ${dogeUsdtPrice}`);

        if (dogeUsdtPrice <= buyPriceThreshold && usdtBalance >= (minimumTradeAmount * dogeUsdtPrice)) {
            const dogeAmountToBuy = (usdtBalance / dogeUsdtPrice).toFixed(2);
            console.log(`Buying DOGE - Amount: ${dogeAmountToBuy}, USDT Balance: ${usdtBalance}`);
            await placeOrder('BUY', parseFloat(dogeAmountToBuy));
        }

        if (dogeUsdtPrice >= sellPriceThreshold) {
            console.log(`Sell Condition Met - Current Price: ${dogeUsdtPrice}, Sell Threshold: ${sellPriceThreshold}`);
            if (dogeBalance >= minimumTradeAmount) {
                console.log(`Selling DOGE - Amount: ${dogeBalance}, DOGE Balance: ${dogeBalance}`);
                await placeOrder('SELL', dogeBalance);
            } else {
                console.log(`Insufficient DOGE Balance - Current Balance: ${dogeBalance}, Minimum Required: ${minimumTradeAmount}`);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed. Reconnecting...');
        main(); // Reconnect on close
    });

    // Periodically check balances to keep them updated and log the check
    setInterval(async () => {
        console.log('Periodic Balance Check:');
        await checkBalances();
    }, 10 * 60 * 1000); // Check balances every 10 minutes
}

// Start the bot in the background
main();

// Define API endpoints
app.get('/', (req, res) => {
    res.send('Binance Trading Bot is running.');
});

app.get('/status', async (req, res) => {
    await checkBalances();
    res.json({ usdtBalance, dogeBalance });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});