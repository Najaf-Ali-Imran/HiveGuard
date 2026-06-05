# Viva Preparation: `sensor_fusion.py`

## Overview
This file acts as the **"Brain Hub"** of the application. It bridges the gap between the raw Machine Learning models (Vision and Tabular) and the logical reasoning engines (A* Search and Knowledge Base). It loads the trained models, runs inference on the user data, and "fuses" the outputs together.

---

## 🎯 Which Project Requirement Steps Does This Solve?

This file plays a pivotal role in **Step 7** and **Step 10**:
* **Step 7(b) Initial State Formulation:** The project requires the initial state of the search agent to be informed by the ML model's prediction. The `generate_initial_state()` function in this file does exactly that—it takes the ML outputs and formats them into a dictionary the A* agent can understand.
* **Step 10 System Integration:** This file integrates the disjointed components (FastAPI routes, Python ML models, and Logic systems) into a complete intelligent system workflow. It acts as the pipeline controller.

---

## 🧠 Line-by-Line / Block-by-Block Explanation

### 1. `_load_vision_model` and `_load_tabular_model`
**What it does:** Loads the trained Machine Learning models from disk when the server starts.
**How it works:** 
* For Vision: It uses `onnxruntime.InferenceSession` to load the EfficientNet-B4 CNN model.
* For Tabular: It uses `joblib.load` to load the scikit-learn Stacking Ensemble v1 (Random Forest + GBM + XGBoost + Logistic Regression) and its associated StandardScaler.
**Why:** Models must be loaded into memory to make predictions. Using ONNX allows the heavy PyTorch/TensorFlow CNN to run lightweight and fast on a CPU. The Stacking model represents the final culmination of Step 3 (Advanced Model).

### 2. `_preprocess_image(self, image_bytes)`
**What it does:** Transforms a raw image file from the user into a mathematical tensor.
**How it works:** It uses `PIL.Image` to resize the image to exactly `280x160` (the dimensions the ONNX model expects). It then normalizes the pixel values (dividing by 255) and applies ImageNet mean/standard deviation. Finally, it transposes the array into a `(1, 3, 160, 280)` shape.
**Why:** Convolutional Neural Networks cannot "look" at JPEGs. They require strictly formatted, normalized, multi-dimensional floating-point arrays.

### 3. `predict_vision(self, image_bytes_list)`
**What it does:** Runs the image through the CNN to check for Varroa mites.
**How it works:** It passes the preprocessed image tensor to `self.vision_session.run()`. It extracts the logits (raw prediction scores), applies a softmax function to get percentages, and checks if the "Varroa Mite" class confidence is high.
**Why:** This provides the visual confirmation layer of the system. Even if the environment looks safe, visual proof of mites overrides other assumptions.

### 4. `predict_regional_risk(self, env_data)`
**What it does:** Runs the 13 user inputs + 6 derived features through the Stacking Ensemble.
**How it works:** It extracts the 19 features in the exact order the model was trained on, scales them using the `StandardScaler` (`self.scaler.transform`), and runs `self.tab_model.predict()`. It maps the numerical output (0, 1, 2) to labels (Low, Medium, Severe).
**Why:** This is the core environmental prediction. It evaluates whether the combination of temperature, colony management, and stress factors typically leads to a hive collapse.

### 5. `generate_initial_state(self, env_data, image_bytes_list)`
**What it does:** Performs the actual "Sensor Fusion".
**How it works:** It calls the Vision predictor and the Tabular predictor. If both run, it combines their outputs. For example, if the tabular model says "Low Risk" but the vision model detects mites, the final state will reflect "Low Regional Risk, but Infected with Varroa".
**Why:** This creates the multi-dimensional `initial_state` dictionary that is passed to the A* Agent and the Knowledge Base. 

---
## 💡 Tips for the Viva
* **If the teacher asks:** *"How did you connect your trained ML models to the rest of the application?"*
  **Your Answer:** "I built a `sensor_fusion.py` module. I exported my trained tabular model using `joblib` and my CNN using ONNX. The fusion script loads these models into server memory, takes the API data, preprocesses it, runs inference, and packages the outputs into a single 'state' dictionary that the logic agents can consume."
* **If the teacher asks:** *"What is Sensor Fusion?"*
  **Your Answer:** "It's the process of combining data from multiple different sources (in my case, an environmental tabular model and a visual CNN model) to get a more accurate and comprehensive understanding of the situation than either model could provide alone."
