import React, { createContext, useEffect, useMemo, useState } from "react";
import Login from "./login.js";
import Home from "./home.js";
import Admin from "./admin.js";

export const AppCtx = createContext(null);

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = (t, u) => {
    setToken(t); setUser(u);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
  };
  const logout = () => {
    setToken(""); setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return { token, user, login, logout };
}

export default function App() {
  const auth = useAuth();
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setRoute(path);
  };

  const ctxVal = useMemo(() => ({ ...auth, navigate }), [auth, route]);

  if (!auth.user) return <Login />;

  if (auth.user.role === "admin") return <Admin />;

  return <Home />;
}
