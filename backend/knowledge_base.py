# HiveGuard Backend — Forward Chaining Knowledge Base (Step 9)
# 12-rule biological inference engine
# Starts from ML-derived clues and chains IF-THEN rules to build diagnosis
# Has VETO POWER over A* plan if biologically unsafe

class Rule:
    """A single IF-THEN production rule."""
    def __init__(self, rule_id, name, condition_func, conclusions, explanation):
        self.rule_id = rule_id
        self.name = name
        self.condition_func = condition_func
        self.conclusions = conclusions
        self.explanation = explanation


class HiveGuardKB:
    """Forward-chaining inference engine with 12 biological rules."""

    def __init__(self):
        self.rules = self._initialize_rules()

    def _initialize_rules(self):
        return [
            Rule("R1", "CNN DWV Trigger",
                 lambda f: f.get("CNN_Detects_DWV") is True,
                 {"Mite_Load": "High", "Virus_Load": "High"},
                 "DWV detected visually indicates systemic Varroa infestation (Sec 4.1)"),

            Rule("R2", "CNN K-Wing Trigger",
                 lambda f: f.get("CNN_Detects_K_Wing") is True,
                 {"Physiological_Stress": "High", "Check_Nosema": True},
                 "K-Wing deformity indicates possible Nosema fungal infection (Sec 4.2)"),

            Rule("R3", "Neonicotinoid Synergy",
                 lambda f: f.get("Mite_Load") == "High" and f.get("Pesticide_Proximity") is True,
                 {"Detoxification_Failure": True, "Risk_Level": "Critical"},
                 "Mites deplete fat bodies that normally metabolize pesticides, causing detoxification failure (Sec 3.1)"),

            Rule("R4", "Cyanoamidine Synergy",
                 lambda f: f.get("Pesticide_Proximity") is True and f.get("Fungicide_Proximity") is True,
                 {"Lethal_Synergy": True},
                 "Fungicides inhibit P450 enzymes, creating a lethal pesticide-breakdown failure loop (Sec 3.2)"),

            Rule("R5", "Treatment Toxicity Loop",
                 lambda f: f.get("Lethal_Synergy") is True and f.get("Proposed_Treatment") == "Amitraz",
                 {"Miticide_Toxicity": "Acute", "Cancel_Chemical_Treatment": True},
                 "Fungicide-inhibited P450 enzymes make Amitraz acutely lethal to the colony (Sec 3.2)"),

            Rule("R6", "Nutritional Rescue",
                 lambda f: f.get("Detoxification_Failure") is True,
                 {"Immune_Status": "Compromised", "Action_Feed_Pollen": True},
                 "Pollen supplementation rebuilds vitellogenin (immune protein) in depleted fat bodies (Sec 3.2)"),

            # 🚨 UPDATED: Now checks Q1 and Q4 for Winter
            Rule("R7", "Winter Death Trap",
                 lambda f: f.get("Quarter") in [1, 4] and f.get("Mite_Load") == "High",
                 {"Winter_Fat_Body_Depletion": True, "Risk_Level": "Critical"},
                 "Autumn mites destroy winter bees' fat reserves needed for cold-season survival"),

            # 🚨 UPDATED: The 37°F to 50°F Safe Vaporization Window
            Rule("R8", "Winter Treatment Optimum",
                 lambda f: (f.get("Winter_Fat_Body_Depletion") is True
                           and f.get("Quarter") in [1, 4]
                           and 37 <= f.get("Ambient_Temp", 100) < 50),
                 {"Action_Oxalic_Vaporization": True},
                 "Cold winter (37-50°F) = no capped brood; optimal window for oxalic acid vaporization (Sec 2.4)"),

            # 🚨 NEW: The Below 37°F Freezing Fix! 
            Rule("R8b", "Freezing Treatment Optimum",
                 lambda f: (f.get("Winter_Fat_Body_Depletion") is True
                           and f.get("Quarter") in [1, 4]
                           and f.get("Ambient_Temp", 100) < 37),
                 {"Action_Extended_Oxalic": True},
                 "Temperatures below 37°F risk chilling bees during vaporization. OAE prescribed instead (Sec 1.2)"),

            Rule("R9", "Formic Acid Temp Constraint",
                 lambda f: f.get("Mite_Load") == "High" and f.get("Ambient_Temp", 0) > 85,
                 {"Formic_Pro_Safe": False},
                 "Above 85°F, formic acid flash-off sterilizes the queen (Sec 1.1)"),

            Rule("R10", "Alternative Summer Treatment",
                 lambda f: (f.get("Mite_Load") == "High"
                           and f.get("Formic_Pro_Safe") is False
                           and f.get("Quarter") in [2, 3]),
                 {"Action_Extended_Oxalic": True},
                 "Extended-release oxalic acid is the safe alternative for warm/hot months"),

            Rule("R11", "Emergency Relocation",
                 lambda f: f.get("Lethal_Synergy") is True or f.get("Miticide_Toxicity") == "Acute",
                 {"Action_Relocate_Hive": True},
                 "Environmental toxicity is extreme; physical escape required before any treatment"),

            Rule("R12", "Stable Baseline",
                 lambda f: f.get("Mite_Load") == "Low" and f.get("Pesticide_Proximity") is False,
                 {"Colony_State": "Healthy", "Action_Routine_Monitoring": True},
                 "Colony is healthy; routine monitoring without unnecessary intervention"),

            Rule("R13", "Multi-Modal Synergy",
                 lambda f: f.get("CNN_Varroa") == "Infected" and f.get("Regional_Risk") == "Severe",
                 {"Multi_Modal_Synergy": True, "Risk_Level": "Critical"},
                 "Both vision (CNN) and environmental (Stacking Ensemble v1) models detect intersecting critical threats"),
        ]

    def run_inference(self, initial_facts: dict) -> dict:
        """
        Run forward chaining inference.
        Returns exact dictionary format expected by the React UI.
        """
        facts = initial_facts.copy()
        fired_rules = []
        fired_rule_ids = set()

        cycle = 0
        max_cycles = 20  # safety limit

        while cycle < max_cycles:
            cycle += 1
            new_facts_found = False

            for rule in self.rules:
                if rule.rule_id in fired_rule_ids:
                    continue

                if rule.condition_func(facts):
                    # Check if conclusions would add new knowledge
                    already_known = all(
                        facts.get(k) == v for k, v in rule.conclusions.items()
                    )
                    if not already_known:
                        for k, v in rule.conclusions.items():
                            facts[k] = v

                        fired_rules.append({
                            "rule_id": rule.rule_id,
                            "name": rule.name,
                            "explanation": rule.explanation,
                            "conclusions": {
                                k.replace("_", " "): str(v)
                                for k, v in rule.conclusions.items()
                            },
                        })
                        fired_rule_ids.add(rule.rule_id)
                        new_facts_found = True

            if not new_facts_found:
                break

        # Extract deduced facts (new knowledge)
        deduced = {
            k.replace("_", " "): str(v)
            for k, v in facts.items()
            if k not in initial_facts
        }

        # Identify vetoed treatments specifically for the UI to display
        vetoed = []
        if facts.get("Cancel_Chemical_Treatment"):
            vetoed.append("Chemical treatments cancelled due to lethal synergy risk")
        if facts.get("Formic_Pro_Safe") is False:
            vetoed.append(f"Formic Pro unsafe at current temperature ({facts.get('Ambient_Temp')}°F)")

        return {
            "fired_rules": fired_rules,
            "final_facts": {k.replace("_", " "): str(v) for k, v in facts.items()},
            "deduced_facts": deduced,
            "risk_level": str(facts.get("Risk_Level", "Unknown")),
            "colony_state": str(facts.get("Colony_State", "At Risk")),
            "vetoed_treatments": vetoed,
            "cycles": cycle,
        }


def build_kb_facts(
    cnn_result: str,
    pesticide_proximity: bool,
    fungicide_proximity: bool,
    quarter: int,
    temp_f: float,
    proposed_treatment: str = None,
    regional_risk: str = "Unknown",
) -> dict:
    """
    Build the initial fact set for the Knowledge Base from user inputs.
    Exactly matches original file to prevent UI breaking.
    """
    facts = {
        "CNN_Detects_DWV": cnn_result == "Infected",
        "CNN_Detects_K_Wing": False,  
        "Pesticide_Proximity": pesticide_proximity,
        "Fungicide_Proximity": fungicide_proximity,
        "Quarter": quarter,
        "Ambient_Temp": temp_f,
        "CNN_Varroa": cnn_result,
        "Regional_Risk": regional_risk,
    }

    if proposed_treatment:
        facts["Proposed_Treatment"] = proposed_treatment

    # Derive initial mite load from CNN result OR regional risk (Inclusive/No Override)
    if cnn_result == "Infected" or regional_risk in ["Severe", "Medium"]:
        facts["Mite_Load"] = "High"
    else:
        facts["Mite_Load"] = "Low"

    return facts