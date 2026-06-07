# SepsisSense

SepsisSense is a state-of-the-art clinical decision support and pathway discovery platform. It uses a custom **MC²-ACO (Monte Carlo & Ant Colony Optimization)** algorithm to ingest clinical cohort datasets, construct transition networks, and discover pathways representing patient deterioration into sepsis.

The application consists of a high-performance **FastAPI backend** and a visually rich, interactive **React + Vite frontend** styled with vanilla CSS and TailwindCSS.

---

## Key Features

* **Data Ingestion Pipeline**: Load clinical batch CSV datasets (supporting MIMIC-III, PhysioNet 2019, and custom schemas) with automatic schema validation, missing values imputation, normalization, and windowing.
* **Patient Registry & Timelines**: Browse patient clinical records, view detailed timelines of vitals and lab results (Heart Rate, Temperature, Blood Pressure, WBC, Lactate, SpO₂), and see matched progression pathways.
* **Deterioration Highway**: An interactive network graph representing transition states of patient cohorts. Nodes represent discrete clinical states (`T{temp}_H{hr}_B{bp}_W{wbc}_L{lac}`), and edges depict the transition rate/density.
* **Pathway Discoveries**: View ranked clinical deterioration pathways categorized into ground-truth cohorts:
  * **Warm Sepsis** (fever, tachycardia, high WBC)
  * **Cryptic Sepsis** (silent hypotensive shock, high lactate)
  * **Inflammatory Cascade** (hyperpyrexia and rapid WBC shift)
* **Sandbox Simulation**: Customize simulation parameters (Alpha, Beta, Ant count, Iteration count, Bootstrap seeds) and run the MC²-ACO algorithm in real-time to discover pathways.

---

## Technology Stack

* **Frontend**: React (v19), Vite, TailwindCSS, Lucide React (icons), Recharts (charts).
* **Backend**: FastAPI, Uvicorn, Pandas, NumPy, NetworkX, Pydantic.
* **Optimization Algorithms**: Custom Python implementation of Ant Colony Optimization (ACO) bootstrapped with Monte Carlo simulations.

---

## Repository Structure

```tree
sepsisense/
├── backend/                  # Python FastAPI API & Algorithms
│   ├── api.py                # Main FastAPI Server
│   └── mc2aco/               # MC²-ACO Algorithm Modules
│       ├── aco.py            # Ant Colony Optimization simulation
│       ├── data_loader.py    # Dataset loaders and splitters
│       ├── discretizer.py    # Discretizes patient vitals into bin states
│       ├── evaporation.py    # Computes dynamic pheromone evaporation rates
│       ├── graph_builder.py  # Builds network transition graphs
│       ├── monte_carlo.py    # Bootstraps pheromone via Monte Carlo
│       ├── path_analysis.py  # Pathway ranking & diversity sorting
│       └── stability.py      # Computes bootstrap stability of pathways
│
└── frontend/                 # React + Vite Client Application
    ├── src/
    │   ├── App.jsx           # Main client layout & navigation
    │   ├── components/       # UI Tabs (Overview, Ingestion, Patients, Graph, Pathways, Sandbox)
    │   └── services/         # API integration client
    ├── package.json          # Frontend packages & dev dependencies
    └── vite.config.js        # Vite configurations
```

---

## Getting Started

### Prerequisites

* Python 3.10+
* Node.js 18+ & npm

### 1. Set Up and Run the Backend

Navigate to the `backend` folder, install dependencies, and start the API server:

```bash
cd backend

# Install python dependencies
pip install fastapi uvicorn pydantic numpy pandas networkx tqdm

# Start the FastAPI server
python api.py
```

*By default, the backend will generate a secondary sepsis dataset if it's missing, load the patient sequences, construct the transition graph, and listen on **`http://localhost:8000`**.*

### 2. Set Up and Run the Frontend

In a new terminal window, navigate to the `frontend` folder, install npm packages, and start Vite:

```bash
cd frontend

# Install package dependencies
npm install

# Run Vite in dev mode
npm run dev
```

*The frontend application will boot up and be accessible in your web browser at **`http://localhost:5173/`**.*

---

## Algorithmic Workflow (MC²-ACO)

SepsisSense discovers sepsis pathways using a multi-step pipeline:
1. **Discretization**: Patient records are binned into state nodes containing Temperature (T), Heart Rate (H), Blood Pressure (B), WBC Count (W), and Lactate (L). For example, state `T2_H1_B0_W1_L1` represents hyperpyrexia, mild tachycardia, normal blood pressure, mild leukocytosis, and hyperlactatemia.
2. **Transition Network**: Sequences of patient states are linked to form a directed graph tracking clinical trajectories from `START` to `SEPSIS` or discharge.
3. **Monte Carlo Bootstrapping**: Runs $B$ independent bootstraps on training cohorts to estimate baseline transition probabilities and pheromone variance.
4. **Dynamic Evaporation**: Uses the variance of path walks to scale evaporation rates; stable transitions preserve pheromones while noisy paths evaporate quickly.
5. **Ant Colony Optimization**: Virtual ants navigate the transition graph using pheromone levels ($\tau$) and heuristic data ($\eta$) to locate optimal deterioration pathways, validating outcomes against test datasets.
