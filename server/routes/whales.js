// 🟣 ETHEREUM (real transactions — hybrid fallback)
case "ETH":
  try {
    // 1️⃣ Try Ethplorer first
    url = "https://api.ethplorer.io/getTopTransactions?apiKey=freekey";
    const ethplorerRes = await fetch(url);
    if (!ethplorerRes.ok) throw new Error("Ethplorer down or throttled");

    const ethplorerJson = await ethplorerRes.json();
    const ethTxs = ethplorerJson.transactions || [];

    const whales = ethTxs
      .filter((tx) => tx.value && Number(tx.value) / 1e18 >= min)
      .map((tx) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        amount: (Number(tx.value) / 1e18).toFixed(3),
        formatted: `${(Number(tx.value) / 1e18).toFixed(3)} ETH`,
        time: new Date(tx.timestamp * 1000).toLocaleTimeString(),
      }))
      .slice(0, 15);

    if (whales.length > 0) return res.json({
      success: true,
      symbol,
      count: whales.length,
      whales,
      source: "Ethplorer",
      updatedAt: new Date().toISOString(),
    });

    throw new Error("No data from Ethplorer");
  } catch (e) {
    // 2️⃣ Fallback to Blockchair (reliable backup)
    console.warn("⚠️ Ethplorer failed, switching to Blockchair...");
    url =
      "https://api.blockchair.com/ethereum/transactions?q=value(1000000000000000000..)&limit=15"; // ≥1 ETH
    const blockchairRes = await fetch(url);
    if (!blockchairRes.ok)
      throw new Error("Blockchair also failed");

    const blockchairJson = await blockchairRes.json();
    const txs = blockchairJson.data || [];

    const whales = txs.map((tx) => ({
      hash: tx.transaction_hash,
      amount: (tx.value / 1e18).toFixed(3),
      formatted: `${(tx.value / 1e18).toFixed(3)} ETH`,
      time: new Date(tx.time).toLocaleTimeString(),
    }));

    return res.json({
      success: true,
      symbol,
      count: whales.length,
      whales,
      source: "Blockchair",
      updatedAt: new Date().toISOString(),
    });
  }
