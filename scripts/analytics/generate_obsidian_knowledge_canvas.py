"""
scripts/analytics/generate_obsidian_knowledge_canvas.py

Generates an Obsidian JSON Canvas (.canvas) file visually organizing
the 15 Macro Policy Ripple Chains, Ministerial Hubs, and Statutory Anchors.
"""

import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RIPPLE_FILE = os.path.join(PROJECT_ROOT, 'scripts', 'data', 'simulations', 'ripple_effects_manifest.json')
STATUTE_FILE = os.path.join(PROJECT_ROOT, 'scripts', 'data', 'simulations', 'pib_knowledge_graph.json')
OUTPUT_CANVAS = os.path.join(PROJECT_ROOT, '01_VAULT', 'PIB_Policy_Ripple_Web_2026.canvas')
os.makedirs(os.path.dirname(OUTPUT_CANVAS), exist_ok=True)

with open(RIPPLE_FILE, 'r', encoding='utf-8') as f:
    ripple_data = json.load(f)

with open(STATUTE_FILE, 'r', encoding='utf-8') as f:
    kg_data = json.load(f)

chains = ripple_data.get('chains', [])

nodes = []
edges = []

# Canvas colors:
# 1: red, 2: orange, 3: yellow, 4: green, 5: cyan, 6: purple

# 1. Master Central Hub Node
nodes.append({
    "id": "hub-central-union",
    "x": 0,
    "y": 0,
    "width": 500,
    "height": 260,
    "type": "text",
    "text": "## 🏛️ GOVERNMENT OF INDIA // EXECUTIVE APPARATUS\n### Sovereign Policy Ripple Nexus (June–October 2026)\n\n*Central Coordinating Architecture:*\n- **Cabinet Secretariat** · PMO · NITI Aayog\n- **PM GatiShakti NPG** (Multimodal Connectivity)\n- **National Quantum & Semiconductor Missions**\n- **Fiscal Deficit & Liquidity Anchors (MoF / RBI)**\n\n*499 Verified Primary Dossiers Synthesized*",
    "color": "6"
})

# Layout the 15 Macro Chains radially / in grid bands around the central hub
start_y = -1800
y_spacing = 380

for idx, chain in enumerate(chains):
    chain_id = chain['chain_id']
    y_pos = start_y + (idx * y_spacing)
    
    # Chain Master Group / Header Card
    chain_card_id = f"card-{chain_id}"
    nodes.append({
        "id": chain_card_id,
        "x": 800,
        "y": y_pos,
        "width": 420,
        "height": 240,
        "type": "text",
        "text": f"### ⚡ Chain #{idx+1:02d}: {chain['title']}\n**Pillar:** `{chain['primary_pillar']}`\n\n> **Core Driver:** {chain['lead_driver']}\n\n*Total Linked Dispatches:* {len(chain['linked_dispatches'])}",
        "color": "2" if idx % 2 == 0 else "5"
    })
    
    # Edge from Central Hub to Chain
    edges.append({
        "id": f"edge-hub-{chain_id}",
        "fromNode": "hub-central-union",
        "fromSide": "right",
        "toNode": chain_card_id,
        "toSide": "left",
        "label": f"Mandate #{idx+1}"
    })
    
    # Layout individual flow steps horizontally to the right
    step_x = 1350
    prev_step_id = chain_card_id
    
    for s_idx, step in enumerate(chain['nodes_flow']):
        step_id = f"step-{chain_id}-{s_idx}"
        nodes.append({
            "id": step_id,
            "x": step_x,
            "y": y_pos,
            "width": 320,
            "height": 220,
            "type": "text",
            "text": f"**Step {s_idx+1}: {step['ministry']}**\n\n{step['action']}",
            "color": "4" if s_idx == len(chain['nodes_flow']) - 1 else "3"
        })
        
        edges.append({
            "id": f"edge-{prev_step_id}-{step_id}",
            "fromNode": prev_step_id,
            "fromSide": "right",
            "toNode": step_id,
            "toSide": "left",
            "label": "causes" if s_idx > 0 else "triggers"
        })
        
        prev_step_id = step_id
        step_x += 380

# 2. Add Left-Wing Pillar: The 5 Constitutional & Legal Tiers
tier_x = -800
tier_y = -900
nodes.append({
    "id": "pillar-legal-tiers",
    "x": tier_x,
    "y": tier_y,
    "width": 550,
    "height": 600,
    "type": "text",
    "text": "## ⚖️ THE 5 INSTITUTIONAL LEGAL TIERS\n### Deterministic Entity Disambiguation (TASK_080)\n\n### Tier 1: Constitutional Bodies (Art. 75, 324, 338)\n- ECI · NCSC · Union Council of Ministers\n- *Neutralizes PSY_03 Legal Tier Shifts*\n\n### Tier 2: Statutory Regulators (Acts of Parliament)\n- RBI · SEBI · NFRA · CARA · NBA · BIS · CPCB\n- *Neutralizes PSY_01 Authority Swaps*\n\n### Tier 3: Executive Business Divisions\n- India Semiconductor Mission (ISM / MeitY)\n- PM GatiShakti NPG · GeM · DigiDukaan\n\n### Tier 4: Apex Industry Societies\n- Society of Indian Defence Manufacturers (SIDM)\n\n### Tier 5: Commercial PSUs\n- Uranium Corp (UCIL) · Coal India (CIL)",
    "color": "1"
})

edges.append({
    "id": "edge-tiers-to-hub",
    "fromNode": "pillar-legal-tiers",
    "fromSide": "right",
    "toNode": "hub-central-union",
    "toSide": "left",
    "label": "constitutional validity"
})

canvas_payload = {
    "nodes": nodes,
    "edges": edges
}

with open(OUTPUT_CANVAS, 'w', encoding='utf-8') as f:
    json.dump(canvas_payload, f, indent=2)

print(f"✓ Successfully generated Obsidian JSON Canvas ({len(nodes)} nodes, {len(edges)} edges) at:\n  {OUTPUT_CANVAS}")
