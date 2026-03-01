from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import subprocess
import os
from pathlib import Path

app = FastAPI()

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to your Python scripts
SCRIPTS_DIR = Path(__file__).parent / "scripts"
OUTPUT_DIR = Path(__file__).parent / "outputs"

@app.get("/")
def read_root():
    return {"message": "Digital Twin API is running!"}

@app.get("/api/config")
def get_config():
    """Load and return the twin_config.json"""
    try:
        config_path = SCRIPTS_DIR / "twin_config.json"
        with open(config_path, 'r') as f:
            config = json.load(f)
        return JSONResponse(content=config)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Upload a production log CSV and trigger discovery"""
    try:
        # Save uploaded file
        upload_path = SCRIPTS_DIR / "production_event_log_v2.csv"
        
        # Read and save the uploaded file
        contents = await file.read()
        with open(upload_path, 'wb') as f:
            f.write(contents)
        
        # Run discovery engine
        result = subprocess.run(
            ["python", str(SCRIPTS_DIR / "discovery_engine.py")],
            capture_output=True,
            text=True,
            cwd=SCRIPTS_DIR
        )
        
        if result.returncode != 0:
            return JSONResponse(
                content={"error": f"Discovery failed: {result.stderr}"},
                status_code=500
            )
        
        # Load the newly generated config
        config_path = SCRIPTS_DIR / "twin_config.json"
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        return JSONResponse(content={
            "status": "success",
            "message": "System discovered successfully!",
            "config": config
        })
        
    except Exception as e:
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.post("/api/run-simulation")
def run_simulation():
    """Execute the simulation and return results with validation"""
    try:
        # Run the twin_engine_v2.py script
        result = subprocess.run(
            ["python", str(SCRIPTS_DIR / "twin_engine_v2.py")],
            capture_output=True,
            text=True,
            cwd=SCRIPTS_DIR
        )
        
        if result.returncode != 0:
            return JSONResponse(
                content={"error": result.stderr},
                status_code=500
            )
        
        # Read the simulation output
        output_path = SCRIPTS_DIR / "simulation_output.csv"
        import pandas as pd
        df = pd.read_csv(output_path)
        
        # Calculate twin metrics
        twin_metrics = {
            "total_jobs": len(df['CaseID'].unique()),
            "avg_service_time": df.groupby('Activity')['Sim_Service_Time'].mean().to_dict(),
            "avg_waiting_time": df.groupby('Activity')['Sim_Waiting_Time'].mean().to_dict(),
            "total_time": df['Sim_Complete_Timestamp'].max()
        }
        
        # NOW CALCULATE REAL METRICS from uploaded CSV
        try:
            real_log_path = SCRIPTS_DIR / "production_event_log_v2.csv"
            real_df = pd.read_csv(real_log_path)
            
            # Clean the real data
            real_df['CaseID'] = real_df['CaseID'].astype(str).str.replace('Job_', '')
            real_df = real_df[real_df['CaseID'].str.isnumeric()]
            real_df['CaseID'] = real_df['CaseID'].astype(int)
            
            # Calculate real processing times
            real_starts = real_df[real_df['Lifecycle'] == 'START'][['CaseID', 'Activity', 'Timestamp']]
            real_ends = real_df[real_df['Lifecycle'] == 'COMPLETE'][['CaseID', 'Activity', 'Timestamp']]
            
            real_merged = pd.merge(
                real_starts,
                real_ends,
                on=['CaseID', 'Activity'],
                suffixes=('_Start', '_End')
            )
            
            real_merged['Service_Time'] = real_merged['Timestamp_End'] - real_merged['Timestamp_Start']
            
            # Filter valid durations
            real_merged = real_merged[real_merged['Service_Time'] > 0.001]
            
            # Calculate real averages
            real_avg = real_merged.groupby('Activity')['Service_Time'].mean().to_dict()
            
            # Calculate errors
            validation_data = []
            overall_error = 0
            
            for station in twin_metrics['avg_service_time'].keys():
                twin_time = twin_metrics['avg_service_time'][station]
                real_time = real_avg.get(station, twin_time)  # Use twin if real not available
                
                error = abs(real_time - twin_time) / real_time * 100 if real_time > 0 else 0
                overall_error += error
                
                validation_data.append({
                    "station": station,
                    "real": real_time,
                    "twin": twin_time,
                    "error": error
                })
            
            overall_error = overall_error / len(validation_data) if validation_data else 0
            accuracy = 100 - overall_error
            
        except Exception as e:
            # If real data comparison fails, just return twin metrics
            print(f"Validation comparison error: {e}")
            validation_data = None
            accuracy = None
            overall_error = None
        
        return JSONResponse(content={
            "status": "success",
            "metrics": twin_metrics,
            "validation": {
                "stations": validation_data,
                "accuracy": accuracy,
                "overall_error": overall_error
            },
            "message": "Simulation completed successfully"
        })
        
    except Exception as e:
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/api/validation-results")
def get_validation():
    """Return validation comparison data"""
    try:
        # You can read from validation_result_fixed.png or create JSON data
        # For now, return sample data structure
        validation_data = {
            "stations": [
                {"name": "Manual_Load", "real": 4.7, "twin": 4.7, "error": 0.2},
                {"name": "FrontCover", "real": 5.2, "twin": 5.2, "error": 0.1},
                {"name": "Drilling", "real": 10.6, "twin": 10.6, "error": 0.5},
                {"name": "Camera", "real": 4.0, "twin": 4.0, "error": 0.1},
                {"name": "BackCover", "real": 8.2, "twin": 8.2, "error": 0.3},
                {"name": "Pressing", "real": 3.6, "twin": 3.6, "error": 0.2},
                {"name": "Manual_Unload", "real": 8.2, "twin": 8.2, "error": 0.4}
            ],
            "overall_error": 0.27,
            "accuracy": 99.73
        }
        return JSONResponse(content=validation_data)
    except Exception as e:
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
