"""
synthetic_data_generator.py

Generates a synthetic clinical dataset simulating sepsis progression
across 1000 patients and 24 timepoints (every 2 hours over 48 hours).
Embeds three ground-truth sepsis pathways for downstream validation.

v2 changes for pathway separability:
  - Non-sepsis: temperature hard-clipped to T0 band (36.1–37.9), never T2.
  - Warm Sepsis: T2 (≥39.0) reached by hour 4; H2 (≥120) reached by hour 8.
  - Inflammatory Cascade: W2 (>15) from hour 6, temp floor-clipped at 39.0.
  - Cohort sizes: 660 / 200 / 80 / 60  (non-sepsis / WS / CS / IC).
"""

import numpy as np
import pandas as pd
from tqdm import tqdm
import os

np.random.seed(42)

# Hard bin boundaries (replicate from discretizer for clipping)
_T2_FLOOR = 39.0   # temperature at or above this is T2
_T0_CEIL  = 37.9   # temperature at or below this is T0
_H2_FLOOR = 120.0  # HR at or above this is H2
_W2_FLOOR = 15.0   # WBC strictly above this is W2


def _circadian_hr(hour_of_day: int) -> float:
    """HR circadian bump: +5 bpm during daytime hours."""
    return 5.0 if 10 <= hour_of_day <= 18 else 0.0


def _add_noise(value: float, std: float) -> float:
    return value + np.random.normal(0, std)


def _maybe_missing(value: float, missing_rate: float = 0.12):
    return np.nan if np.random.random() < missing_rate else value


# ---------------------------------------------------------------------------
# Non-sepsis
# ---------------------------------------------------------------------------

def _generate_non_sepsis_patient(patient_id: int) -> list:
    """
    Generate 24 timepoints for a healthy patient.

    Temperature is strictly confined to the T0 band (36.1–37.9 °C).
    No circadian temperature effect is applied so noise cannot push
    values into T2. Heart rate has a mild circadian bump.
    """
    rows = []
    for t in range(24):
        hour = t * 2
        hod = hour % 24
        hrd = _circadian_hr(hod)

        # Tight noise + hard clip ensures temp never reaches T2
        raw_temp = _add_noise(37.0, 0.12)
        temp = float(np.clip(raw_temp, 36.1, _T0_CEIL))

        hr    = _add_noise(72 + hrd, 4)
        bp_s  = _add_noise(118, 5)
        bp_d  = _add_noise(76, 4)
        wbc   = _add_noise(7.5, 0.8)
        lac   = _add_noise(1.0, 0.15)
        rr    = _add_noise(16, 1.5)
        spo2  = _add_noise(98, 0.5)

        rows.append({
            "Patient_ID": patient_id,
            "Hour": hour,
            "Temperature_C": _maybe_missing(round(temp, 2)),
            "Heart_Rate": _maybe_missing(round(hr, 1)),
            "BP_Systolic": _maybe_missing(round(bp_s, 1)),
            "BP_Diastolic": _maybe_missing(round(bp_d, 1)),
            "WBC_Count": _maybe_missing(round(wbc, 2)),
            "Lactate_mmol_L": _maybe_missing(round(lac, 2)),
            "Respiratory_Rate": _maybe_missing(round(rr, 1)),
            "SpO2": _maybe_missing(round(min(100.0, spo2), 1)),
            "Sepsis_Flag": 0,
            "Pathway_Type": "None",
            "Ward": np.random.choice(["ICU", "General", "Emergency"]),
            "Hour_of_Day": hod,
        })
    return rows


# ---------------------------------------------------------------------------
# Warm Sepsis  (200 patients)
# ---------------------------------------------------------------------------

def _generate_warm_sepsis_patient(patient_id: int) -> list:
    """
    Pathway 1 — Warm Sepsis (strengthened signals):
      0– 4h : Temp ramps 38.0 → 39.5  → reliably T2 by hour 4
      4– 8h : HR  ramps 95  → 130     → reliably H2 by hour 8
      8–12h : WBC ramps 7   → 14      → W1
     12–18h : Lactate ramps 1.0 → 3.2 → L1
     18h+   : BP drops, Sepsis_Flag=1
    """
    rows = []
    for t in range(24):
        hour = t * 2
        hod  = hour % 24
        hrd  = _circadian_hr(hod)

        if hour <= 4:
            frac = hour / 4.0
            # Floor at T2 boundary by hour 4
            base_temp = 38.0 + frac * (39.5 - 38.0)
            temp  = max(_T2_FLOOR if hour == 4 else 38.0,
                        _add_noise(base_temp, 0.15))
            hr    = _add_noise(85 + hrd, 3)
            wbc   = _add_noise(7.0, 0.4)
            lac   = _add_noise(1.0, 0.08)
            bp_s  = _add_noise(118, 5)
            sepsis = 0

        elif hour <= 8:
            frac = (hour - 4) / 4.0
            temp  = max(_T2_FLOOR, _add_noise(39.5, 0.15))
            # HR must be H2 (≥120) by hour 8: target 130, std 2
            base_hr = 95 + frac * (130 - 95)
            hr    = _add_noise(base_hr + hrd, 2)
            wbc   = _add_noise(7.0, 0.4)
            lac   = _add_noise(1.0, 0.08)
            bp_s  = _add_noise(118, 5)
            sepsis = 0

        elif hour <= 12:
            frac = (hour - 8) / 4.0
            temp  = max(_T2_FLOOR, _add_noise(39.5, 0.15))
            hr    = _add_noise(130 + hrd, 3)
            wbc   = _add_noise(7.0 + frac * (14.0 - 7.0), 0.5)
            lac   = _add_noise(1.0, 0.08)
            bp_s  = _add_noise(118, 5)
            sepsis = 0

        elif hour <= 18:
            frac = (hour - 12) / 6.0
            temp  = max(_T2_FLOOR, _add_noise(39.5, 0.15))
            hr    = _add_noise(125 + hrd, 3)
            wbc   = _add_noise(14.0, 0.6)
            lac   = _add_noise(1.0 + frac * (3.2 - 1.0), 0.12)
            bp_s  = _add_noise(118, 5)
            sepsis = 0

        else:
            frac  = min(1.0, (hour - 18) / 6.0)
            temp  = max(_T2_FLOOR, _add_noise(39.5, 0.15))
            hr    = _add_noise(125 + hrd, 3)
            wbc   = _add_noise(14.0, 0.6)
            lac   = _add_noise(3.2, 0.15)
            bp_s  = _add_noise(118 - frac * 30, 5)
            sepsis = 1

        bp_d = _add_noise(76, 4)
        rr   = _add_noise(22, 2)
        spo2 = _add_noise(96, 1)

        rows.append({
            "Patient_ID": patient_id,
            "Hour": hour,
            "Temperature_C": _maybe_missing(round(temp, 2)),
            "Heart_Rate": _maybe_missing(round(hr, 1)),
            "BP_Systolic": _maybe_missing(round(bp_s, 1)),
            "BP_Diastolic": _maybe_missing(round(bp_d, 1)),
            "WBC_Count": _maybe_missing(round(wbc, 2)),
            "Lactate_mmol_L": _maybe_missing(round(lac, 2)),
            "Respiratory_Rate": _maybe_missing(round(rr, 1)),
            "SpO2": _maybe_missing(round(min(100.0, spo2), 1)),
            "Sepsis_Flag": sepsis,
            "Pathway_Type": "Warm Sepsis",
            "Ward": np.random.choice(["ICU", "General", "Emergency"]),
            "Hour_of_Day": hod,
        })
    return rows


# ---------------------------------------------------------------------------
# Cryptic Sepsis  (80 patients)
# ---------------------------------------------------------------------------

def _generate_cryptic_sepsis_patient(patient_id: int) -> list:
    """
    Pathway 2 — Cryptic Sepsis (unchanged — already recoverable):
      0– 4h : Temp normal ~37.1 (T0)
      4– 8h : BP drops 120 → 88  (B2)
      8–12h : Lactate spikes 1.0 → 4.1  (L2)
     12h+   : Sepsis_Flag=1
    """
    rows = []
    for t in range(24):
        hour = t * 2
        hod  = hour % 24
        hrd  = _circadian_hr(hod)

        if hour <= 4:
            raw_temp = _add_noise(37.1, 0.12)
            temp  = float(np.clip(raw_temp, 36.1, _T0_CEIL))
            hr    = _add_noise(72 + hrd, 4)
            bp_s  = _add_noise(120, 4)
            lac   = _add_noise(1.0, 0.08)
            wbc   = _add_noise(7.5, 0.5)
            sepsis = 0

        elif hour <= 8:
            frac = (hour - 4) / 4.0
            raw_temp = _add_noise(37.1, 0.12)
            temp  = float(np.clip(raw_temp, 36.1, _T0_CEIL))
            hr    = _add_noise(72 + hrd, 4)
            bp_s  = _add_noise(120 - frac * (120 - 86), 4)
            lac   = _add_noise(1.0, 0.08)
            wbc   = _add_noise(7.5, 0.5)
            sepsis = 0

        elif hour <= 12:
            frac = (hour - 8) / 4.0
            raw_temp = _add_noise(37.1, 0.12)
            temp  = float(np.clip(raw_temp, 36.1, _T0_CEIL))
            hr    = _add_noise(72 + hrd, 4)
            bp_s  = _add_noise(86, 4)
            lac   = _add_noise(1.0 + frac * (4.2 - 1.0), 0.15)
            wbc   = _add_noise(7.5, 0.5)
            sepsis = 0

        else:
            raw_temp = _add_noise(37.1, 0.12)
            temp  = float(np.clip(raw_temp, 36.1, _T0_CEIL))
            hr    = _add_noise(72 + hrd, 4)
            bp_s  = _add_noise(86, 4)
            lac   = _add_noise(4.2, 0.25)
            wbc   = _add_noise(7.5, 0.5)
            sepsis = 1

        bp_d = _add_noise(70, 4)
        rr   = _add_noise(18, 2)
        spo2 = _add_noise(95, 1.2)

        rows.append({
            "Patient_ID": patient_id,
            "Hour": hour,
            "Temperature_C": _maybe_missing(round(temp, 2)),
            "Heart_Rate": _maybe_missing(round(hr, 1)),
            "BP_Systolic": _maybe_missing(round(bp_s, 1)),
            "BP_Diastolic": _maybe_missing(round(bp_d, 1)),
            "WBC_Count": _maybe_missing(round(wbc, 2)),
            "Lactate_mmol_L": _maybe_missing(round(lac, 2)),
            "Respiratory_Rate": _maybe_missing(round(rr, 1)),
            "SpO2": _maybe_missing(round(min(100.0, spo2), 1)),
            "Sepsis_Flag": sepsis,
            "Pathway_Type": "Cryptic Sepsis",
            "Ward": np.random.choice(["ICU", "General", "Emergency"]),
            "Hour_of_Day": hod,
        })
    return rows


# ---------------------------------------------------------------------------
# Inflammatory Cascade  (60 patients)
# ---------------------------------------------------------------------------

def _generate_inflammatory_cascade_patient(patient_id: int) -> list:
    """
    Pathway 3 — Inflammatory Cascade (strengthened signals):
      0– 6h : Fever ≥39.5, floor-clipped at 39.0 (firmly T2).
               WBC ramps 12 → 16, hitting W2 (>15) by hour 6.
      6–12h : WBC continues 16 → 22  (deep W2).
     12–18h : Lactate ramps 1.2 → 2.8  (L1).
     18h+   : Sepsis_Flag=1.
    """
    rows = []
    for t in range(24):
        hour = t * 2
        hod  = hour % 24
        hrd  = _circadian_hr(hod)

        if hour <= 6:
            frac = hour / 6.0
            # Floor at 39.0 so noise never drops below T2
            raw_temp = _add_noise(39.6 + frac * (40.2 - 39.6), 0.15)
            temp  = max(_T2_FLOOR, raw_temp)
            hr    = _add_noise(92 + hrd, 4)
            # WBC: starts 12, hits W2 floor (>15) by hour 6
            base_wbc = 12.0 + frac * (16.2 - 12.0)
            wbc   = max(_W2_FLOOR + 0.1 if hour == 6 else 12.0,
                        _add_noise(base_wbc, 0.4))
            lac   = _add_noise(1.2, 0.08)
            bp_s  = _add_noise(115, 5)
            sepsis = 0

        elif hour <= 12:
            frac = (hour - 6) / 6.0
            raw_temp = _add_noise(40.2, 0.15)
            temp  = max(_T2_FLOOR, raw_temp)
            hr    = _add_noise(102 + hrd, 4)
            wbc   = max(_W2_FLOOR + 0.1,
                        _add_noise(16.2 + frac * (22.0 - 16.2), 0.8))
            lac   = _add_noise(1.2, 0.08)
            bp_s  = _add_noise(115, 5)
            sepsis = 0

        elif hour <= 18:
            frac = (hour - 12) / 6.0
            raw_temp = _add_noise(40.2, 0.15)
            temp  = max(_T2_FLOOR, raw_temp)
            hr    = _add_noise(107 + hrd, 4)
            wbc   = max(_W2_FLOOR + 0.1, _add_noise(22.0, 1.0))
            lac   = _add_noise(1.2 + frac * (2.8 - 1.2), 0.12)
            bp_s  = _add_noise(115, 5)
            sepsis = 0

        else:
            raw_temp = _add_noise(40.2, 0.15)
            temp  = max(_T2_FLOOR, raw_temp)
            hr    = _add_noise(110 + hrd, 4)
            wbc   = max(_W2_FLOOR + 0.1, _add_noise(22.0, 1.0))
            lac   = _add_noise(2.8, 0.18)
            bp_s  = _add_noise(108, 6)
            sepsis = 1

        bp_d = _add_noise(72, 4)
        rr   = _add_noise(24, 2)
        spo2 = _add_noise(93, 1.5)

        rows.append({
            "Patient_ID": patient_id,
            "Hour": hour,
            "Temperature_C": _maybe_missing(round(temp, 2)),
            "Heart_Rate": _maybe_missing(round(hr, 1)),
            "BP_Systolic": _maybe_missing(round(bp_s, 1)),
            "BP_Diastolic": _maybe_missing(round(bp_d, 1)),
            "WBC_Count": _maybe_missing(round(wbc, 2)),
            "Lactate_mmol_L": _maybe_missing(round(lac, 2)),
            "Respiratory_Rate": _maybe_missing(round(rr, 1)),
            "SpO2": _maybe_missing(round(min(100.0, spo2), 1)),
            "Sepsis_Flag": sepsis,
            "Pathway_Type": "Inflammatory Cascade",
            "Ward": np.random.choice(["ICU", "General", "Emergency"]),
            "Hour_of_Day": hod,
        })
    return rows


# ---------------------------------------------------------------------------
# Dataset entry point
# ---------------------------------------------------------------------------

def generate_dataset(output_path: str = "mc2aco/synthetic_sepsis_data.csv") -> pd.DataFrame:
    """
    Generate the full synthetic sepsis dataset and save to CSV.

    Cohort: 660 non-sepsis | 200 Warm Sepsis | 80 Cryptic Sepsis | 60 Inflammatory Cascade
    Total: 1000 patients × 24 timepoints = 24,000 rows.
    """
    all_rows = []
    pid = 0

    for _ in tqdm(range(660), desc="Generating non-sepsis patients"):
        all_rows.extend(_generate_non_sepsis_patient(pid))
        pid += 1

    for _ in tqdm(range(200), desc="Generating Warm Sepsis patients"):
        all_rows.extend(_generate_warm_sepsis_patient(pid))
        pid += 1

    for _ in tqdm(range(80), desc="Generating Cryptic Sepsis patients"):
        all_rows.extend(_generate_cryptic_sepsis_patient(pid))
        pid += 1

    for _ in tqdm(range(60), desc="Generating Inflammatory Cascade patients"):
        all_rows.extend(_generate_inflammatory_cascade_patient(pid))
        pid += 1

    df = pd.DataFrame(all_rows)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[synthetic_data_generator] Saved {len(df)} rows | "
          f"660 non-sepsis / 200 WS / 80 CS / 60 IC → {output_path}")
    return df


if __name__ == "__main__":
    generate_dataset()
