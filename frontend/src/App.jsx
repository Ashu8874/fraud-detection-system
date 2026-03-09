import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const initialForm = {
  userId: "",
  amount: "",
  currency: "USD",
  merchant: "",
  location: "",
  paymentMethod: "",
  deviceId: ""
};

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function getRiskClass(level) {
  if (level === "HIGH") {
    return "risk-pill high";
  }

  if (level === "MEDIUM") {
    return "risk-pill medium";
  }

  return "risk-pill low";
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const [alerts, setAlerts] = useState([]);

  async function loadData() {
    try {
      const [recentRes, alertRes] = await Promise.all([
        fetch(`${API_BASE}/api/transactions/recent?limit=10`),
        fetch(`${API_BASE}/api/transactions/alerts`)
      ]);

      const recentJson = await recentRes.json();
      const alertJson = await alertRes.json();

      setRecent(recentJson.transactions || []);
      setAlerts(alertJson.alerts || []);
    } catch (requestError) {
      setError("Failed to fetch dashboard data.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE}/api/transactions/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze transaction.");
      }

      setResult(data);
      setForm(initialForm);
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  const latestRisk = result?.transaction?.riskScore ?? recent[0]?.riskScore ?? "--";
  const latestLevel = result?.transaction?.riskLevel ?? recent[0]?.riskLevel ?? "LOW";

  return (
    <main className="layout">
      <header className="hero reveal">
        <div className="hero-copy">
          <p className="eyebrow">Live Monitoring</p>
          <h1>Fraud Detection Dashboard</h1>
          <p className="hero-subtitle">
            Analyze transactions in real time with rule-based checks plus Gemini signals.
          </p>
        </div>
        <div className="kpi-grid">
          <article className="kpi">
            <p>Recent Transactions</p>
            <h3>{recent.length}</h3>
          </article>
          <article className="kpi">
            <p>Alerts Triggered</p>
            <h3>{alerts.length}</h3>
          </article>
          <article className="kpi">
            <p>Latest Risk</p>
            <h3>{latestRisk}</h3>
            <span className={getRiskClass(latestLevel)}>{latestLevel}</span>
          </article>
        </div>
      </header>

      <section className="panel reveal delay-1">
        <h2>Analyze Transaction</h2>
        <form onSubmit={submit} className="form-grid">
          <label>
            User ID
            <input
              name="userId"
              placeholder="user_001"
              value={form.userId}
              onChange={updateField}
              required
            />
          </label>
          <label>
            Amount
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="1500.00"
              value={form.amount}
              onChange={updateField}
              required
            />
          </label>
          <label>
            Currency
            <input
              name="currency"
              placeholder="USD"
              value={form.currency}
              onChange={updateField}
              required
            />
          </label>
          <label>
            Merchant
            <input
              name="merchant"
              placeholder="Online Retailer"
              value={form.merchant}
              onChange={updateField}
            />
          </label>
          <label>
            Location
            <input
              name="location"
              placeholder="New York"
              value={form.location}
              onChange={updateField}
            />
          </label>
          <label>
            Payment Method
            <input
              name="paymentMethod"
              placeholder="card / prepaid / crypto"
              value={form.paymentMethod}
              onChange={updateField}
            />
          </label>
          <label>
            Device ID
            <input
              name="deviceId"
              placeholder="dev_x123456"
              value={form.deviceId}
              onChange={updateField}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      {result?.transaction && (
        <section className="panel result reveal delay-2">
          <h2>Latest Result</h2>
          <div className="result-headline">
            <p className="score">
              {result.transaction.riskScore}
              <span>/100</span>
            </p>
            <span className={getRiskClass(result.transaction.riskLevel)}>
              {result.transaction.riskLevel}
            </span>
          </div>
          <p>
            <strong>Rule Signals:</strong>
          </p>
          <div className="chip-row">
            {result.transaction.ruleSignals.length > 0 ? (
              result.transaction.ruleSignals.map((signal) => (
                <span key={signal} className="chip">
                  {signal}
                </span>
              ))
            ) : (
              <span className="chip">None</span>
            )}
          </div>
          <p>
            <strong>AI Signals:</strong>
          </p>
          <div className="chip-row">
            {result.transaction.aiSignals.length > 0 ? (
              result.transaction.aiSignals.map((signal) => (
                <span key={signal} className="chip ai">
                  {signal}
                </span>
              ))
            ) : (
              <span className="chip ai">None</span>
            )}
          </div>
          <p>
            <strong>AI Summary:</strong> {result.transaction.aiExplanation || "N/A"}
          </p>
          <p>
            <strong>Alert:</strong> {result.alert ? "Triggered" : "Not triggered"}
          </p>
        </section>
      )}

      <div className="split">
        <section className="panel reveal delay-3">
          <h2>Recent Transactions</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Risk</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((tx) => (
                  <tr key={tx.transactionId}>
                    <td>{tx.transactionId.slice(0, 8)}</td>
                    <td>{tx.userId}</td>
                    <td>
                      {tx.currency} {tx.amount}
                    </td>
                    <td>
                      <span className={getRiskClass(tx.riskLevel)}>
                        {tx.riskScore} {tx.riskLevel}
                      </span>
                    </td>
                    <td>{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan="5">No transactions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel reveal delay-4">
          <h2>Triggered Alerts</h2>
          <ul className="alerts">
            {alerts.map((tx) => (
              <li key={tx.transactionId} className="alert-card">
                <p>
                  <strong>{tx.transactionId.slice(0, 8)}</strong>
                </p>
                <p>User: {tx.userId}</p>
                <p>Risk: {tx.riskScore}</p>
                <span className={getRiskClass(tx.riskLevel)}>{tx.riskLevel}</span>
              </li>
            ))}
            {alerts.length === 0 && <li className="alert-card">No alerts triggered.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
