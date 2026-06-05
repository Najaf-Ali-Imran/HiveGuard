# Viva Preparation: `app.py`

## Overview
This file is the **Main Server Application**. It exposes the entire artificial intelligence pipeline as a RESTful API using FastAPI. It is the architectural spine that catches the data from the React frontend, mathematically processes it, and orchestrates the sequence in which the ML Models, Search Agent, and Knowledge Base execute.

---

## 🎯 Which Project Requirement Steps Does This Solve?

This file is the direct implementation of **Step 10**:
* **Step 10 Integration:** "Integrate all components into a complete intelligent system and explain the workflow clearly."
This file acts as the ultimate controller. It ensures that data flows linearly: *Frontend Data -> Feature Engineering -> Sensor Fusion (ML) -> A* Search (Logic) -> Knowledge Base (Inference) -> Prescription Formatting -> JSON Response.*

---

## 🧠 Line-by-Line / Block-by-Block Explanation

### 1. The Setup & Health Check (Lines 1-60)
**What it does:** Initializes the FastAPI server, configures CORS (so the frontend can talk to the backend), and pre-loads the AI models at startup. It also provides basic utility endpoints (`/api/health`, `/api/states`, `/api/climate`).
**Why:** Pre-loading the models (`sensors = get_sensors()`) into memory ensures that the heavy AI computation happens at server boot time rather than making the user wait every time they click "Analyze".

### 2. The Full Analysis Endpoint: `run_full_analysis` (Lines 62-115)
**What it does:** Catches the incoming POST request from the frontend containing the 13 inputs + 1 image.
**How it works:** 
1. It catches inputs like `colony_n`, `stress_varroa_mites`, and `temperature_f`.
2. It validates the temperature to ensure the user didn't submit a temperature impossible for that State/Quarter (preventing bad data).
3. **Feature Derivation:** It calculates the remaining 6 mathematical features the ML model requires (e.g., `temp_std = 3.0`, `varroa_pesticide_synergy = varroa * pesticides`).
**Why:** The backend must handle data validation and feature engineering (calculating interaction terms) so the raw ML model receives perfectly structured data.

### 3. Step 1: Sensor Fusion (Lines 117-145)
**What it does:** Passes the packaged 19 features and the image to `sensor_fusion.py`.
**How it works:** It calls `sensors.generate_initial_state(...)`, retrieving the combined predictions of the Stacking Tabular model and the CNN Vision model.
**Why:** This establishes the `initial_state` for the A* search agent (Fulfilling Step 7b).

### 4. Step 2: A* Search (Lines 147-149)
**What it does:** Runs the optimal pathfinding algorithm.
**How it works:** It initializes `HiveGuardAgent()` and passes the ML-derived `initial_state` to `agent.a_star_search()`.
**Why:** Calculates the cheapest, most efficient set of actions to fix the hive.

### 5. Step 3: Knowledge Base (Lines 151-168)
**What it does:** Runs the expert inference engine.
**How it works:** It parses out whatever chemical treatment the A* agent proposed, combines it with the environmental facts, and passes it to `kb_system.run_inference()`.
**Why:** It allows the biological rules engine to double-check the A* agent's plan and deduce deep physiological facts (like "Detoxification Failure").

### 6. Step 4: Prescription & Return (Lines 170-186)
**What it does:** Formats the final output.
**How it works:** It hands the raw A* output and raw Knowledge Base output to the `BeekeeperPrescription` class to clean it up, then returns a massive JSON payload back to the React UI.
**Why:** It completes the pipeline, ensuring the UI receives structured, easily readable data to build the final report.

---
## 💡 Tips for the Viva
* **If the teacher asks:** *"Explain the workflow of your integrated intelligent system (Step 10)."*
  **Your Answer:** "My system workflow is entirely linear and orchestrated by FastAPI in `app.py`. First, it receives 13 raw inputs and validates them. Second, it calculates 6 derived interaction features. Third, it runs **Sensor Fusion**, passing the data to the Tabular and CNN models to generate a predicted initial state. Fourth, it passes that state to the **A* Search Agent** to find a treatment path. Fifth, it passes that treatment path to the **Knowledge Base** to deduce biological facts and verify safety. Finally, it formats everything into a prescription and returns it to the user."
