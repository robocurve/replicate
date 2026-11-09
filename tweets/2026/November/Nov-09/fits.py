"""Score-vs-ECI curve fits that respect floors and ceilings, chosen by leave-one-out error.

Errors (cm, lower is better) have a floor near 0 and flatten for weak models; accuracies (%) live between chance (25%)
and 100%. Every candidate is fitted with a robust (soft-L1) loss so the outliers we are looking for don't drag the curve
toward themselves. Selection: lowest leave-one-out median absolute error (robust to the same outliers).

In this folder only fit_form is used: make_data.py passes the curve family for each card directly (the family
that selection picked when the cards were made). The rest is kept as the original analysis code.
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import least_squares

X0 = 155.0  # centring for numerical stability


def _sig(z):
    return 1 / (1 + np.exp(-np.clip(z, -50, 50)))


CANDIDATES = {
    "error": {
        "linear": (lambda p, x: p[0] + p[1] * (x - X0), [30, -1]),
        "exponential decay to a floor": (lambda p, x: np.abs(p[0]) + np.abs(p[1]) * np.exp(-np.abs(p[2]) * (x - X0)), [10, 15, 0.05]),
        "log-linear": (lambda p, x: np.exp(p[0] + p[1] * (x - X0)), [3.3, -0.03]),
    },
    "accuracy": {
        "linear": (lambda p, x: p[0] + p[1] * (x - X0), [50, 1]),
        "logistic, chance to 100%": (lambda p, x: 25 + 75 * _sig((x - p[0]) / max(abs(p[1]), 0.5)), [160, 5]),
        "logistic, chance to a fitted ceiling": (lambda p, x: 25 + (min(max(p[2], 30), 100) - 25) * _sig((x - p[0]) / max(abs(p[1]), 0.5)), [160, 5, 90]),
    },
}


def _fit(f, p0, x, y, scale):
    r = least_squares(lambda p: (f(p, x) - y) / scale, p0, loss="soft_l1", f_scale=1.0, max_nfev=5000)
    return r.x


def loo_scores(x, y, kind):
    """Leave-one-out median absolute error per candidate form."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    scale = max(np.std(y), 1e-6) * 0.5
    out = {}
    for name, (f, p0) in CANDIDATES[kind].items():
        errs = []
        for i in range(len(x)):
            m = np.arange(len(x)) != i
            try:
                errs.append(abs(f(_fit(f, p0, x[m], y[m], scale), x[i:i + 1])[0] - y[i]))
            except Exception:  # noqa: BLE001
                errs.append(np.inf)
        out[name] = float(np.median(errs))
    return out


def fit_form(x, y, kind, name):
    x, y = np.asarray(x, float), np.asarray(y, float)
    f, p0 = CANDIDATES[kind][name]
    p = _fit(f, p0, x, y, max(np.std(y), 1e-6) * 0.5)
    return {"name": name, "predict": (lambda xx, f=f, p=p: f(p, np.asarray(xx, float))), "params": p.tolist()}


def shared_form(datasets, kind):
    """One functional form for every arm: lowest mean LOO error (each arm's error divided by that arm's spread)."""
    per_arm = [loo_scores(x, y, kind) for x, y in datasets]
    spreads = [max(np.std(y), 1e-6) for _, y in datasets]
    score = {n: float(np.mean([pa[n] / sp for pa, sp in zip(per_arm, spreads)])) for n in CANDIDATES[kind]}
    return min(score, key=score.get), score, per_arm


def best_fit(x, y, kind: str):
    """Returns dict(name, predict, loo={name: score}, params). kind = 'error' | 'accuracy'."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    scale = max(np.std(y), 1e-6) * 0.5
    loo = {}
    for name, (f, p0) in CANDIDATES[kind].items():
        errs = []
        for i in range(len(x)):
            m = np.arange(len(x)) != i
            try:
                p = _fit(f, p0, x[m], y[m], scale)
                errs.append(abs(f(p, x[i:i + 1])[0] - y[i]))
            except Exception:  # noqa: BLE001
                errs.append(np.inf)
        loo[name] = float(np.median(errs))
    name = min(loo, key=loo.get)
    f, p0 = CANDIDATES[kind][name]
    p = _fit(f, p0, x, y, scale)
    return {"name": name, "predict": (lambda xx, f=f, p=p: f(p, np.asarray(xx, float))), "loo": loo, "params": p.tolist()}


def band(x, y, kind, name, xx, n=200, seed=0):
    """Bootstrap 95% band for the chosen curve."""
    rng = np.random.default_rng(seed)
    f, p0 = CANDIDATES[kind][name]
    x, y = np.asarray(x, float), np.asarray(y, float)
    scale = max(np.std(y), 1e-6) * 0.5
    preds = []
    for _ in range(n):
        i = rng.integers(0, len(x), len(x))
        try:
            preds.append(f(_fit(f, p0, x[i], y[i], scale), xx))
        except Exception:  # noqa: BLE001
            pass
    preds = np.array(preds)
    return np.percentile(preds, 2.5, axis=0), np.percentile(preds, 97.5, axis=0)
