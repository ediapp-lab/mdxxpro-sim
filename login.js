import React, { useState, useContext } from "react";
import { AppCtx } from "./app.js";

const API = "";

export default function Login() {
  const { login } = useContext(AppCtx);
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const post = async (url, body) => {
    const r = await fetch(API + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return r.json();
  };

  const handleRegister = async () => {
    setMsg("Registering…");
    const res = await post("/auth/register", { email, password });
    setMsg(res.error || res.message || "Check email for code.");
  };

  const handleVerify = async () => {
    setMsg("Verifying…");
    const res = await post("/auth/verify", { email, code });
    setMsg(res.error || res.message || "Verified.");
  };

  const handleLogin = async () => {
    setMsg("Logging in…");
    const res = await post("/auth/login", { email, password });
    if (res.token) {
      login(res.token, res.user);
      setMsg("Logged in");
    } else {
      setMsg(res.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0f1522] p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">MDXX Pro</h1>

        <div className="flex gap-2 mb-4">
          {["login", "register", "verify"].map(t => (
            <button key={t}
              className={`px-3 py-2 rounded ${tab===t?"bg-amber-500":"bg-gray-700"}`}
              onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        <div className="space-y-3">
          <input className="w-full p-2 rounded bg-gray-800" placeholder="Email"
            value={email} onChange={e=>setEmail(e.target.value)} />
          {tab!=="verify" && (
            <input className="w-full p-2 rounded bg-gray-800" placeholder="Password" type="password"
              value={password} onChange={e=>setPassword(e.target.value)} />
          )}
          {tab==="verify" && (
            <input className="w-full p-2 rounded bg-gray-800" placeholder="Verification Code"
              value={code} onChange={e=>setCode(e.target.value)} />
          )}
          <button className="w-full bg-amber-500 py-2 rounded"
            onClick={tab==="login"?handleLogin:tab==="register"?handleRegister:handleVerify}>
            {tab==="login"?"Login":tab==="register"?"Register":"Verify"}
          </button>
          <p className="text-sm text-gray-400">{msg}</p>
        </div>
      </div>
    </div>
  );
}
