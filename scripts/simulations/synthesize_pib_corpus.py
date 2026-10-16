import json
import re
import os
import sys
from collections import defaultdict, Counter

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data/simulations/all_pib_digests_499.json', 'r', encoding='utf-8') as f:
    digests = json.load(f)

print(f"Loaded {len(digests)} digests.")

# Categorization rules for the 499 digests
# We will define 9 core broadsheet sections based on keywords and entities

CATEGORIES = {
    "LEAD_CABINET": [
        "cabinet", "prime minister", "president of india", "council of ministers", 
        "governance", "bhavya", "viksit bharat", "national award", "census", "parliament"
    ],
    "ECONOMY_FINANCE": [
        "finance", "rbi", "reserve bank", "tax", "gst", "revenue", "budget", "disinvestment", 
        "banking", "inflation", "sebi", "financial services", "insurance", "pension", 
        "expenditure", "customs", "debt", "lic", "fiscal", "rupee", "forex"
    ],
    "INDUSTRY_TECH_ENERGY": [
        "industry", "commerce", "semiconductor", "electronics", "meity", "pli", "manufacturing", 
        "green hydrogen", "steel", "coal", "petroleum", "natural gas", "critical minerals", 
        "mines", "power", "solar", "renewable", "energy", "textiles", "heavy industry", "telecom"
    ],
    "AGRI_RURAL_COOP": [
        "agriculture", "farmer", "kisan", "crop", "msp", "fertilizer", "soil", "horticulture", 
        "panchayat", "rural development", "cooperation", "cooperative", "dairy", "animal husbandry", 
        "fisheries", "irrigation", "pradhan mantri fasal", "pm-kisan"
    ],
    "ENVIRONMENT_ECOLOGY": [
        "environment", "forest", "climate", "wildlife", "tiger", "biodiversity", "pollution", 
        "cop", "unfccc", "ramsar", "wetland", "clean air", "national park", "sanctuary", 
        "carbon", "conservation", "water", "jal shakti", "ganga", "groundwater"
    ],
    "INFRA_TRANSPORT": [
        "railway", "highway", "road transport", "morth", "port", "shipping", "waterways", 
        "civil aviation", "airport", "metro", "logistics", "gatishakti", "pm gati", "urban", 
        "housing", "smart city", "amrut", "bridge", "expressway"
    ],
    "DEFENSE_SECURITY": [
        "defence", "defense", "army", "navy", "air force", "drdo", "idex", "border", 
        "bro", "security", "coast guard", "missile", "submarine", "frigate", "exercise", 
        "procurement", "indigenisation", "ordnance", "terror", "afspa"
    ],
    "HEALTH_EDU_SOCIAL": [
        "health", "family welfare", "ayushman", "aiims", "ayush", "education", "school", 
        "university", "ugc", "nep", "tribal", "janman", "social justice", "women", "child", 
        "disability", "labour", "employment", "skill", "epfo", "poshan"
    ],
    "SCIENCE_SPACE_ATOMIC": [
        "science", "technology", "space", "isro", "atomic energy", "nuclear", "quantum", 
        "biotechnology", "genome", "csir", "dst", "dbt", "satellite", "chandrayaan", 
        "gaganyaan", "reactor"
    ]
}

categorized = defaultdict(list)

for idx, d in enumerate(digests):
    title = (d.get('title') or '').lower()
    content = (d.get('content') or '').lower()
    full_text = title + " " + content
    
    # Score categories
    best_cat = "LEAD_CABINET"
    max_score = 0
    
    for cat, kws in CATEGORIES.items():
        score = 0
        for kw in kws:
            if kw in title:
                score += 3 # title match weighs 3x
            if kw in content:
                score += 1
        if score > max_score:
            max_score = score
            best_cat = cat
            
    categorized[best_cat].append(d)

print("\n--- Categorization Breakdown ---")
for cat, items in categorized.items():
    print(f"  {cat}: {len(items)} digests")

# Save structured compilation
with open('scripts/data/simulations/pib_categorized_499.json', 'w', encoding='utf-8') as f:
    json.dump({k: len(v) for k, v in categorized.items()}, f, indent=2)
