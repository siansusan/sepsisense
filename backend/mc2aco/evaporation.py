"""
evaporation.py

Computes adaptive per-edge pheromone evaporation rates.
High-uncertainty edges (large σ²) evaporate faster, encouraging
the colony to explore them more aggressively.
"""

import numpy as np


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-x))


def compute_evaporation_rates(variance: dict) -> dict:
    """
    Compute adaptive evaporation rate ρ for each edge.

    Formula:
        ρ(A→B) = 0.05 + (0.50 - 0.05) × sigmoid(10 × σ²(A→B))

    Parameters
    ----------
    variance : dict  {(src,dst): σ²}

    Returns
    -------
    dict  {(src,dst): ρ}  with values in (0.05, 0.50)
    """
    rho = {}
    for edge, sigma2 in variance.items():
        rho[edge] = 0.05 + 0.45 * _sigmoid(10.0 * sigma2)
    return rho
