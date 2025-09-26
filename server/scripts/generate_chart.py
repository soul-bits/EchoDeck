#!/usr/bin/env python3
"""
Chart generation script for EchoDeck presentations
Generates charts based on data extracted from transcripts
"""

import json
import sys
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import os
from typing import Dict, Any, List

def setup_matplotlib():
    """Setup matplotlib for non-interactive use"""
    plt.switch_backend('Agg')  # Use non-interactive backend
    plt.style.use('default')
    
    # Set font and style for professional look
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['font.sans-serif'] = ['Arial', 'Helvetica', 'DejaVu Sans']
    plt.rcParams['font.size'] = 10
    plt.rcParams['axes.linewidth'] = 0.8
    plt.rcParams['grid.alpha'] = 0.3

def generate_bar_chart(data: Dict[str, Any], output_path: str) -> bool:
    """Generate a bar chart"""
    try:
        fig, ax = plt.subplots(figsize=(8, 6))
        
        labels = data.get('labels', [])
        values = data.get('values', [])
        title = data.get('title', 'Chart')
        xlabel = data.get('xlabel', '')
        ylabel = data.get('ylabel', '')
        
        bars = ax.bar(labels, values, color='#3b82f6', alpha=0.8)
        
        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + max(values) * 0.01,
                   f'{height:.1f}', ha='center', va='bottom')
        
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        plt.close()
        return True
    except Exception as e:
        print(f"Error generating bar chart: {e}", file=sys.stderr)
        return False

def generate_line_chart(data: Dict[str, Any], output_path: str) -> bool:
    """Generate a line chart"""
    try:
        fig, ax = plt.subplots(figsize=(8, 6))
        
        x_values = data.get('x_values', [])
        y_values = data.get('y_values', [])
        title = data.get('title', 'Chart')
        xlabel = data.get('xlabel', '')
        ylabel = data.get('ylabel', '')
        
        ax.plot(x_values, y_values, marker='o', linewidth=2.5, 
               markersize=6, color='#3b82f6')
        
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close()
        return True
    except Exception as e:
        print(f"Error generating line chart: {e}", file=sys.stderr)
        return False

def generate_pie_chart(data: Dict[str, Any], output_path: str) -> bool:
    """Generate a pie chart"""
    try:
        fig, ax = plt.subplots(figsize=(8, 6))
        
        labels = data.get('labels', [])
        values = data.get('values', [])
        title = data.get('title', 'Chart')
        
        colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
        
        wedges, texts, autotexts = ax.pie(values, labels=labels, autopct='%1.1f%%',
                                         colors=colors[:len(values)], startangle=90)
        
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close()
        return True
    except Exception as e:
        print(f"Error generating pie chart: {e}", file=sys.stderr)
        return False

def main():
    """Main function to generate charts based on input JSON"""
    if len(sys.argv) != 3:
        print("Usage: python generate_chart.py <input_json> <output_path>", file=sys.stderr)
        sys.exit(1)
    
    input_json = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        # Parse input data
        data = json.loads(input_json)
        chart_type = data.get('type', 'bar')
        
        # Setup matplotlib
        setup_matplotlib()
        
        # Generate appropriate chart
        success = False
        if chart_type == 'bar':
            success = generate_bar_chart(data, output_path)
        elif chart_type == 'line':
            success = generate_line_chart(data, output_path)
        elif chart_type == 'pie':
            success = generate_pie_chart(data, output_path)
        else:
            print(f"Unsupported chart type: {chart_type}", file=sys.stderr)
            sys.exit(1)
        
        if success:
            print(f"Chart generated successfully: {output_path}")
            sys.exit(0)
        else:
            sys.exit(1)
            
    except json.JSONDecodeError as e:
        print(f"Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()