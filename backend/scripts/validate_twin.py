import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def validate_twin(real_log, sim_log):
    print("--- [1] LOADING DATA ---")
    real_df = pd.read_csv(real_log)
    sim_df = pd.read_csv(sim_log)
    
    # --- PREPARE REAL DATA ---
    real_df['CaseID'] = real_df['CaseID'].astype(str).str.replace('Job_', '')
    
    # Separate Start and Complete
    real_starts = real_df[real_df['Lifecycle'] == 'START']
    real_ends = real_df[real_df['Lifecycle'] == 'COMPLETE']
    
    # Merge
    real_merged = pd.merge(
        real_starts,
        real_ends,
        on=['CaseID', 'Activity'],
        suffixes=('_Start', '_End')
    )
    
    # Calculate Duration
    real_merged['Service_Time'] = real_merged['Timestamp_End'] - real_merged['Timestamp_Start']
    
    # --- CRITICAL FIX: FILTER OUT ZEROS ---
    # We remove durations <= 0 because they represent logging errors or skipped steps
    original_count = len(real_merged)
    real_merged = real_merged[real_merged['Service_Time'] > 0.001]
    filtered_count = len(real_merged)
    print(f"\n[DATA CLEANING] Removed {original_count - filtered_count} invalid 0-second rows from Real Data.")
    
    # --- COMPARE MEANS ---
    print("\n--- [2] VALIDATION METRICS (Active Jobs Only) ---")
    
    # Calculate Real Mean
    real_means = real_merged.groupby('Activity')['Service_Time'].mean().reset_index()
    real_means = real_means.rename(columns={'Service_Time': 'Service_Time_Real'})
    
    # Calculate Twin Mean
    sim_means = sim_df.groupby('Activity')['Sim_Service_Time'].mean().reset_index()
    sim_means = sim_means.rename(columns={'Sim_Service_Time': 'Service_Time_Twin'})
    
    # Merge
    comparison = pd.merge(real_means, sim_means, on='Activity')
    
    # Error Calculation
    comparison['Error_%'] = abs(comparison['Service_Time_Real'] - comparison['Service_Time_Twin']) / comparison['Service_Time_Real'] * 100
    
    # Print Table
    print(comparison[['Activity', 'Service_Time_Real', 'Service_Time_Twin', 'Error_%']].to_string(index=False))
    
    # --- PLOT GRAPH ---
    plt.figure(figsize=(10, 6))
    x = np.arange(len(comparison))
    width = 0.35
    
    plt.bar(x - width/2, comparison['Service_Time_Real'], width, label='Real (Filtered)', color='#4c72b0')
    plt.bar(x + width/2, comparison['Service_Time_Twin'], width, label='Digital Twin', color='#55a868')
    
    plt.xticks(x, comparison['Activity'], rotation=45)
    plt.ylabel('Mean Processing Time (s)')
    plt.title('Validation: Real vs Digital Twin (Corrected)')
    plt.legend()
    plt.tight_layout()
    plt.savefig('validation_result_fixed.png')
    print("\n[DONE] Graph saved to 'validation_result_fixed.png'")

if __name__ == "__main__":
    validate_twin('production_event_log_v2.csv', 'simulation_output.csv')