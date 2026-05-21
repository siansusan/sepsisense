"""
discretizer.py

Discretizes continuous vital signs into clinical state tokens using
domain-defined bins. Constructs per-patient state sequences with
sentinel START and SEPSIS nodes for graph traversal.
"""

import pandas as pd
import numpy as np
from tqdm import tqdm


SENTINEL_START = "START"
SENTINEL_SEPSIS = "SEPSIS"


def _bin_temperature(t) -> str:
    if pd.isna(t):
        return "T?"
    t = float(t)
    if t >= 39.0 or t <= 36.0:
        return "T2"
    if 38.0 <= t <= 38.9:
        return "T1"
    return "T0"  # 36.1–37.9


def _bin_heart_rate(hr) -> str:
    if pd.isna(hr):
        return "H?"
    hr = float(hr)
    if hr >= 120:
        return "H2"
    if hr >= 100:
        return "H1"
    return "H0"  # 60–99


def _bin_bp_systolic(bp) -> str:
    if pd.isna(bp):
        return "B?"
    bp = float(bp)
    if bp < 90:
        return "B2"
    if bp < 110:
        return "B1"
    return "B0"  # >=110


def _bin_wbc(wbc) -> str:
    if pd.isna(wbc):
        return "W?"
    wbc = float(wbc)
    if wbc > 15 or wbc < 2:
        return "W2"
    if (11 < wbc <= 15) or (2 <= wbc < 4):
        return "W1"
    return "W0"  # 4–11


def _bin_lactate(lac) -> str:
    if pd.isna(lac):
        return "L?"
    lac = float(lac)
    if lac >= 4.0:
        return "L2"
    if lac >= 2.0:
        return "L1"
    return "L0"  # <2


def _state_tuple(row) -> str:
    """Convert a single timepoint row into a discrete state string."""
    t = _bin_temperature(row["Temperature_C"])
    h = _bin_heart_rate(row["Heart_Rate"])
    b = _bin_bp_systolic(row["BP_Systolic"])
    w = _bin_wbc(row["WBC_Count"])
    lac = _bin_lactate(row["Lactate_mmol_L"])
    return f"{t}_{h}_{b}_{w}_{lac}"


def build_patient_sequences(df: pd.DataFrame) -> dict:
    """
    Build state sequences for every patient.

    Returns a dict mapping Patient_ID -> list of (state, hour) tuples,
    beginning with START and ending with SEPSIS if the patient became septic.
    """
    sequences = {}
    pids = df["Patient_ID"].unique()

    for pid in tqdm(pids, desc="Building patient state sequences"):
        patient = df[df["Patient_ID"] == pid].sort_values("Hour")
        seq = [(SENTINEL_START, -1)]

        for _, row in patient.iterrows():
            state = _state_tuple(row)
            seq.append((state, int(row["Hour"])))
            if row["Sepsis_Flag"] == 1:
                # Append SEPSIS once upon first flag and stop
                seq.append((SENTINEL_SEPSIS, int(row["Hour"])))
                break

        sequences[pid] = seq

    return sequences
