import React, { useContext, useEffect, useState } from "react";
import { AppCtx } from "./app.js";

export default function Admin() {
  const { user, logout } = useContext(AppCtx);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [override, setOverride] = useState({ symbol: "BTCUSDT", price: "", ohlc: "" });
  const token = localStorage.getItem("token");

  const getUsers = async () => {
    const r = await fetch("/admin/users", { headers: { Authorization: `Bearer ${token}` } });
    setUsers(await r.json());
  };
  const getLogs = async () => {
    const r = await fetch("/admin/logs", { headers: { Authorization: `Bearer ${token}` } });
    setLogs(await r.json());
  };
  const adjust = async (userId, delta) => {
    await fetch("/admin/adjust-balance", {
      method: "POST",
      headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, delta: Number(delta) })
    });
    getUsers();
  };
  const pushOverride = async () => {
    const payload = { symbol: override.symbol };
    if (override.price) payload.price = Number(override.price);
    if (override.ohlc) {
      try {
        payload.ohlc = JSON.parse(override.ohlc); // {open,high,low,close,time}
      } catch {
        alert("Invalid OHLC JSON"); return;
      }
    }
    await fetch("/admin/override", {
      method: "POST",
      headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    alert("Override sent.");
  };

  useEffect(() => { getUsers(); getLogs(); }, []);

  return (
    <div className="p-4 space-y-4">
      <header className="flex justify-between">
        <h2 className="text-xl font-semibold">Admin – {user.email}</h2>
        <button className="bg-gray-700 px-3 py-2 rounded" onClick={logout}>Logout</button>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-[#0f1522] p-3 rounded-xl">
          <h3 className="font-semibold mb-2">Students</h3>
          <div className="space-y-2">
            {users.map(u=>(
              <div key={u.id} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                <div>
                  <div className="font-mono text-sm">{u.email}</div>
                  <div className="text-xs text-gray-400">Balance: ${u.balance}</div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-amber-500 px-2 py-1 rounded" onClick={()=>adjust(u.id, 1000)}>+1k</button>
                  <button className="bg-amber-500 px-2 py-1 rounded" onClick={()=>adjust(u.id, -1000)}>-1k</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0f1522] p-3 rounded-xl">
          <h3 className="font-semibold mb-2">Override Live Data</h3>
          <div className="grid gap-2">
            <input className="p-2 rounded bg-gray-800" placeholder="Symbol (e.g. BTCUSDT)"
              value={override.symbol} onChange={e=>setOverride({...override, symbol:e.target.value.toUpperCase()})}/>
            <input className="p-2 rounded bg-gray-800" placeholder="Price override (optional)"
              value={override.price} onChange={e=>setOverride({...override, price:e.target.value})}/>
            <textarea className="p-2 rounded bg-gray-800 h-28"
              placeholder='OHLC JSON (optional): {"open":...,"high":...,"low":...,"close":...,"time": 1724467200000}'
              value={override.ohlc} onChange={e=>setOverride({...override, ohlc:e.target.value})}/>
            <button className="bg-amber-500 py-2 rounded" onClick={pushOverride}>Send Override</button>
          </div>
        </section>
      </div>

      <section className="bg-[#0f1522] p-3 rounded-xl">
        <h3 className="font-semibold mb-2">Recent Logs</h3>
        <div className="space-y-1 max-h-64 overflow-auto text-sm">
          {logs.map(l=>(
            <div key={l.id} className="bg-gray-800 p-2 rounded">
              [{new Date(l.ts).toLocaleString()}] {l.event} – {l.details}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

