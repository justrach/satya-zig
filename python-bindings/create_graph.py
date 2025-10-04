#!/usr/bin/env python3
"""Generate performance comparison graph for dhi"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# Performance data (users/sec)
libraries = ['dhi\n(Zig)', 'satya\n(Rust)', 'msgspec\n(C)', 'Pydantic\n(Python+Rust)']
throughput = [27_313_074, 9_572_438, 8_672_212, 200_000]
colors = ['#00D9FF', '#FF6B6B', '#4ECDC4', '#95E1D3']

# Create figure
fig, ax = plt.subplots(figsize=(12, 7))

# Create bars
bars = ax.bar(libraries, throughput, color=colors, edgecolor='black', linewidth=1.5)

# Add value labels on bars
for bar, value in zip(bars, throughput):
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height,
            f'{value/1_000_000:.1f}M/s',
            ha='center', va='bottom', fontsize=14, fontweight='bold')

# Styling
ax.set_ylabel('Throughput (validations/sec)', fontsize=14, fontweight='bold')
ax.set_title('🚀 dhi Performance: Fastest Validation Library in Python', 
             fontsize=16, fontweight='bold', pad=20)
ax.set_ylim(0, max(throughput) * 1.15)

# Format y-axis
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x/1_000_000:.0f}M'))

# Add grid
ax.grid(axis='y', alpha=0.3, linestyle='--')
ax.set_axisbelow(True)

# Add speedup annotations
dhi_speed = throughput[0]
for i, (lib, speed) in enumerate(zip(libraries[1:], throughput[1:]), 1):
    speedup = dhi_speed / speed
    ax.annotate(f'{speedup:.1f}x faster', 
                xy=(i, speed), 
                xytext=(i, speed + dhi_speed * 0.08),
                ha='center',
                fontsize=11,
                color='red',
                fontweight='bold',
                arrowprops=dict(arrowstyle='->', color='red', lw=2))

# Add footer
plt.figtext(0.5, 0.02, 
            'Benchmark: 10,000 users with 3 validators each (name, email, age) • Python 3.12 • macOS arm64',
            ha='center', fontsize=10, style='italic', color='gray')

plt.tight_layout()
plt.savefig('performance_comparison.png', dpi=300, bbox_inches='tight')
print("✅ Graph saved to performance_comparison.png")
