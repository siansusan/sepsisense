"""
graph_builder.py

Constructs a directed weighted transition graph from patient state sequences.
Nodes represent discrete clinical states; edge weights are raw transition counts.
"""

import networkx as nx
from tqdm import tqdm


def build_transition_graph(sequences: dict) -> nx.DiGraph:
    """
    Build a directed graph where each edge (A->B) has weight = transition count.

    Parameters
    ----------
    sequences : dict
        Patient_ID -> list of (state, hour) from discretizer.build_patient_sequences

    Returns
    -------
    nx.DiGraph with edge attribute 'weight'
    """
    G = nx.DiGraph()

    for pid, seq in tqdm(sequences.items(), desc="Building transition graph"):
        states = [s for s, _ in seq]
        for i in range(len(states) - 1):
            src, dst = states[i], states[i + 1]
            if G.has_edge(src, dst):
                G[src][dst]["weight"] += 1
            else:
                G.add_edge(src, dst, weight=1)

    n_nodes = G.number_of_nodes()
    n_edges = G.number_of_edges()
    print(f"[graph_builder] Graph: {n_nodes} nodes, {n_edges} edges")
    return G
