import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

export default function Chart({ symbol="BTCUSDT", interval="1m" }) {
  const ref = useRef(null);
  const seriesRef = useRef(null);
  const chartRef = useRef(null);
  const [candles, setCandles] = useState([]);

  const loadCandles = async () => {
    const r = await fetch(`/api/candles/${symbol}/${interval}`);
    const j = await r.json();   // [{time, open, high, low, close}]
    setCandles(j);
  };

  useEffect(() => {
    // init chart
    chartRef.current = createChart(ref.current, {
      layout: { background: { color: "#0f1522" }, textColor: "#d1d5db" },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      timeScale: { borderVisible: false },
      rightPriceScale: { borderVisible: false },
      crosshair: { mode: 1 }
    });
    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444", borderVisible: false, wickUpColor: "#22c55e", wickDownColor: "#ef4444"
    });

    loadCandles();
    const poll = setInterval(loadCandles, 5000);
    return () => { clearInterval(poll); chartRef.current.remove(); };
  }, [symbol, interval]);

  useEffect(() => {
    if (seriesRef.current && candles.length) {
      seriesRef.current.setData(candles);
    }
  }, [candles]);

  return <div ref={ref} style={{ width: "100%", height: 420 }} />;
}
