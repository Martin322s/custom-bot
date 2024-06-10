const Binance = require('binance-api-node').default;
const WebSocket = require('ws');

const client = Binance({
    apiKey: 'KVB4hxKAlSZ4Ecqhj3KWaPTBchHchXsXlMt3UiAdKTJ3N10crBGbgVX3Z0O0X6wv',
    apiSecret: '408U515fkngx5WYipyUpFPzBvKhttiCwUuvjPR2SIMhBLwXMdUy8si77UqE72Pyx',
});

const buyPriceThreshold = 69386.00; // Example buy price threshold (in USDT)
const sellPriceThreshold = 69414.00; // Example sell price threshold (in USDT)
const minimumTradeAmount = 0.0001; // Minimum trade amount for BTC on Binance

let usdtBalance = 0;
let btcBalance = 0;

async function checkBalances() {
    try {
        const accountInfo = await client.accountInfo();
        const usdt = accountInfo.balances.find(asset => asset.asset === 'USDT');
        const btc = accountInfo.balances.find(asset => asset.asset === 'BTC');

        usdtBalance = parseFloat(usdt.free);
        btcBalance = parseFloat(btc.free);

        console.log(`Balance Check - USDT Balance: ${usdt.free}, BTC Balance: ${btc.free}`);
    } catch (error) {
        console.error('Error in fetching account info:', error);
    }
}

async function placeOrder(side, quantity) {
    try {
        const order = await client.order({
            symbol: 'BTCUSDT',
            side,
            type: 'MARKET',
            quantity: quantity.toFixed(6),
        });
        console.log(`${side} Order Placed:`, order);
        await checkBalances(); // Update balances after placing an order
    } catch (error) {
        console.error(`Error in placing ${side} order:`, error);
    }
}

async function main() {
    await checkBalances(); // Initial balance check

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

    ws.on('message', async (data) => {
        const message = JSON.parse(data);
        const btcUsdtPrice = parseFloat(message.p);

        if (btcUsdtPrice <= buyPriceThreshold && usdtBalance >= (minimumTradeAmount * btcUsdtPrice)) {
            const btcAmountToBuy = (usdtBalance / btcUsdtPrice).toFixed(6);
            console.log(`Buying BTC - Amount: ${btcAmountToBuy}, USDT Balance: ${usdtBalance}`);
            await placeOrder('BUY', parseFloat(btcAmountToBuy));
        }

        if (btcUsdtPrice >= sellPriceThreshold) {
            console.log(`Sell Condition Met - Current Price: ${btcUsdtPrice}, Sell Threshold: ${sellPriceThreshold}`);
            if (btcBalance >= minimumTradeAmount) {
                console.log(`Selling BTC - Amount: ${btcBalance}, BTC Balance: ${btcBalance}`);
                await placeOrder('SELL', btcBalance);
            } else {
                console.log(`Insufficient BTC Balance - Current Balance: ${btcBalance}, Minimum Required: ${minimumTradeAmount}`);
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

main();

process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    process.exit();
});