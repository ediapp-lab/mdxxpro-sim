import React, { useContext, useEffect, useRef, useState } from "react";
import { AppCtx } from "./app.js";
import Chart from "./chart.js";
import MarketTable from "./markettable.js";

export default function Home() {
  const { user, logout } = useContext(AppCtx);
  const [price, setPrice] = useState("-");
  const [balance, setBalance] = useState(0);

  const fetchPrice = async () => {
    const r = await fetch("/api/price/BTCUSDT");
    const j = await r.json();
    setPrice(j.price ? Number(j.price).toFixed(2) : "-");
  };

  const fetchBalance = async () => {
    const token = localStorage.getItem("token");
    const r = await fetch("/user/balance", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await r.json();
    setBalance(j.balance || 0);
  };

  useEffect(() => {
    fetchPrice(); fetchBalance();
    const id = setInterval(fetchPrice, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <header className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Welcome, {user.email}</h2>
        <div className="flex items-center gap-4">
          <span className="text-gray-300">Balance: ${balance.toLocaleString()}</span>
          <button className="bg-gray-700 px-3 py-2 rounded" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-[#0f1522] p-3 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">BTCUSDT</h3>
            <span className="text-amber-400 text-lg">${price}</span>
          </div>
          <Chart symbol="BTCUSDT" interval="1m" />
        </div>

        <div className="bg-[#0f1522] p-3 rounded-xl">
          <h3 className="font-semibold mb-2">Markets</h3>
          <MarketTable />
        </div>
      </div>
    </div>
  );
}
