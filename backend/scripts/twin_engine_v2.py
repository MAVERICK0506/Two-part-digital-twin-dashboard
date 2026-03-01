import simpy
import json
import scipy.stats as stats # Use Scipy for generation now
import pandas as pd

class UniversalTwin:
    def __init__(self, env, config):
        self.env = env
        self.config = config
        self.topology = config['topology']
        self.logs = []
        
        # Create Stations
        self.stations = {name: simpy.Resource(env, capacity=1) for name in self.topology}

    def get_service_time(self, station_name):
        # 1. Get the Math from JSON
        dist_info = self.config['stations'].get(station_name)
        if not dist_info: return 1.0
        
        dist_type = dist_info['type']     # e.g., "weibull_min"
        dist_params = dist_info['params'] # e.g., [2.5, 0, 5.1]
        
        # 2. Dynamic Generation (No if/else needed!)
        # We ask Scipy: "Give me the function named X"
        dist_func = getattr(stats, dist_type)
        
        # 3. Generate Random Number (RVS)
        # We unpack (*) the parameters list into the function
        val = dist_func.rvs(*dist_params)
        
        return max(0.01, val) # Safety floor

    def process_job(self, job_id, arrival_time):
        yield self.env.timeout(arrival_time - self.env.now)
        
        for station in self.topology:
            q_enter = self.env.now
            with self.stations[station].request() as req:
                yield req
                
                # Process
                start = self.env.now
                duration = self.get_service_time(station)
                yield self.env.timeout(duration)
                
                # Log
                self.logs.append({
                    'CaseID': job_id,
                    'Activity': station,
                    'Sim_Service_Time': duration,
                    'Sim_Waiting_Time': start - q_enter,
                    'Sim_Complete_Timestamp': self.env.now
                })

def run_simulation(config_path, output_log_path):
    print(f"--- [1] LOADING UNIVERSAL DNA ---")
    with open(config_path, 'r') as f:
        config = json.load(f)
        
    env = simpy.Environment()
    twin = UniversalTwin(env, config)
    
    # Initialize Jobs
    arrival_trace = config['arrival_trace']
    start_offset = arrival_trace[0]
   # launch jobs  
    for i, timestamp in enumerate(arrival_trace):
        env.process(twin.process_job(f"Sim_{i+1}", timestamp - start_offset))
        
    print(f"--- [2] RUNNING SIMULATION ({len(arrival_trace)} jobs) ---")
   #run sim
    env.run()
    #save results
    pd.DataFrame(twin.logs).to_csv(output_log_path, index=False)
    print(f"[DONE] Simulation saved to {output_log_path}")
# calling out the defined function to run the simulation with the given config and output paths
if __name__ == "__main__":
    run_simulation('twin_config.json', 'simulation_output.csv')