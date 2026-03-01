import json
import networkx as nx
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

print("🧠 Reading Digital Twin Blueprint...")

# 1. Load the NEW "Twin DNA"
try:
    with open('twin_config.json', 'r') as f:
        config = json.load(f)
except FileNotFoundError:
    print("❌ Error: 'twin_config.json' not found. Run the Discovery script first.")
    exit()

# 2. Build the Graph
G = nx.DiGraph()

# Define Colors for different Math Distributions
colors_map = {
    'norm':        '#a8e6cf',  # Green (Normal)
    'triang':      '#ffd3b6',  # Orange (Triangular)
    'uniform':     '#dcedc1',  # Light Green (Uniform)
    'weibull_min': '#ffaaa5',  # Red/Pink (Weibull - Complex)
    'gamma':       '#ff8b94',  # Dark Pink (Gamma)
    'unknown':     '#e0e0e0'   # Grey (Unknown)
}

# Add Nodes (Machines) with Learned Intelligence
topology = config['topology']
stations = config['stations']

for i, station_name in enumerate(topology):
    data = stations.get(station_name, {})
    dist_type = data.get('type', 'unknown')
    params = data.get('params', [])
    
    # Create a Label showing the "Brain's" understanding
    # We unpack the 'params' list based on the distribution type
    label = f"{station_name}\n({dist_type})"
    
    try:
        if dist_type == 'norm':
            # params = [mean, std]
            label += f"\nμ={params[0]:.1f}, σ={params[1]:.1f}"
        elif dist_type == 'triang':
            # params = [c, loc, scale] -> Min=loc, Max=loc+scale, Peak=loc+c*scale
            c, loc, scale = params
            peak = loc + c * scale
            label += f"\nPeak={peak:.1f}"
        elif dist_type == 'uniform':
            # params = [loc, scale] -> Min=loc, Max=loc+scale
            min_val, max_val = params[0], params[0] + params[1]
            label += f"\n[{min_val:.1f}-{max_val:.1f}]"
        elif dist_type == 'weibull_min':
            # params = [c, loc, scale]
            label += f"\nShape={params[0]:.1f}"
    except:
        pass # If params are weird, just show the name

    # Add Node
    color = colors_map.get(dist_type, '#e0e0e0')
    # pos=(i, 0) forces a straight horizontal line layout
    G.add_node(station_name, label=label, color=color, pos=(i, 0))

# Add Edges (The Flow)
for i in range(len(topology) - 1):
    source = topology[i]
    target = topology[i+1]
    G.add_edge(source, target)

# 3. DRAW IT
plt.figure(figsize=(16, 8))

# Use the manual linear position
pos = nx.get_node_attributes(G, 'pos')

# Get colors
node_colors = [nx.get_node_attributes(G, 'color')[node] for node in G.nodes()]

# Draw Nodes
nx.draw_networkx_nodes(G, pos, node_size=6000, node_color=node_colors, edgecolors='black', alpha=0.95)

# Draw Labels
labels = nx.get_node_attributes(G, 'label')
nx.draw_networkx_labels(G, pos, labels=labels, font_size=9, font_weight='bold')

# Draw Arrows (Curved for style)
nx.draw_networkx_edges(G, pos, edge_color='gray', arrows=True, arrowsize=30, width=2.5, connectionstyle='arc3,rad=0.05')

# Add a Professional Legend
legend_elements = [
    Patch(facecolor=colors_map['norm'], edgecolor='black', label='Normal (Bell Curve)'),
    Patch(facecolor=colors_map['triang'], edgecolor='black', label='Triangular'),
    Patch(facecolor=colors_map['uniform'], edgecolor='black', label='Uniform'),
    Patch(facecolor=colors_map['weibull_min'], edgecolor='black', label='Weibull (Complex)')
]
plt.legend(handles=legend_elements, loc='upper center', bbox_to_anchor=(0.5, -0.05), ncol=4, frameon=False, fontsize=12)

plt.title("Self-Inferenced Digital Twin Architecture", fontsize=18, fontweight='bold', pad=20)
plt.axis('off')
plt.tight_layout()

# Save
output_file = 'twin_architecture_map_final.png'
plt.savefig(output_file, dpi=300)
print(f"✅ AI Blueprint Drawn! Saved as '{output_file}'")
plt.show()