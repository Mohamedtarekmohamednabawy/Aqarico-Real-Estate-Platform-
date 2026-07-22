"""
Aqarico ML Price Prediction Microservice
FastAPI service that loads a pre-trained XGBoost model and predicts property prices.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
import os
import traceback

app = FastAPI(title="Aqarico ML Price Prediction", version="1.0.0")

# CORS — only Node.js backend calls this, but allow for development
BACKEND_URLS = os.getenv("BACKEND_URL", "http://localhost:5050").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[url.strip() for url in BACKEND_URLS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Load model and encoder on startup -----
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

try:
    model = joblib.load(os.path.join(MODEL_DIR, "xgboost_real_estate_model.pkl"))
    encoder_columns = joblib.load(os.path.join(MODEL_DIR, "data_encoder.pkl"))
    print("[OK] ML model and encoder loaded successfully")
except Exception as e:
    print(f"[ERROR] Error loading model: {e}")
    model = None
    encoder_columns = None


# ----- Request/Response schemas -----
class PredictionRequest(BaseModel):
    location: str = ""
    district: str = ""
    finish: str = ""
    area: float = 100
    bedrooms: int = 2
    bathrooms: int = 1
    yearBuilt: int = 2015
    floor: int = 0
    furnished: int = 0
    electricityMeter: int = 0
    naturalGas: int = 0
    waterMeter: int = 0
    elevator: int = 0
    security: int = 0


class PredictionResponse(BaseModel):
    predictedPrice: int
    currency: str = "EGP"


# ----- Valid locations for warning -----
VALID_LOCATIONS = [
    'Abo Qir', 'Camp Cesar', 'San Stefano', 'Lauran', 'Bakoos', 'Glim',
    'Fleming', 'Cleopatra', 'Sidi Gaber', 'Roshdy', 'Smouha', 'Zezenia',
    'Kafr Abdo', 'Sidi Bishr', 'Bolekly', 'El Mandara', 'El Seyouf',
    'El Awayed', 'Abu Youssef', 'Bahary', 'Mansheya', 'Ibrahimia',
    'El Asafra', 'Miami', 'Sporting', 'El Chatby', 'Ganaklis', 'Victorya',
    'El Hadara', 'Moharram Bek', 'Saba Basha', 'Mahta El Raml', 'El Amreya',
    'Stanley', 'El Mamoura', 'El Montazah', 'El Bitash', 'El Qabari',
    'El Wardiyan', 'Mina El Basal', 'King Mariout', 'Abu Talat', 'El Dekhila',
    'El Hanouvel', 'Kilo 21', 'El Max', "El Saa'ah Sq", 'Ras Al Tin'
]


@app.get("/")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict", response_model=PredictionResponse)
def predict(data: PredictionRequest):
    if model is None or encoder_columns is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")

    # Check if location is in the known list
    warning = None
    if data.location and data.location not in VALID_LOCATIONS:
        warning = f"Location '{data.location}' is not in the training dataset. Prediction may be less accurate."

    try:
        # The encoder_columns contains the exact column names the model expects:
        # ['Area', 'Bedrooms', 'Bathrooms', 'Location', 'District',
        #  'Year Built', 'Finish', 'Floor', 'Furnished', 'Electricity Meter',
        #  'Natural Gas', 'Water Meter', 'Elevator', 'Security']

        # Build input DataFrame matching the exact column order
        input_data = {
            'Area': [data.area],
            'Bedrooms': [data.bedrooms],
            'Bathrooms': [data.bathrooms],
            'Location': [data.location],
            'District': [data.district],
            'Year Built': [data.yearBuilt],
            'Finish': [data.finish],
            'Floor': [data.floor],
            'Furnished': [data.furnished],
            'Electricity Meter': [data.electricityMeter],
            'Natural Gas': [data.naturalGas],
            'Water Meter': [data.waterMeter],
            'Elevator': [data.elevator],
            'Security': [data.security],
        }

        df = pd.DataFrame(input_data)

        # Apply the fitted ColumnTransformer (TargetEncoder + FunctionTransformer)
        # This converts Location, District, Finish strings → numeric values
        df_encoded = encoder_columns.transform(df)

        # Predict — model outputs Log_Price (natural log)
        log_price = model.predict(df_encoded)[0]

        # Reverse the log transformation
        actual_price = int(round(np.exp(log_price)))

        response = {"predictedPrice": actual_price, "currency": "EGP"}

        if warning:
            response["warning"] = warning

        return response

    except Exception as e:
        traceback.print_exc()  # Full traceback visible in HuggingFace Space logs
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
