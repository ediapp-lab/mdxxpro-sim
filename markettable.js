import React, { useEffect, useState } from "react";

const symbols = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT"];

export default function MarketTable() {
  const [rows, setRows] = useState([]);

  const fetchAll = async () => {
    const data = await Promise.all(symbols.map(async s => {
      const r = await fetch(`/api/price/${s}`);
      const j = await r.json();
      return { symbol: s, price: j.price ? Number(j.price) : null };
    }));
    setRows(data);
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 7000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-2">
      {rows.map(r=>(
        <div key={r.symbol} className="flex items-center justify-between bg-gray-800 p-2 rounded">
          <div className="font-mono">{r.symbol}</div>
          <div className="text-amber-400">{r.price ? r.price.toFixed(2) : "-"}</div>
        </div>
      ))}
    </div>
  );
}
