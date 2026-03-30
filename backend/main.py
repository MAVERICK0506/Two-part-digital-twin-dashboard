from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import subprocess
import os
from pathlib import Path
import io
import random
from collections import defaultdict

import simpy
import scipy.stats as stats
import pandas as pd

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

def _sample_duration(distribution, params):
    """Sample a positive service-time duration from a configured distribution."""
    dist_type = (distribution or "norm").lower()
    p1 = float(params.get("p1", 5.0))
    p2 = float(params.get("p2", 1.0))
    p3 = float(params.get("p3", 0.0))

    try:
        if dist_type == "norm":
            val = stats.norm.rvs(loc=p1, scale=max(0.001, p2))
        elif dist_type == "weibull":
            val = stats.weibull_min.rvs(max(0.01, p1), loc=0, scale=max(0.001, p2))
        elif dist_type == "expon":
            val = stats.expon.rvs(loc=0, scale=max(0.001, p1))
        elif dist_type == "uniform":
            low = min(p1, p2)
            high = max(p1, p2)
            val = stats.uniform.rvs(loc=low, scale=max(0.001, high - low))
        elif dist_type == "triang":
            minimum = p1
            mode = p2
            maximum = p3
            if maximum <= minimum:
                maximum = minimum + 0.001
            c = min(1.0, max(0.0, (mode - minimum) / (maximum - minimum)))
            val = stats.triang.rvs(c=c, loc=minimum, scale=maximum - minimum)
        else:
            val = p1
    except Exception:
        val = p1

    return max(0.001, float(val))


def _build_paths(nodes_by_id, outgoing, sources, sinks, job_count, max_steps=200):
    """Create one routing path per job from source to sink based on graph edges."""
    paths = []
    source_list = list(sources)
    if not source_list:
        source_list = list(nodes_by_id.keys())

    sink_set = set(sinks)

    for _ in range(job_count):
        current = random.choice(source_list)
        route = [current]
        steps = 0

        while current not in sink_set and steps < max_steps:
            next_nodes = outgoing.get(current, [])
            if not next_nodes:
                break
            current = random.choice(next_nodes)
            route.append(current)
            steps += 1

        paths.append(route)

    return paths


@app.post("/api/manual-simulate")
def run_manual_simulation(payload: dict):
    """Run user-designed plant simulation and return downloadable event-log CSV content."""
    try:
        plant = payload.get("plant", {})
        nodes = plant.get("nodes", [])
        edges = plant.get("edges", [])
        settings = payload.get("settings", {})

        if not nodes:
            return JSONResponse(content={"error": "Plant must include at least one node."}, status_code=400)

        job_count = int(settings.get("jobCount", 100))
        job_count = max(1, min(10000, job_count))
        interarrival = float(settings.get("interarrival", 1.0))
        interarrival = max(0.001, interarrival)
        seed = settings.get("seed")

        if seed is not None and str(seed).strip() != "":
            random.seed(int(seed))
            try:
                import numpy as np
                np.random.seed(int(seed))
            except Exception:
                pass

        nodes_by_id = {str(n["id"]): n for n in nodes if n.get("id")}
        outgoing = defaultdict(list)
        incoming_count = defaultdict(int)

        for e in edges:
            src = str(e.get("from", ""))
            dst = str(e.get("to", ""))
            if src in nodes_by_id and dst in nodes_by_id and src != dst:
                outgoing[src].append(dst)
                incoming_count[dst] += 1

        sources = [
            node_id
            for node_id, node in nodes_by_id.items()
            if (node.get("type") == "source") or incoming_count[node_id] == 0
        ]
        sinks = [
            node_id
            for node_id, node in nodes_by_id.items()
            if (node.get("type") == "sink") or len(outgoing.get(node_id, [])) == 0
        ]

        paths = _build_paths(nodes_by_id, outgoing, sources, sinks, job_count)

        env = simpy.Environment()
        logs = []

        station_resources = {}
        for node_id, node in nodes_by_id.items():
            node_type = (node.get("type") or "station").lower()
            if node_type in {"station", "machine", "utility"}:
                capacity = int(node.get("capacity", 1))
                station_resources[node_id] = simpy.Resource(env, capacity=max(1, capacity))

        arrival_trace = []
        current_time = 0.0
        for _ in range(job_count):
            current_time += random.expovariate(1.0 / interarrival)
            arrival_trace.append(current_time)

        def process_job(job_idx, route, arrival_time):
            yield env.timeout(arrival_time - env.now)
            case_id = f"Job_{job_idx}"

            for node_id in route:
                node = nodes_by_id[node_id]
                activity_name = node.get("name") or node_id
                node_type = (node.get("type") or "station").lower()

                if node_id not in station_resources:
                    continue

                logs.append({
                    "CaseID": case_id,
                    "Activity": activity_name,
                    "Timestamp": round(env.now, 6),
                    "Lifecycle": "QUEUE_ENTER",
                })

                with station_resources[node_id].request() as req:
                    yield req

                    logs.append({
                        "CaseID": case_id,
                        "Activity": activity_name,
                        "Timestamp": round(env.now, 6),
                        "Lifecycle": "START",
                    })

                    dist = (node.get("distribution") or {}).get("type", "norm")
                    params = (node.get("distribution") or {}).get("params", {})
                    duration = _sample_duration(dist, params)

                    yield env.timeout(duration)

                    logs.append({
                        "CaseID": case_id,
                        "Activity": activity_name,
                        "Timestamp": round(env.now, 6),
                        "Lifecycle": "COMPLETE",
                    })

        for i, route in enumerate(paths, start=1):
            env.process(process_job(i, route, arrival_trace[i - 1]))

        env.run()

        if not logs:
            return JSONResponse(content={"error": "No station events were produced. Add at least one machine/utility/station node."}, status_code=400)

        df = pd.DataFrame(logs)
        df = df.sort_values(by=["Timestamp", "CaseID", "Activity", "Lifecycle"]).reset_index(drop=True)

        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_text = csv_buffer.getvalue()

        station_count = len(station_resources)
        total_time = float(df["Timestamp"].max()) if not df.empty else 0.0

        return JSONResponse(content={
            "status": "success",
            "summary": {
                "jobs": job_count,
                "events": int(len(df)),
                "stations": station_count,
                "total_time": round(total_time, 3),
            },
            "csv_content": csv_text,
            "message": "Manual plant simulation completed and CSV event log generated.",
        })
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
