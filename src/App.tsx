import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STORAGE_KEY = "expense_tracker_v1";

const defaultCategories = [
  "Groceries",
  "Transport",
  "Rent",
  "Utilities",
  "Entertainment",
  "Health",
  "Other",
];

function formatCurrency(num) {
  return num == null
    ? ""
    : num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_dark`);
    return saved ? JSON.parse(saved) : true;
  });

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [form, setForm] = useState({
    id: null,
    title: "",
    amount: "",
    category: "",
    date: "",
  });
  const [categories, setCategories] = useState(() => {
    const raw = localStorage.getItem(`${STORAGE_KEY}_categories`);
    return raw ? JSON.parse(raw) : defaultCategories;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEY}_categories`,
      JSON.stringify(categories)
    );
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_dark`, JSON.stringify(dark));
  }, [dark]);

  const resetForm = () =>
    setForm({ id: null, title: "", amount: "", category: "", date: "" });

  const addOrUpdateExpense = (e) => {
    e.preventDefault();
    const { id, title, amount, category, date } = form;
    const amt = parseFloat(String(amount).replace(/,/g, ""));
    if (!title || isNaN(amt) || !date)
      return alert("Please provide title, valid amount and date.");
    const payload = {
      id: id || uid(),
      title: title.trim(),
      amount: amt,
      category: category || "Other",
      date,
    };
    setExpenses((prev) => {
      if (id) return prev.map((p) => (p.id === id ? payload : p));
      return [payload, ...prev];
    });
    if (category && !categories.includes(category))
      setCategories((prev) => [category, ...prev]);
    resetForm();
  };

  const editExpense = (exp) => {
    setForm({
      id: exp.id,
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      date: exp.date,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteExpense = (id) => {
    if (!window.confirm("Delete this expense?")) return;
    setExpenses((prev) => prev.filter((p) => p.id !== id));
  };

  const clearAll = () => {
    if (!window.confirm("Clear all expenses?")) return;
    setExpenses([]);
  };

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      if (query && !exp.title.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (categoryFilter && exp.category !== categoryFilter) return false;
      if (dateFrom && new Date(exp.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(exp.date) > new Date(dateTo)) return false;
      return true;
    });
  }, [expenses, query, categoryFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, e) => s + e.amount, 0);
    const byCategory = {};
    filtered.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    const chartData = Object.keys(byCategory).map((k) => ({
      category: k,
      amount: Math.round(byCategory[k] * 100) / 100,
    }));
    return { total, chartData };
  }, [filtered]);

  const exportCSV = () => {
    const header = ["id", "title", "amount", "category", "date"];
    const rows = expenses.map((e) => [
      e.id,
      e.title,
      e.amount,
      e.category,
      e.date,
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const parsed = lines.slice(1).map((line) => {
        // naive CSV parse
        const parts = line.split(",");
        return {
          id: parts[0]?.replace(/"/g, ""),
          title: parts[1]?.replace(/"/g, ""),
          amount: parseFloat(parts[2]?.replace(/"/g, "") || 0),
          category: parts[3]?.replace(/"/g, ""),
          date: parts[4]?.replace(/"/g, ""),
        };
      });
      setExpenses((prev) => [...parsed, ...prev].filter(Boolean));
    };
    reader.readAsText(file);
  };

  // quick sample data helper
  const addSample = () => {
    const sample = [
      {
        id: uid(),
        title: "Weekly groceries",
        amount: 72.53,
        category: "Groceries",
        date: isoDaysAgo(3),
      },
      {
        id: uid(),
        title: "Bus pass",
        amount: 21.0,
        category: "Transport",
        date: isoDaysAgo(7),
      },
      {
        id: uid(),
        title: "Internet",
        amount: 49.99,
        category: "Utilities",
        date: isoDaysAgo(15),
      },
      {
        id: uid(),
        title: "Dining out",
        amount: 34.5,
        category: "Entertainment",
        date: isoDaysAgo(4),
      },
    ];
    setExpenses((prev) => [...sample, ...prev]);
  };

  function isoDaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-slate-900 text-slate-100"
          : "min-h-screen bg-gray-50 text-slate-900"
      }
    >
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Expense Tracker</h1>
            <p className="text-sm opacity-70">
              Track your spending — quick, private, and offline
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((d) => !d)}
              className="px-3 py-1 rounded-md border"
            >
              {dark ? "Light" : "Dark"}
            </button>
            <button
              onClick={addSample}
              className="px-3 py-1 rounded-md bg-emerald-500 text-white"
            >
              Add sample
            </button>
            <button onClick={clearAll} className="px-3 py-1 rounded-md border">
              Clear
            </button>
          </div>
        </header>

        {/* Form */}
        <form
          onSubmit={addOrUpdateExpense}
          className={
            "mb-6 p-4 rounded-2xl " + (dark ? "bg-slate-800" : "bg-white")
          }
        >
          <div className="flex flex-col md:flex-row gap-3">
            <input
              className="flex-1 p-2 rounded-md border"
              placeholder="Title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
            <input
              className="w-36 p-2 rounded-md border"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
            <input
              className="w-40 p-2 rounded-md border"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <select
              className="w-44 p-2 rounded-md border"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__new">-- Add new category --</option>
            </select>
          </div>

          {/* add new category inline */}
          {form.category === "__new" && (
            <div className="mt-3 flex gap-2">
              <input
                placeholder="New category"
                className="flex-1 p-2 rounded-md border"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const newC = e.target.value.trim();
                    if (!newC) return;
                    setCategories((prev) => [newC, ...prev]);
                    setForm((f) => ({ ...f, category: newC }));
                    e.target.value = "";
                  }
                }}
              />
              <span className="text-xs opacity-60">Press Enter to add</span>
            </div>
          )}

          <div className="mt-3 flex gap-3 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1 rounded-md border"
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded-md bg-indigo-600 text-white"
            >
              {form.id ? "Update" : "Add"}
            </button>
          </div>
        </form>

        {/* Controls + Summary */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div
            className={
              "p-4 rounded-2xl " + (dark ? "bg-slate-800" : "bg-white")
            }
          >
            <h3 className="text-sm opacity-70">Filters</h3>
            <div className="mt-2 flex flex-col gap-2">
              <input
                placeholder="Search title"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="p-2 rounded-md border"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 rounded-md border"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="p-2 rounded-md border"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="p-2 rounded-md border"
                />
              </div>
            </div>
          </div>

          <div
            className={
              "p-4 rounded-2xl col-span-2 " +
              (dark ? "bg-slate-800" : "bg-white")
            }
          >
            <h3 className="text-sm opacity-70">Summary</h3>
            <div className="mt-3 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div>
                <div className="text-xs opacity-60">Total</div>
                <div className="text-2xl font-semibold">
                  {formatCurrency(totals.total)}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-xs opacity-70">Export</label>
                <button
                  onClick={exportCSV}
                  className="px-3 py-1 rounded-md border"
                >
                  CSV
                </button>
                <label className="px-3 py-1 rounded-md border cursor-pointer">
                  Import{" "}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => importCSV(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Chart + List */}
        <div className="grid md:grid-cols-2 gap-4">
          <div
            className={
              "p-4 rounded-2xl " + (dark ? "bg-slate-800" : "bg-white")
            }
            style={{ height: 320 }}
          >
            <h3 className="text-sm opacity-70 mb-3">Spending by Category</h3>
            {totals.chartData.length === 0 ? (
              <div className="text-sm opacity-60">No data to show</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={totals.chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div
            className={
              "p-4 rounded-2xl " + (dark ? "bg-slate-800" : "bg-white")
            }
          >
            <h3 className="text-sm opacity-70">Expenses ({filtered.length})</h3>
            <div className="mt-3 space-y-3 max-h-[360px] overflow-auto">
              {filtered.length === 0 && (
                <div className="text-sm opacity-60">
                  No expenses match your filters.
                </div>
              )}
              {filtered.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-2 rounded-md border"
                >
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs opacity-60">
                      {e.category} • {e.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div>{formatCurrency(e.amount)}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editExpense(e)}
                        className="px-2 py-1 rounded-md border"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        className="px-2 py-1 rounded-md border"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="mt-6 text-xs opacity-60 text-center">
          Local only — no servers, your data is stored in your browser.
        </footer>
      </div>
    </div>
  );
}
