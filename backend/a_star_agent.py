# HiveGuard Backend — A* Search Agent (Step 7)
# Finds the minimum-cost, biologically legal intervention path
# to transition hive from dangerous state to safe "Low Risk" state

import heapq

class HiveGuardAgent:
    """A* search agent for optimal beehive intervention planning."""

    def __init__(self):
        self.actions = {
            "Liquid_Syrup_Feeding": {
                "cost": 10, "fixes_varroa": False, "fixes_pesticide": False, "prob": 1.0,
                "label": "Liquid Syrup Feeding",
                "description": "Provide 1:1 sugar syrup to boost colony nutrition and stimulate brood production.",
            },
            "Apply_Oxalic_Vapor": {
                "cost": 30, "fixes_varroa": True, "fixes_pesticide": False, "prob": 0.6,
                "label": "Oxalic Acid Vaporization",
                "description": "Vaporize oxalic acid crystals into the hive. Effective only when no capped brood is present.",
            },
            "Apply_Oxalic_Extended_OAE": {
                "cost": 35, "fixes_varroa": True, "fixes_pesticide": False, "prob": 0.95,
                "label": "Extended-Release Oxalic Acid (OAE)",
                "description": "Insert absorbent matrices soaked in 50% Oxalic Acid / 50% glycerin. Continuously kills phoretic mites over 60 days, bypassing brood-penetration limitation.",
            },
            "Apply_Thymol": {
                "cost": 40, "fixes_varroa": True, "fixes_pesticide": False, "prob": 0.8,
                "label": "Thymol Treatment",
                "description": "Apply thymol-based fumigant strips. Requires warm temperatures for proper volatilization.",
            },
            "Apply_HopGuard_3": {
                "cost": 40, "fixes_varroa": True, "fixes_pesticide": False, "prob": 0.75,
                "label": "HopGuard 3 Application",
                "description": "Apply hop-beta-acid contact strips between frames. Effective primarily during broodless periods.",
            },
            "Apply_Formic_Pro": {
                "cost": 45, "fixes_varroa": True, "fixes_pesticide": False, "prob": 0.9,
                "label": "Formic Pro Treatment",
                "description": "Apply formic acid gel pads. The only treatment that penetrates wax cappings to kill mites on pupae.",
            },
            "Apply_Amitraz": {
                "cost": 45, "fixes_varroa": True, "fixes_pesticide": False, "prob": 0.95,
                "label": "Amitraz (Apivar) Strips",
                "description": "Insert Apivar strips between brood frames. Synthetic formulation with highest efficacy rate.",
            },
            "Relocate_Hive": {
                "cost": 95, "fixes_varroa": False, "fixes_pesticide": True, "prob": 1.0,
                "label": "Emergency Hive Relocation",
                "description": "Physically transport the apiary minimum 3 miles from current coordinates to break environmental toxicity loop.",
            },
        }

    def heuristic(self, state: dict) -> float:
        """Admissible heuristic: estimates minimum distance to goal state."""
        h = 0
        if state["Pesticide_Risk"] == "High":
            h += 95  # Min cost to fix pesticide (Relocate)
        if state["CNN_Varroa"] == "Infected":
            h += 35  # Min cost to fix varroa (e.g. OAE is ~36.8 expected cost)
        
        # If neither primary risk is active but we still aren't at the goal (e.g. Regional Risk is still Medium/Severe),
        # we must take at least one more action (minimum cost is 10 for syrup feeding).
        if h == 0 and state["Regional_Risk"] != "Low":
            h += 10
            
        return h

    def is_goal(self, state: dict) -> bool:
        """Goal: all three risk dimensions are safe."""
        return (
            state["Regional_Risk"] == "Low"
            and state["CNN_Varroa"] in ("Healthy", "N/A")
            and state["Pesticide_Risk"] == "Low"
        )

    def is_valid_action(self, state: dict, action_name: str) -> tuple:
        """
        Check biological constraints for an action (UNIVERSAL RULES ENGINE).
        Returns: (is_valid: bool, rejection_reason: str or None)
        """
        temp_f = (state.get("Temp", 20) * 9 / 5) + 32
        quarter = state.get("Quarter", 3)
        supers_on = state.get("Honey_Supers", False)
        fungicide = state.get("Fungicide_Present", False)
        colony_size = state.get("Colony_Size", 8000)

        # R1 & R2: Formic Pro (Temp & Population)
        if action_name == "Apply_Formic_Pro":
            if temp_f < 50.0 or temp_f > 85.0:
                return False, f"Ambient temperature ({temp_f:.1f}°F) outside safe range (50–85°F). Risk of acute brood mortality and queen sterilization (Ref: Sec 1.1)."
            if colony_size < 10000:
                return False, f"Colony size ({colony_size}) < 10,000. Vapor will accumulate toxically (Ref: Sec 1.1)."

        # R3 & R4: Thymol (Temp & Supers)
        if action_name == "Apply_Thymol":
            if temp_f < 59.0 or temp_f > 100.0:
                return False, f"Ambient temperature ({temp_f:.1f}°F) prevents optimal fumigant volatilization (requires 59-100°F) (Ref: Sec 1.4)."
            if supers_on:
                return False, "Contraindicated while honey supers are present. Imparts permanent odor to harvestable wax and honey (Ref: Sec 1.4)."

        # R5 & R6: Amitraz (Supers & Fungicides)
        if action_name == "Apply_Amitraz":
            if supers_on:
                return False, "Synthetic formulation strictly prohibited while human-consumption supers are installed. Residues in honey are illegal (Ref: Sec 1.3)."
            if fungicide:
                return False, "Agricultural SBI Fungicides detected in area. Fungicides inhibit P450 enzymes, making Amitraz acutely toxic to bees (Ref: Sec 3.2)."

        # R7 & R8: Oxalic Vapor (Temp & Brood)
        if action_name == "Apply_Oxalic_Vapor":
            if temp_f < 37.0:
                return False, f"Ambient temperature ({temp_f:.1f}°F) risks chilling the bees during vaporization (Ref: Sec 1.2)."
            if quarter in [2, 3]:
                return False, "Vapor crystals cannot penetrate wax cappings. Treatment fails during active brood phases (Q2–Q3) (Ref: Sec 1.2)."

        # R9 & R10: HopGuard (Temp & Brood)
        if action_name == "Apply_HopGuard_3":
            if temp_f < 50.0:
                return False, f"Ambient temperature ({temp_f:.1f}°F) is too cold for active cluster movement needed to spread contact miticide (Ref: Sec 1.5)."
            if quarter in [2, 3]:
                return False, "Contact miticide cannot penetrate capped brood cells. Ineffective during exponential population phases (Q2–Q3) (Ref: Sec 1.5)."

        # R11: Winter Feeding
        if action_name == "Liquid_Syrup_Feeding" and temp_f < 32.0:
            return False, f"Freezing temperatures ({temp_f:.1f}°F). Bees cannot dehydrate or metabolize liquid syrup safely (Ref: Sec 2.1)."

        return True, None

    def apply_action(self, state: dict, action_name: str) -> dict:
        """Apply an action and return the new state."""
        new_state = state.copy()

        action = self.actions[action_name]
        if action["fixes_varroa"]:
            new_state["CNN_Varroa"] = "Healthy"
        if action["fixes_pesticide"]:
            new_state["Pesticide_Risk"] = "Low"

        # Risk cascade
        if new_state["Regional_Risk"] == "Severe" and new_state["Pesticide_Risk"] == "Low":
            new_state["Regional_Risk"] = "Medium"
        if new_state["Regional_Risk"] == "Medium" and new_state["CNN_Varroa"] in ("Healthy", "N/A"):
            new_state["Regional_Risk"] = "Low"

        return new_state

    def a_star_search(self, initial_state: dict) -> dict:
        """Run A* search to find optimal intervention path."""
        rejected_actions = []

        start_h = self.heuristic(initial_state)
        # (f_score, g_score, state_id, current_state, path)
        frontier = [(start_h, 0.0, id(initial_state), initial_state, [])]
        explored = set()
        counter = 0  # tiebreaker for heap

        while frontier:
            f_score, g_score, _, current_state, path = heapq.heappop(frontier)
            state_key = (
                f"{current_state['Regional_Risk']}_"
                f"{current_state['CNN_Varroa']}_"
                f"{current_state['Pesticide_Risk']}"
            )

            if self.is_goal(current_state):
                return self._build_result(path, g_score, current_state, rejected_actions, initial_state)

            if state_key in explored:
                continue
            explored.add(state_key)

            for action_name in self.actions:
                if action_name in path:
                    continue

                is_valid, reason = self.is_valid_action(current_state, action_name)
                if not is_valid:
                    # Track rejection (avoid duplicates)
                    if not any(r["action"] == action_name for r in rejected_actions):
                        rejected_actions.append({
                            "action": action_name,
                            "label": self.actions[action_name]["label"],
                            "reason": reason,
                        })
                    continue

                next_state = self.apply_action(current_state, action_name)
                action_data = self.actions[action_name]
                expected_cost = action_data["cost"] / action_data["prob"]

                new_g = g_score + expected_cost
                new_h = self.heuristic(next_state)
                new_f = new_g + new_h
                counter += 1

                heapq.heappush(
                    frontier,
                    (new_f, new_g, counter, next_state, path + [action_name]),
                )

        return {
            "success": False,
            "optimal_path": [],
            "total_cost": 0,
            "steps": [],
            "rejected_actions": rejected_actions,
            "final_state": initial_state,
            "error": "No biologically safe survival trajectory could be computed.",
        }

    def _build_result(self, path, total_cost, final_state, rejected, initial_state) -> dict:
        """Build structured result from A* search output."""
        steps = []
        temp_f = (initial_state.get("Temp", 20) * 9 / 5) + 32

        for i, action_name in enumerate(path, 1):
            action_data = self.actions[action_name]
            expected_cost = action_data["cost"] / action_data["prob"]

            rationale = action_data["description"]
            
            # Dynamic Explanations
            if action_name == "Relocate_Hive":
                rationale = (
                    "System detected a critical Synergistic Lethality loop. "
                    "Local agricultural pesticides are actively suppressing the bees' "
                    "Toll immune pathway, while Varroa mites are draining xenobiotic-"
                    "detoxifying fat bodies. Environmental toxicity must be broken "
                    "before chemical mite treatments can be safely administered."
                )
            elif action_name == "Apply_Oxalic_Extended_OAE":
                if temp_f < 50:
                    rationale = (
                        "At freezing or cold temperatures, standard fumigants are biologically "
                        "contraindicated. Extended-release matrices safely kill phoretic mites "
                        "without requiring the bees to break their winter cluster."
                    )
                else:
                    rationale = (
                        "With heavy nectar flows and high ambient temperatures, standard "
                        "fumigants and synthetics are biologically contraindicated. Extended-"
                        "release matrices bypass the brood-penetration limitation by "
                        "continuously killing phoretic mites over a 60-day period."
                    )

            steps.append({
                "step": i,
                "action": action_name,
                "label": action_data["label"],
                "expected_cost": round(expected_cost, 1),
                "description": action_data["description"],
                "rationale": rationale,
                "efficacy": f"{action_data['prob'] * 100:.0f}%",
            })

        return {
            "success": True,
            "optimal_path": path,
            "total_cost": round(total_cost, 1),
            "steps": steps,
            "rejected_actions": rejected,
            "final_state": final_state,
        }