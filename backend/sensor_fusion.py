# HiveGuard Backend — Sensor Fusion (ML Model Loading)
# Loads ONNX vision model (T6 EfficientNet-B4) and Stacking Ensemble v1
# NO silent fallbacks — all failures surface loudly to the frontend

import os
import numpy as np

# ONNX Runtime for vision inference
try:
    import onnxruntime as ort
    from PIL import Image
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False

# Tabular model dependencies
try:
    import pandas as pd
    import joblib
    TABULAR_AVAILABLE = True
except ImportError:
    TABULAR_AVAILABLE = False

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# ImageNet normalization constants (T6 EfficientNet-B4)
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# The 19 features required by the Stacking Ensemble v1, in EXACT training order
# Source: hg_master_v3.csv preprocessing pipeline
REQUIRED_FEATURES = [
    'quarter', 'state_encoded', 'colony_n', 'colony_added', 'colony_reno_pct',
    'stress_diseases', 'stress_other', 'stress_other_pests_parasites',
    'stress_pesticides', 'stress_unknown', 'stress_varroa_mites',
    'yield_per_colony', 'yield_deviation_pct',
    'avg_temp_celsius', 'max_temp_celsius', 'min_temp_celsius',
    'temp_std', 'cold_week_ratio', 'varroa_pesticide_synergy'
]

# Risk class mapping: matches training target encoding
RISK_CLASS_MAP = {0: "Low", 1: "Medium", 2: "Severe"}


# ========== Sensor Fusion Engine ==========

class HiveGuardSensors:
    """Loads both ML models and fuses their outputs into a unified initial state."""

    def __init__(self):
        self.vision_session = None
        self.tab_model     = None
        self.scaler        = None
        self.vision_ready  = False
        self.tabular_ready = False

        self._load_vision_model()
        self._load_tabular_model()

    # ── Vision Model ────────────────────────────────────────────────────────

    def _load_vision_model(self):
        """Load T6 EfficientNet-B4 via ONNX Runtime."""
        if not ONNX_AVAILABLE:
            print("[WARN] onnxruntime/Pillow not installed -- vision model unavailable.")
            return

        vision_path = os.path.join(MODELS_DIR, "T6_Model.onnx")
        if not os.path.exists(vision_path):
            print(f"[ERROR] Vision model not found at {vision_path}")
            return

        try:
            self.vision_session = ort.InferenceSession(
                vision_path,
                providers=['CPUExecutionProvider']
            )
            self.vision_ready = True
            print("[OK] T6 Vision Neural Network loaded (ONNX EfficientNet-B4)")
        except Exception as e:
            print(f"[ERROR] Vision model load failed: {e}")
            self.vision_session = None

    # ── Tabular Model ───────────────────────────────────────────────────────

    def _load_tabular_model(self):
        """Load Stacking Ensemble v1 (RF + GBM + XGBoost -> LogisticRegression)."""
        if not TABULAR_AVAILABLE:
            print("[WARN] pandas/joblib not installed -- tabular model unavailable.")
            return

        tabular_path = os.path.join(MODELS_DIR, "Tabular_Stack_v1.pkl")
        scaler_path  = os.path.join(MODELS_DIR, "Stack_v1_scaler.pkl")

        if not os.path.exists(tabular_path) or not os.path.exists(scaler_path):
            print(f"[ERROR] Tabular model files not found in {MODELS_DIR}")
            return

        try:
            self.scaler    = joblib.load(scaler_path)
            self.tab_model = joblib.load(tabular_path)
            self.tabular_ready = True
            print("[OK] Tabular Stacking Ensemble v1 loaded (RF + GBM + XGBoost + LogReg meta)")
        except Exception as e:
            print(f"[ERROR] Tabular model load failed: {e}")
            self.tab_model = None
            self.scaler    = None

    # ── Vision Inference (ONNX) ─────────────────────────────────────────────

    def _preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        from io import BytesIO
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        img = img.resize((280, 160), Image.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0
        arr = (arr - IMAGENET_MEAN) / IMAGENET_STD
        arr = arr.transpose(2, 0, 1)
        arr = np.expand_dims(arr, axis=0)
        return arr

    def scan_bee_images(self, image_bytes_list: list) -> dict:
        if not self.vision_ready or self.vision_session is None:
            raise RuntimeError("Vision Model is not connected.")

        if not image_bytes_list:
            return {
                "result": "N/A",
                "infection_rate": 0.0,
                "disease": "None detected",
                "description": "No images provided.",
            }

        try:
            input_name    = self.vision_session.get_inputs()[0].name
            infected_count = 0
            total_photos   = len(image_bytes_list)

            for image_bytes in image_bytes_list:
                input_tensor = self._preprocess_image(image_bytes)
                outputs      = self.vision_session.run(None, {input_name: input_tensor})
                logits       = outputs[0][0]
                pred_class   = int(np.argmax(logits))
                if pred_class == 1:
                    infected_count += 1

            infection_rate = infected_count / total_photos

            if infection_rate > 0:
                return {
                    "result": "Infected",
                    "infection_rate": round(infection_rate, 3),
                    "disease": "Varroa Mite Infestation / Deformed Wing Virus (DWV)",
                    "description": (
                        f"The AI vision model detected visual markers consistent with Varroa "
                        f"across {infected_count} out of {total_photos} photos "
                        f"(Infection Rate: {infection_rate:.1%})."
                    ),
                }
            else:
                return {
                    "result": "Healthy",
                    "infection_rate": 0.0,
                    "disease": "None detected",
                    "description": (
                        f"The AI vision model scanned {total_photos} photos and found no visual "
                        f"indicators of Varroa mite infestation or Deformed Wing Virus."
                    ),
                }
        except Exception as e:
            print(f"Vision scan error: {e}")
            raise RuntimeError(f"Vision scan error: {e}")

    def scan_bee_image(self, image_bytes: bytes) -> dict:
        return self.scan_bee_images([image_bytes])

    # ── Tabular Inference (Stacking Ensemble v1) ────────────────────────────

    def predict_regional_risk(self, env_data: dict) -> str:
        if not self.tabular_ready or self.tab_model is None:
            raise RuntimeError("Tabular Model is not connected.")

        missing = [f for f in REQUIRED_FEATURES if f not in env_data]
        if missing:
            raise ValueError(f"Missing required features for tabular model: {missing}.")

        try:
            # Build feature row in exact training order
            feature_row = {feat: env_data[feat] for feat in REQUIRED_FEATURES}

            # If scaler has stored feature names, use that order (guaranteed match)
            expected_features = (
                list(self.scaler.feature_names_in_)
                if hasattr(self.scaler, 'feature_names_in_')
                else REQUIRED_FEATURES
            )

            aligned    = {feat: feature_row[feat] for feat in expected_features}
            df         = pd.DataFrame([aligned], columns=expected_features)
            X_scaled   = self.scaler.transform(df)
            X_scaled_df = pd.DataFrame(X_scaled, columns=expected_features)

            risk_class = int(self.tab_model.predict(X_scaled_df)[0])
            return RISK_CLASS_MAP.get(risk_class, "Medium")

        except Exception as e:
            raise RuntimeError(f"Tabular model prediction failed: {e}")

    # ── Sensor Fusion ───────────────────────────────────────────────────────

    def generate_initial_state(self, env_data: dict, image_bytes_list: list = None) -> dict:
        regional_risk  = self.predict_regional_risk(env_data)

        infection_rate = 0.0
        if image_bytes_list:
            vision_result  = self.scan_bee_images(image_bytes_list)
            cnn_varroa     = vision_result["result"]
            infection_rate = vision_result["infection_rate"]
        else:
            cnn_varroa = "N/A"

        pest_stress = env_data.get("stress_pesticides", 0)
        pest_risk   = "High" if pest_stress > 5.0 else "Low"

        initial_state = {
            "Regional_Risk":  regional_risk,
            "CNN_Varroa":     cnn_varroa,
            "Quarter":        env_data.get("quarter", 1),
            "Pesticide_Risk": pest_risk,
            "Temp":           env_data.get("avg_temp_celsius", 20.0),
        }

        return {
            "state": initial_state,
            "sensor_fusion": {
                "regional_risk":       regional_risk,
                "cnn_varroa":          cnn_varroa,
                "infection_rate":      infection_rate,
                "pesticide_risk":      pest_risk,
                "vision_model_active": self.vision_ready,
                "tabular_model_active": self.tabular_ready,
            },
        }


_sensors = None

def get_sensors() -> HiveGuardSensors:
    global _sensors
    if _sensors is None:
        _sensors = HiveGuardSensors()
    return _sensors
