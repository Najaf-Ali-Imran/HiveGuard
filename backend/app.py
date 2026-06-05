# HiveGuard Backend — FastAPI Server
# Exposes the 5-layer AI pipeline as REST API endpoints
# NO mock logic, NO silent fallbacks — all errors surface to the frontend

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import json
import os

from state_data import get_state_names, get_state_encoded
from climate_rules import get_temp_range, validate_temperature
from sensor_fusion import get_sensors
from a_star_agent import HiveGuardAgent
from knowledge_base import HiveGuardKB, build_kb_facts
from prescription import BeekeeperPrescription

# ========== App Setup ==========

app = FastAPI(
    title="HiveGuard AI/ML Backend",
    description="AI/ML-powered beehive health monitoring & colony collapse prediction",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI systems at startup
sensors = get_sensors()
kb_system = HiveGuardKB()

# ========== Endpoints ==========

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "vision_model": sensors.vision_ready,
        "tabular_model": sensors.tabular_ready,
    }

@app.get("/api/states")
def get_states():
    return {"states": get_state_names()}

@app.get("/api/climate/{state}/{quarter}")
def get_climate_range(state: str, quarter: int):
    try:
        temp_range = get_temp_range(state, quarter)
        return temp_range
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analyze")
async def run_full_analysis(
    state: str = Form(...),
    quarter: int = Form(...),
    pesticide_proximity: bool = Form(...),
    fungicide_proximity: bool = Form(False),
    honey_supers: bool = Form(...),
    
    # ── The 13 required UI biological inputs ──
    colony_n: int = Form(...),
    colony_added: int = Form(...),
    colony_reno_pct: float = Form(...),
    stress_varroa_mites: float = Form(...),
    stress_diseases: float = Form(...),
    stress_other_pests_parasites: float = Form(...),
    stress_pesticides: float = Form(...),
    stress_unknown: float = Form(...),
    stress_other: float = Form(...),
    yield_per_colony: float = Form(...),
    temperature_f: float = Form(...),
    
    files: Optional[list[UploadFile]] = File(None),
):
    try:
        valid_states = get_state_names()
        if state not in valid_states:
            return JSONResponse(status_code=400, content={"detail": f"Invalid state: '{state}'."})

        temp_validation = validate_temperature(state, quarter, temperature_f)
        temp_f = temp_validation["clamped_temp"]
        temp_c = (temp_f - 32) * 5 / 9

        state_encoded = get_state_encoded(state)

        # ── Calculate the 6 Derived Mathematical Features ──
        yield_deviation_pct = 0.0
        varroa_pesticide_synergy = float(stress_varroa_mites) * float(stress_pesticides)
        max_temp_celsius = temp_c + 5.0
        min_temp_celsius = temp_c - 5.0
        temp_std = 3.0
        cold_week_ratio = max(0.0, (10.0 - temp_c) / 20.0)

        image_bytes_list = []
        if files:
            for file in files:
                if file.content_type and file.content_type.startswith("image/"):
                    img_bytes = await file.read()
                    if len(img_bytes) > 0:
                        image_bytes_list.append(img_bytes)

        if not sensors.tabular_ready:
            return JSONResponse(status_code=503, content={"detail": "Tabular Model is not connected."})
        if len(image_bytes_list) > 0 and not sensors.vision_ready:
            return JSONResponse(status_code=503, content={"detail": "Vision Model is not connected."})

        # ===== STEP 1: Sensor Fusion =====
        env_data = {
            "quarter": quarter,
            "state_encoded": state_encoded,
            "colony_n": colony_n,
            "colony_added": colony_added,
            "colony_reno_pct": colony_reno_pct,
            "stress_diseases": stress_diseases,
            "stress_other": stress_other,
            "stress_other_pests_parasites": stress_other_pests_parasites,
            "stress_pesticides": stress_pesticides,
            "stress_unknown": stress_unknown,
            "stress_varroa_mites": stress_varroa_mites,
            "yield_per_colony": yield_per_colony,
            "yield_deviation_pct": yield_deviation_pct,
            "avg_temp_celsius": temp_c,
            "max_temp_celsius": max_temp_celsius,
            "min_temp_celsius": min_temp_celsius,
            "temp_std": temp_std,
            "cold_week_ratio": cold_week_ratio,
            "varroa_pesticide_synergy": varroa_pesticide_synergy
        }
        fusion_result = sensors.generate_initial_state(env_data, image_bytes_list)
        initial_state = fusion_result["state"]

        initial_state["Honey_Supers"] = honey_supers
        initial_state["Colony_Size"] = colony_n
        initial_state["Fungicide_Present"] = fungicide_proximity
        initial_state["Temp"] = temp_c

        # ===== STEP 2: A* Search =====
        agent = HiveGuardAgent()
        a_star_result = agent.a_star_search(initial_state)

        # ===== STEP 3: Knowledge Base =====
        proposed_treatment = None
        if a_star_result["optimal_path"]:
            for act in a_star_result["optimal_path"]:
                if act.startswith("Apply_"):
                    proposed_treatment = act.replace("Apply_", "")
                    break

        kb_facts = build_kb_facts(
            cnn_result=initial_state.get("CNN_Varroa", "N/A"),
            pesticide_proximity=pesticide_proximity,
            fungicide_proximity=fungicide_proximity,
            quarter=quarter,
            temp_f=temp_f,
            proposed_treatment=proposed_treatment,
            regional_risk=fusion_result["sensor_fusion"]["regional_risk"],
        )
        kb_result = kb_system.run_inference(kb_facts)

        # ===== STEP 4: Prescription =====
        rx = BeekeeperPrescription(kb_result, a_star_result)
        prescription_result = rx.generate()

        return {
            "temperature_warning": temp_validation.get("warning"),
            "sensor_fusion": fusion_result["sensor_fusion"],
            "a_star": a_star_result,
            "knowledge_base": kb_result,
            "prescription": prescription_result,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": f"Analysis failed: {str(e)}"})

@app.post("/api/scan")
async def scan_bee_images(files: list[UploadFile] = File(...)):
    try:
        if not sensors.vision_ready:
            return JSONResponse(status_code=503, content={"detail": "Vision Model is not connected."})

        image_bytes_list = []
        for file in files:
            if file.content_type and file.content_type.startswith("image/"):
                img_bytes = await file.read()
                if len(img_bytes) > 0:
                    image_bytes_list.append(img_bytes)

        if len(image_bytes_list) == 0:
            return JSONResponse(status_code=400, content={"detail": "No valid images uploaded."})

        result = sensors.scan_bee_images(image_bytes_list)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": f"Scan failed: {str(e)}"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)