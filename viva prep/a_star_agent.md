# Viva Preparation: `a_star_agent.py`

## Overview
This file implements the **A* Search Agent** for the HiveGuard system. Its primary job is to take the initial state predicted by the Machine Learning models (the "diagnosis") and find the optimal, cheapest, and biologically safest sequence of treatments (the "prescription") to return the beehive to a safe state.

---

## 🎯 Which Project Requirement Steps Does This Solve?

This file is the direct implementation of **Step 7**:
* **Step 7(a) PEAS Framework:** This agent defines the **Actuators** (the treatments like Formic Pro, OAE, Relocation) and uses the **Sensors** (the input state from the ML models). The **Performance Measure** is the total expected cost of the interventions.
* **Step 7(b) State Space Formulation:** It defines the Goal State (`is_goal`), the possible actions (`self.actions`), and the Transition Model (`apply_action`).
* **Step 7(c) Implement A* Search & Heuristic:** It fully implements the A* algorithm (`a_star_search`) using a priority queue, and defines an admissible heuristic function (`heuristic`).
* **Step 7(d) Search Path to Real-World Recommendation:** The `_build_result` function translates the abstract search path into human-readable real-world beekeeping instructions with rationale and efficacy.
* **Step 7(e) Different Outcomes = Different Paths:** The `is_valid_action` function ensures that different environmental states (e.g., High Temp vs Low Temp) force the A* search down entirely different paths by vetoing certain actions.

---

## 🧠 Line-by-Line / Block-by-Block Explanation

### 1. `__init__(self)` (Lines 10-52)
**What it does:** Initializes the agent and defines `self.actions`.
**How it works:** It creates a dictionary of all possible interventions the AI can prescribe (e.g., `Apply_Formic_Pro`, `Relocate_Hive`). For each action, it defines:
* `cost`: The base financial/effort cost.
* `prob`: The probability of success (efficacy).
* `fixes_varroa` / `fixes_pesticide`: Boolean flags showing what problem the action solves.
**Why:** The A* algorithm needs to know the exact cost of traveling from one node to another. The expected cost of an edge in the search tree is calculated as `cost / prob`.

### 2. `heuristic(self, state)` (Lines 54-67)
**What it does:** This is the **$h(n)$** function for the A* search. It estimates the remaining cost to reach the goal from the current state.
**How it works:** It checks the current state. If `Pesticide_Risk` is High, it adds 95 (the minimum cost to fix it). If `CNN_Varroa` is Infected, it adds 35. 
**Why:** A* requires an "admissible" heuristic, meaning it must *never overestimate* the cost to reach the goal. By using the absolute minimum cost of the cheapest treatment for a given problem, it guarantees the algorithm will find the true mathematically optimal path.

### 3. `is_goal(self, state)` (Lines 69-75)
**What it does:** Defines the stopping condition for the search.
**How it works:** It checks if `Regional_Risk` is Low, `CNN_Varroa` is Healthy, and `Pesticide_Risk` is Low.
**Why:** The A* while-loop will continue popping nodes off the priority queue until this function returns `True`.

### 4. `is_valid_action(self, state, action_name)` (Lines 77-127)
**What it does:** This is the **Universal Biological Rules Engine**. It acts as a strict constraint filter during the search process.
**How it works:** Before A* evaluates an action, it passes the current state to this function. It checks constraints based on your `Rules.txt` (e.g., if `action == Apply_Formic_Pro` and `temp > 85`, it returns `False`).
**Why:** Without this, the A* algorithm would just blindly pick the cheapest treatment every time. This function forces the AI to respect real-world biological and chemical laws, making the system intelligent and safe.

### 5. `apply_action(self, state, action_name)` (Lines 129-145)
**What it does:** This is the **Transition Model** of the search space.
**How it works:** It takes the current state and the chosen action, copies the state, and updates the variables (e.g., if the action fixes Varroa, it sets `CNN_Varroa` to `Healthy`).
**Why:** In state-space search, you must be able to generate the "next state" to add to the frontier. This simulates what the hive will look like *after* the treatment is applied.

### 6. `a_star_search(self, initial_state)` (Lines 147-210)
**What it does:** The core brain of the agent. This is the actual A* algorithm implementation.
**How it works:** 
1. Calculates the starting heuristic ($h$) and pushes the initial state onto a priority queue (`heapq`) as the `frontier`.
2. Starts a `while frontier:` loop.
3. Pops the node with the lowest $f(n)$ score ($f = g + h$).
4. Checks if it's the goal using `is_goal()`. If yes, it stops and returns the path.
5. If not, it iterates over all possible actions.
6. Calls `is_valid_action()` to see if the action is legal. If illegal, it skips it and logs it in `rejected_actions`.
7. Calls `apply_action()` to generate the next state.
8. Calculates the new $g(n)$ (cumulative cost) and $h(n)$ (heuristic).
9. Pushes the new state onto the `frontier`.
**Why:** A* is guaranteed to find the shortest (cheapest) path to the goal state. By combining costs with probabilities and biological constraints, it finds the most efficient real-world prescription.

### 7. `_build_result(...)` (Lines 211-263)
**What it does:** Formats the final output for the frontend UI.
**How it works:** It iterates through the optimal path array (e.g., `["Relocate_Hive", "Apply_Oxalic"]`) and builds a structured JSON object containing the expected cost, description, and dynamically injected rationale text based on the temperature.
**Why:** A raw array of strings is useless to a user. This function turns the mathematical search path into a professional, human-readable medical report.

---
## 💡 Tips for the Viva
* **If the teacher asks:** *"Why did you choose A* over BFS or DFS?"*
  **Your Answer:** "BFS and DFS don't account for edge costs or probabilities of success. In beekeeping, treatments have different financial costs and different efficacy rates. A* allows us to use an admissible heuristic to mathematically guarantee the *cheapest and most effective* treatment path, not just any random path."
* **If the teacher asks:** *"What is your heuristic and is it admissible?"*
  **Your Answer:** "Yes, it is admissible because it never overestimates. It simply checks if a threat exists (like Varroa) and adds the cost of the *absolute cheapest possible* treatment that cures that threat. Therefore, the actual cost will always be greater than or equal to the heuristic."
