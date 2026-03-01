import pandas as pd
import numpy as np
import scipy.stats as stats
import json
import networkx as nx
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

def select_best_distribution_ks(data, station_name):
    """
    Selects best distribution using the Kolmogorov-Smirnov (KS) Test.
    Prioritizes Simpler distributions (Normal, Triangular) using a strong bias.
    """
    # 1. Define Candidates
    # Tier 1: The "Likely" Candidates (Simple)
    tier1_candidates = ['norm', 'triang', 'uniform']
    # Tier 2: The "Complex" Candidates (Only if Tier 1 is terrible)
    tier2_candidates = ['weibull_min', 'gamma', 'lognorm', 'expon']
    
    all_candidates = tier1_candidates + tier2_candidates
    results = []
    
    # 2. Fit and Test
    print(f"  > Analyzing {station_name}...")
    
    for dist_name in all_candidates:
        dist = getattr(stats, dist_name)
        try:
            # Fit Parameters
            params = dist.fit(data)
            
            # Perform KS Test (D-statistic measures "distance" from perfect fit)
            # Lower D is better.
            D, p_value = stats.kstest(data, dist_name, args=params)
            
            results.append({
                'name': dist_name,
                'score': D, # Lower is better
                'params': params,
                'tier': 1 if dist_name in tier1_candidates else 2
            })
        except Exception:
            pass

    # Sort by Score (Best Fit First)
    results.sort(key=lambda x: x['score'])
    
    if not results: return None
    
    best_fit = results[0]
    
    # 3. APPLY STRONG OCCAM'S RAZOR
    # Logic: If the winner is Complex (Tier 2), look for a Simple (Tier 1) alternative.
    # If a Tier 1 candidate is within 50% of the Tier 2 score, SWAP IT.
    
    if best_fit['tier'] == 2:
        print(f"    Current Best: {best_fit['name']} (Score: {best_fit['score']:.4f})")
        
        for candidate in results[1:]:
            if candidate['tier'] == 1:
                # Calculate how much "worse" the simple one is
                percent_diff = (candidate['score'] - best_fit['score']) / best_fit['score']
                
                print(f"    Checking Alternative: {candidate['name']} (Score: {candidate['score']:.4f}, Diff: {percent_diff:.1%})")
                
                if percent_diff < 0.50: # 50% Tolerance (Very Aggressive Bias)
                    print(f"    -> OVERRIDE: Swapped {best_fit['name']} for {candidate['name']} (Simpler is better)")
                    best_fit = candidate
                else:
                    print(f"    -> REJECTED: {candidate['name']} is too inaccurate.")
                break # Only compare against the best Tier 1
                
    return best_fit

def discover_system(log_path, output_config_path):
    print(f"--- [1] LOADING CSV: {log_path} ---")
    df = pd.read_csv(log_path)
    
    # Standardize CaseID
    df['CaseID_Std'] = df['CaseID'].astype(str).str.replace('Job_', '')
    df = df[df['CaseID_Std'].str.isnumeric()] 
    df['CaseID_Int'] = df['CaseID_Std'].astype(int)
    df = df.sort_values(by=['CaseID_Int', 'Timestamp'])
    
    # --- A. INFER TOPOLOGY ---
    print("--- [2] INFERRING FLOW (TOPOLOGY) ---")
    completed_events = df[df['Lifecycle'] == 'COMPLETE'].sort_values(['CaseID_Int', 'Timestamp'])
    G = nx.DiGraph()
    case_traces = completed_events.groupby('CaseID_Int')['Activity'].agg(list)
    for trace in case_traces:
        if len(trace) > 1: nx.add_path(G, trace)
    try:
        topology = nx.dag_longest_path(G)
    except nx.NetworkXUnfeasible:
        topology = list(case_traces.mode()[0])
    print(f"  > Flow: {' -> '.join(topology)}")
    
    # --- B. FITTING ---
    print("--- [3] FITTING DISTRIBUTIONS (KS-TEST METHOD) ---")
    station_configs = {}
    
    for station in topology:
        station_df = df[df['Activity'] == station]
        starts = station_df[station_df['Lifecycle'] == 'START'].set_index('CaseID_Int')['Timestamp']
        ends = station_df[station_df['Lifecycle'] == 'COMPLETE'].set_index('CaseID_Int')['Timestamp']
        durations = (ends - starts).dropna()
        data = durations[durations > 0].values
        
        if len(data) < 5: continue

        # USE KS-TEST SELECTOR
        best_fit = select_best_distribution_ks(data, station)
        
        station_configs[station] = {
            "type": best_fit['name'],
            "params": list(best_fit['params'])
        }
        print(f"    FINAL DECISION: '{best_fit['name']}'\n")

    # --- C. SAVE ---
    first_station = topology[0]
    arrivals = df[(df['Activity'] == first_station) & (df['Lifecycle'] == 'QUEUE_ENTER')]
    arrival_trace = sorted(arrivals['Timestamp'].values.tolist())
    
    twin_config = {
        "topology": topology,
        "stations": station_configs,
        "arrival_trace": arrival_trace
    }
    
    with open(output_config_path, 'w') as f:
        json.dump(twin_config, f, indent=4)
    print(f"\n[DONE] Brain saved to {output_config_path}")

if __name__ == "__main__":
    discover_system('production_event_log_v2.csv', 'twin_config.json')