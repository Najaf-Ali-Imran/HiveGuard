# Viva Preparation: `knowledge_base.py`

## Overview
This file implements the **Knowledge-Based System (Expert System)** using a Forward Chaining inference engine. It takes the initial predictions from the ML models and applies a set of 13 biological IF-THEN rules to deduce new facts about the beehive's health, ultimately generating a final diagnosis and vetoing dangerous treatments.

---

## 🎯 Which Project Requirement Steps Does This Solve?

This file is the direct implementation of **Step 9**:
* **Step 9(a) 10-12 Domain-Specific Rules:** The `HiveGuardKB` class explicitly defines 13 `Rule` objects based on real-world biology and chemistry (e.g., Varroa mite life cycles, pesticide toxicity).
* **Step 9(b) Forward Chaining Inference:** The `run_inference()` function implements a forward-chaining loop. It applies rules repeatedly until no new facts can be derived, generating a full trace of which rules fired.
* **Step 9(b) Conflicting/Complementing A* Search:** The KB complements the A* search by dynamically deriving facts that alter the A* logic (like setting `Formic_Pro_Safe = False` based on temperature), proving that the logic system goes beyond just simple routing.

---

## 🧠 Line-by-Line / Block-by-Block Explanation

### 1. `Rule` Class (Lines 6-13)
**What it does:** Defines the structure of a single logical rule.
**How it works:** It stores a rule ID, name, a `condition_func` (a lambda function representing the "IF" part), a dictionary of `conclusions` (the "THEN" part), and an explanation.
**Why:** Having a dedicated class keeps the rules modular. The inference engine doesn't need to know *what* the rules are, it just needs to call `.condition_func(facts)` on all of them.

### 2. `_initialize_rules(self)` (Lines 22-102)
**What it does:** Defines the 13 biological IF-THEN rules.
**How it works:** It creates a list of `Rule` objects. For example, **Rule R3 (Neonicotinoid Synergy)** says: 
*IF Mite Load is High AND Pesticide Proximity is True -> THEN Detoxification_Failure = True and Risk_Level = Critical.*
* **Rule R9 (Formic Temp)**: IF Temp > 85 -> THEN Formic_Pro_Safe = False.
**Why:** This embodies the "domain knowledge" of the system. It allows the AI to make expert deductions that the ML model (which only outputs numbers) cannot explain biologically.

### 3. `run_inference(self, initial_facts)` (Lines 104-170)
**What it does:** This is the **Forward Chaining Engine**. It applies the rules to deduce new facts.
**How it works:** 
1. Starts with `initial_facts` (e.g., Temperature, ML predictions).
2. Enters a `while` loop (max 20 cycles to prevent infinite loops).
3. Evaluates every rule's `condition_func`. If it returns `True`, and the conclusions aren't already in the `facts` dictionary, it adds them.
4. Marks `new_facts_found = True` and loops again.
5. If a full loop finishes and NO new facts were added, it `break`s (the forward chaining is complete).
6. It returns the list of `fired_rules` (the trace) and the `deduced_facts`.
**Why:** Forward chaining is data-driven. It starts with raw data and chains rules together (e.g., Rule A deduces Fact X -> Fact X triggers Rule B -> Rule B deduces Fact Y) to reach a final, deep conclusion.

### 4. `build_kb_facts(...)` (Lines 173-206)
**What it does:** Translates the raw API inputs into the starting vocabulary of the Knowledge Base.
**How it works:** It creates the initial dictionary (setting `CNN_Detects_DWV` to `True` if the CNN found mites, setting `Ambient_Temp`, etc.).
**Why:** The inference engine needs a structured starting point. This function initializes the base facts before the `while` loop begins chaining them.

---
## 💡 Tips for the Viva
* **If the teacher asks:** *"What is Forward Chaining and how did you implement it?"*
  **Your Answer:** "Forward chaining is a data-driven reasoning method. You start with known facts and apply inference rules to extract more data until a goal is reached or no more rules apply. I implemented it using a `while` loop that iterates over my 13 `Rule` objects. If a rule's IF condition is met, its THEN conclusions are added to the `facts` dictionary. The loop runs continuously until a full pass results in zero new facts being added."
* **If the teacher asks:** *"How do the Knowledge Base and the A* Search Agent interact?"*
  **Your Answer:** "They complement each other. The Knowledge Base deduces biological facts (like diagnosing *Detoxification Failure* or realizing a chemical is unsafe). The A* Agent uses those deduced facts to constrain its state-space search. If the KB deduces that a treatment is lethally toxic under current conditions, it essentially deletes that branch from the A* search tree, ensuring the final path is safe."
