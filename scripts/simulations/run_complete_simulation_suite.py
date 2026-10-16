"""
scripts/simulations/run_complete_simulation_suite.py

TARK 1.0 — COMPLETE 5-ENGINE SIMULATION SUITE
--------------------------------------------
Engine 1: Virtual UPSC Paper-Setter Committee Simulator (1,000 drafts, 2027 Prelims forecasting)
Engine 2: Aspirant Population Monte Carlo & 50:50 Negative Marking Stress-Tester (100,000 synthetic candidates)
Engine 3: Temporal Policy Mutation & Fact Half-Life Drift Engine
Engine 4: Syllabus "Volcano Node" Drought Rebound Detector (Cross-referencing 137 nodes with 1,598 articles)
Engine 5: Cross-Source Institutional Asymmetry & Blind-Spot Simulator
"""

import json
import os
import math
import numpy as np
from datetime import datetime
from collections import Counter, defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
DB_SNAPSHOT_PATH = os.path.join(PROJECT_ROOT, 'scripts', 'data', 'simulations', 'db_snapshot.json')
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'scripts', 'data', 'simulations')
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 80)
print("TARK 1.0 — INITIALIZING 5-ENGINE SIMULATION SUITE")
print("=" * 80)

# Load DB snapshot
with open(DB_SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
    db = json.load(f)

current_affairs = db.get('current_affairs', [])
pib_digests = db.get('pib_digests', [])
current_affairs_mcqs = db.get('current_affairs_mcqs', [])
pyq_prelims = db.get('pyq_prelims', [])
syllabus_nodes = db.get('syllabus_nodes', [])
pyq_node_analytics = db.get('pyq_node_analytics', [])
question_attempts = db.get('question_attempts', [])
news_ingest_decisions = db.get('news_ingest_decisions', [])
news_ingest_runs = db.get('news_ingest_runs', [])
news_claims = db.get('news_claims', [])
news_claim_mutations = db.get('news_claim_mutations', [])

print(f"Loaded Snapshot:")
print(f" - {len(current_affairs)} Current Affairs Articles")
print(f" - {len(pib_digests)} PIB Digests")
print(f" - {len(current_affairs_mcqs)} Current Affairs MCQs")
print(f" - {len(pyq_prelims)} Prelims PYQs (2000-2025)")
print(f" - {len(syllabus_nodes)} Syllabus Ontology Nodes")
print(f" - {len(pyq_node_analytics)} Node Analytics Records")
print(f" - {len(question_attempts)} Real Student Attempts")
print(f" - {len(news_ingest_decisions)} Ingestion Decisions")
print(f" - {len(news_claims)} Tracked Claims")
print("=" * 80)

# Set random seed for reproducibility
np.random.seed(42)

# ==============================================================================
# CALIBRATION: EMPIRICAL TELEMETRY AUDIT
# ==============================================================================
print("\n[CALIBRATION] Analyzing Empirical Student Telemetry (805 attempts)...")
attempt_subject_stats = defaultdict(lambda: {'attempts': 0, 'correct': 0, 'times': []})
for a in question_attempts:
    subj = a.get('subject_category') or 'General Studies'
    attempt_subject_stats[subj]['attempts'] += 1
    if a.get('is_correct'):
        attempt_subject_stats[subj]['correct'] += 1
    t = a.get('time_spent_seconds')
    if t is not None and t > 0:
        attempt_subject_stats[subj]['times'].append(t)

subject_empirical_rates = {}
for subj, data in attempt_subject_stats.items():
    acc = data['correct'] / data['attempts'] if data['attempts'] > 0 else 0.25
    avg_t = np.mean(data['times']) if data['times'] else 4.0
    subject_empirical_rates[subj] = {
        'attempts': data['attempts'],
        'accuracy': round(acc, 4),
        'avg_dwell_sec': round(avg_t, 2)
    }
print(f"Empirical Accuracy Benchmarks across subjects: {len(subject_empirical_rates)} categories calibrated.")

# ==============================================================================
# ENGINE 1: VIRTUAL UPSC PAPER-SETTER COMMITTEE SIMULATOR (2027 FORECASTING)
# ==============================================================================
print("\n" + "=" * 80)
print("STARTING ENGINE 1: Virtual UPSC Paper-Setter Committee Simulator")
print("=" * 80)

# Map nodes to preliminary weights
node_analytics_map = {n['node_id']: n for n in pyq_node_analytics}
node_details_map = {n['id']: n for n in syllabus_nodes}

# Count news linkages to syllabus nodes
node_news_counts = Counter()
for art in current_affairs:
    summary = art.get('summary') or {}
    # Check static linkages
    static_links = summary.get('static_linkages') or []
    for link in static_links:
        concept = link.get('concept', '').lower()
        for nid, ndata in node_details_map.items():
            gloss = (ndata.get('gloss') or '').lower()
            nid_lower = nid.lower()
            if concept in gloss or nid_lower in concept or any(c in concept for c in nid_lower.split('.')):
                node_news_counts[nid] += 1
    
    # Check tags
    tags = summary.get('tags') or []
    for tag in tags:
        tag_str = str(tag).upper()
        if 'GS1' in tag_str:
            if 'HISTORY' in tag_str or 'HIST' in tag_str: node_news_counts['GS1.HIS.MOD_FREEDOM'] += 1
            if 'GEO' in tag_str: node_news_counts['GS1.GEO.PHYS_IND'] += 1
        elif 'GS2' in tag_str:
            if 'POLITY' in tag_str: node_news_counts['GS2.POL.CONSTITUTION'] += 1
            if 'GOV' in tag_str: node_news_counts['GS2.GOV.SCHEMES'] += 1
            if 'IR' in tag_str or 'INTERNATIONAL' in tag_str: node_news_counts['GS2.IR.BILATERAL'] += 1
        elif 'GS3' in tag_str:
            if 'ECO' in tag_str: node_news_counts['GS3.ECO.MONETARY'] += 1
            if 'ENV' in tag_str: node_news_counts['GS3.ENV.CLIMATE'] += 1
            if 'SCI' in tag_str or 'TECH' in tag_str: node_news_counts['GS3.SCI.EMERGING'] += 1

# Calculate selection scores for all 137 nodes
all_node_ids = list(node_details_map.keys())
node_scores = []

for nid in all_node_ids:
    analytics = node_analytics_map.get(nid, {})
    prelims_count = analytics.get('total_prelims_count') or 0
    last_year = analytics.get('last_tested_year') or 2015
    rec_interval = analytics.get('recurrence_interval_avg') or 2.0
    is_drought = bool(analytics.get('is_drought_topic'))
    news_count = node_news_counts.get(nid, 0)
    
    # Base weight from historical PYQ volume
    w_hist = (prelims_count + 1) / (2890.0 + len(all_node_ids))
    
    # Drought rebound multiplier
    years_since = 2026 - int(last_year)
    if years_since > rec_interval * 1.5 or is_drought:
        m_drought = 1.35 + min(1.0, years_since * 0.08)
    else:
        m_drought = 1.0
        
    # Current affairs pressure
    m_news = 1.0 + math.log1p(news_count * 1.5)
    
    score = w_hist * m_drought * m_news
    node_scores.append(score)

node_probs = np.array(node_scores) / sum(node_scores)

# ==============================================================================
# ENGINE 1: VIRTUAL UPSC PAPER-SETTER COMMITTEE SIMULATOR (2027 FORECASTING)
# ==============================================================================
print("\n" + "=" * 80)
print("STARTING ENGINE 1: Virtual UPSC Paper-Setter Committee Simulator (Hierarchical Two-Stage)")
print("=" * 80)

# Group syllabus nodes by macro subject domain
SUBJECT_DOMAINS = {
    'Economy & Monetary Policy': {
        'target_mean': 18.0, 'target_std': 2.0,
        'filter': lambda nid: 'ECO' in nid or 'FIN' in nid
    },
    'Environment, Biodiversity & Agri': {
        'target_mean': 19.0, 'target_std': 2.2,
        'filter': lambda nid: 'ENV' in nid or 'AGRI' in nid or 'ECOL' in nid
    },
    'Polity & Constitutional Governance': {
        'target_mean': 16.0, 'target_std': 1.8,
        'filter': lambda nid: 'POL' in nid or 'CONSTITUTION' in nid or 'PARLIAMENT' in nid or 'JUD' in nid
    },
    'History, Art & Culture': {
        'target_mean': 15.0, 'target_std': 1.8,
        'filter': lambda nid: 'HIS' in nid or 'CUL' in nid or 'ART' in nid
    },
    'Physical & Indian Geography': {
        'target_mean': 12.0, 'target_std': 1.5,
        'filter': lambda nid: 'GEO' in nid and not ('AGRI' in nid)
    },
    'Science & Technology': {
        'target_mean': 12.0, 'target_std': 1.5,
        'filter': lambda nid: 'SCI' in nid or 'TECH' in nid or 'SPACE' in nid or 'BIO' in nid
    },
    'International Relations & Security': {
        'target_mean': 8.0, 'target_std': 1.2,
        'filter': lambda nid: 'IR' in nid or 'SEC' in nid or 'DEF' in nid
    }
}

# Assign each node to its primary domain
domain_nodes = defaultdict(list)
domain_node_probs = {}

for nid in all_node_ids:
    assigned = False
    for d_name, d_cfg in SUBJECT_DOMAINS.items():
        if d_cfg['filter'](nid):
            domain_nodes[d_name].append(nid)
            assigned = True
            break
    if not assigned:
        domain_nodes['Polity & Constitutional Governance'].append(nid)

# Calculate intra-domain micro selection probabilities
for d_name, nids in domain_nodes.items():
    d_scores = []
    for nid in nids:
        analytics = node_analytics_map.get(nid, {})
        prelims_count = analytics.get('total_prelims_count') or 0
        last_year = analytics.get('last_tested_year') or 2015
        rec_interval = analytics.get('recurrence_interval_avg') or 2.0
        is_drought = bool(analytics.get('is_drought_topic'))
        news_count = node_news_counts.get(nid, 0)
        
        # Intra-domain base weight
        w_hist = (prelims_count + 1) / (sum(node_analytics_map.get(n, {}).get('total_prelims_count') or 0 for n in nids) + len(nids))
        years_since = 2026 - int(last_year)
        m_drought = 1.35 + min(1.0, years_since * 0.08) if (years_since > rec_interval * 1.5 or is_drought) else 1.0
        m_news = 1.0 + math.log1p(news_count * 2.0)
        
        score = w_hist * m_drought * m_news
        d_scores.append(score)
    
    total_s = sum(d_scores)
    domain_node_probs[d_name] = np.array(d_scores) / total_s if total_s > 0 else np.ones(len(nids)) / len(nids)

# Run 1,000 Monte Carlo Paper Drafting Runs
NUM_COMMITTEES = 1000
QUESTIONS_PER_PAPER = 100
node_selection_counts = Counter()
subject_selection_counts = defaultdict(list)
operator_paper_counts = defaultdict(list)

OPERATORS = [
    'PSY_01_INST_SWAP',
    'PSY_02_QUAL_POLARITY',
    'PSY_03_LEGAL_TIER',
    'PSY_04_CAUSAL_INV',
    'PSY_05_SCOPE_MUTATE',
    'PSY_06_PAIR_DECOY',
    'PSY_07_TRUE_NON_CAUSAL'
]
OPERATOR_WEIGHTS = [0.24, 0.22, 0.16, 0.14, 0.12, 0.08, 0.04]

# Dirichlet prior parameters for subject quota allocation
alpha_vector = [SUBJECT_DOMAINS[d]['target_mean'] for d in SUBJECT_DOMAINS]
domain_names_list = list(SUBJECT_DOMAINS.keys())

for c_idx in range(NUM_COMMITTEES):
    # Stage 1: Sample macro subject quota for this committee
    quota_sample = np.random.dirichlet(alpha_vector) * QUESTIONS_PER_PAPER
    raw_quotas = np.round(quota_sample).astype(int)
    # Adjust to sum exactly to 100
    diff = QUESTIONS_PER_PAPER - sum(raw_quotas)
    raw_quotas[np.argmax(raw_quotas)] += diff
    
    paper_nodes = []
    for d_idx, d_name in enumerate(domain_names_list):
        n_q = max(1, raw_quotas[d_idx])
        subject_selection_counts[d_name].append(n_q)
        
        nids = domain_nodes[d_name]
        p_nodes = domain_node_probs[d_name]
        chosen = np.random.choice(nids, size=n_q, p=p_nodes, replace=True)
        paper_nodes.extend(chosen)
        for nid in chosen:
            node_selection_counts[nid] += 1
            
    # Operator distribution in this paper
    paper_operators = np.random.choice(OPERATORS, size=QUESTIONS_PER_PAPER, p=OPERATOR_WEIGHTS)
    op_counts = Counter(paper_operators)
    for op in OPERATORS:
        operator_paper_counts[op].append(op_counts[op])

engine_1_results = {
    'committees_simulated': NUM_COMMITTEES,
    'questions_simulated': NUM_COMMITTEES * QUESTIONS_PER_PAPER,
    'subject_forecast': {},
    'top_predicted_nodes': [],
    'operator_forecast': {}
}

for s, counts in subject_selection_counts.items():
    engine_1_results['subject_forecast'][s] = {
        'mean': round(float(np.mean(counts)), 2),
        'std': round(float(np.std(counts)), 2),
        'ci_95': [int(np.percentile(counts, 2.5)), int(np.percentile(counts, 97.5))],
        'min': int(np.min(counts)),
        'max': int(np.max(counts))
    }

for op, counts in operator_paper_counts.items():
    engine_1_results['operator_forecast'][op] = {
        'mean_questions_per_paper': round(float(np.mean(counts)), 2),
        'std': round(float(np.std(counts)), 2),
        'ci_95': [int(np.percentile(counts, 2.5)), int(np.percentile(counts, 97.5))]
    }

top_nodes_sorted = node_selection_counts.most_common(25)
for nid, count in top_nodes_sorted:
    ndata = node_details_map.get(nid, {})
    analytics = node_analytics_map.get(nid, {})
    engine_1_results['top_predicted_nodes'].append({
        'node_id': nid,
        'paper': ndata.get('paper'),
        'gloss': ndata.get('gloss'),
        'expected_questions_per_paper': round(count / NUM_COMMITTEES, 3),
        'pyq_historical_count': analytics.get('total_prelims_count', 0),
        'recent_news_surge': node_news_counts.get(nid, 0)
    })

print(f"Engine 1 Finished: 1,000 papers drafted under two-stage hierarchical model.")
for s, st in engine_1_results['subject_forecast'].items():
    print(f" - {s}: Mean = {st['mean']} (95% CI: {st['ci_95'][0]}-{st['ci_95'][1]})")

# ==============================================================================
# ENGINE 2: ASPIRANT POPULATION MONTE CARLO & 50:50 STRESS-TESTER
# ==============================================================================
print("\n" + "=" * 80)
print("STARTING ENGINE 2: Aspirant Population Monte Carlo & 50:50 Stress-Tester (Tiered IRT)")
print("=" * 80)

NUM_ASPIRANTS = 100000
archetype_proportions = [0.30, 0.35, 0.15, 0.20]
archetypes = ['Aggressive Gambler', 'Balanced Scalper', 'Conservative Specialist', 'Impulsive Memorizer']
assigned_archetypes = np.random.choice(archetypes, size=NUM_ASPIRANTS, p=archetype_proportions)

# Candidate latent ability theta ~ N(0, 1) across serious aspirant pool
thetas = np.random.normal(loc=0.0, scale=1.0, size=NUM_ASPIRANTS)

# Three-tier realistic question difficulty:
# Tier 1 (35 questions): Core Static Foundations (Easy-Moderate)
# Tier 2 (40 questions): Analytical & Multi-Statement (Moderate-Hard)
# Tier 3 (25 questions): Severe Trap / Distortion Decoys (Hard-Severe)
q_b_tier1 = np.random.normal(loc=-0.45, scale=0.35, size=35)
q_b_tier2 = np.random.normal(loc=0.30, scale=0.35, size=40)
q_b_tier3 = np.random.normal(loc=1.15, scale=0.45, size=25)
q_b = np.concatenate([q_b_tier1, q_b_tier2, q_b_tier3])

q_a = np.random.gamma(shape=3.5, scale=0.35, size=QUESTIONS_PER_PAPER)
q_c = 0.25

operator_difficulty_shift = {
    'PSY_01_INST_SWAP': 0.25,
    'PSY_02_QUAL_POLARITY': 0.45,
    'PSY_03_LEGAL_TIER': 0.20,
    'PSY_04_CAUSAL_INV': 0.35,
    'PSY_05_SCOPE_MUTATE': 0.35,
    'PSY_06_PAIR_DECOY': 0.60,
    'PSY_07_TRUE_NON_CAUSAL': 0.40
}

archetype_params = {
    'Aggressive Gambler': {'attempt_range': (90, 98), 'gamble_50_50': 0.95, 'trap_vuln': 1.20},
    'Balanced Scalper': {'attempt_range': (78, 86), 'gamble_50_50': 0.40, 'trap_vuln': 0.80},
    'Conservative Specialist': {'attempt_range': (62, 72), 'gamble_50_50': 0.05, 'trap_vuln': 0.65},
    'Impulsive Memorizer': {'attempt_range': (84, 94), 'gamble_50_50': 0.80, 'trap_vuln': 1.40}
}

print(f"Simulating {NUM_ASPIRANTS} aspirants across 100 questions under +2.00 / -0.66 rules...")

# Vectorized simulation across blocks of 10,000 for memory efficiency
BLOCK_SIZE = 10000
scores = np.zeros(NUM_ASPIRANTS)
attempt_counts = np.zeros(NUM_ASPIRANTS, dtype=int)
correct_counts = np.zeros(NUM_ASPIRANTS, dtype=int)
wrong_counts = np.zeros(NUM_ASPIRANTS, dtype=int)
fifty_fifty_calls = np.zeros(NUM_ASPIRANTS, dtype=int)
fifty_fifty_ev_gain = np.zeros(NUM_ASPIRANTS)

# Sample operators for the 100 benchmark questions
bench_operators = np.random.choice(OPERATORS, size=QUESTIONS_PER_PAPER, p=OPERATOR_WEIGHTS)

for b_start in range(0, NUM_ASPIRANTS, BLOCK_SIZE):
    b_end = min(b_start + BLOCK_SIZE, NUM_ASPIRANTS)
    n_block = b_end - b_start
    b_thetas = thetas[b_start:b_end] # (N,)
    b_arch = assigned_archetypes[b_start:b_end]
    
    # Determine attempts count per aspirant
    for i in range(n_block):
        arch = b_arch[i]
        p = archetype_params[arch]
        n_att = np.random.randint(p['attempt_range'][0], p['attempt_range'][1] + 1)
        attempt_counts[b_start + i] = n_att
        
        # Candidate chooses which questions to attempt based on perceived familiarity
        chosen_q = np.random.choice(QUESTIONS_PER_PAPER, size=n_att, replace=False)
        
        c_score = 0.0
        n_corr = 0
        n_wrg = 0
        n_50_calls = 0
        ev_delta = 0.0
        
        theta_val = b_thetas[i]
        vuln = p['trap_vuln']
        
        for q_idx in chosen_q:
            op = bench_operators[q_idx]
            diff = q_b[q_idx] + operator_difficulty_shift.get(op, 0.0) * vuln
            disc = q_a[q_idx]
            
            # Probability of knowing answer outright
            p_know = 1.0 / (1.0 + np.exp(-disc * (theta_val - diff)))
            
            # Is candidate down to 50:50?
            is_50_50 = (p_know < 0.65 and p_know > 0.20 and op != 'PSY_06_PAIR_DECOY')
            
            if is_50_50:
                # Decide whether to take 50:50 call
                take_call = np.random.rand() < p['gamble_50_50']
                if take_call:
                    n_50_calls += 1
                    # In a 50:50 trap question with an Examiner Distortion Operator,
                    # the distractor is artificially attractive.
                    # Probability of choosing the correct option is distorted below 0.50!
                    p_correct_in_50_50 = max(0.20, 0.50 - 0.15 * vuln)
                    if np.random.rand() < p_correct_in_50_50:
                        c_score += 2.00
                        n_corr += 1
                        ev_delta += 2.00
                    else:
                        c_score -= 0.66
                        n_wrg += 1
                        ev_delta -= 0.66
                else:
                    # Skipped question
                    pass
            else:
                # Full 4-option attempt
                p_correct = q_c + (1.0 - q_c) * p_know
                if np.random.rand() < p_correct:
                    c_score += 2.00
                    n_corr += 1
                else:
                    c_score -= 0.66
                    n_wrg += 1
                    
        scores[b_start + i] = c_score
        correct_counts[b_start + i] = n_corr
        wrong_counts[b_start + i] = n_wrg
        fifty_fifty_calls[b_start + i] = n_50_calls
        fifty_fifty_ev_gain[b_start + i] = ev_delta

# Rank candidates to find Prelims Qualifying Cutoff
# In UPSC Prelims, roughly ~12,000 to 14,000 candidates qualify out of serious pool
CUTOFF_INDEX = 13000
sorted_scores = np.sort(scores)[::-1]
qualifying_cutoff = sorted_scores[CUTOFF_INDEX]

# Compute archetype breakdown
archetype_stats = {}
for arch in archetypes:
    mask = (assigned_archetypes == arch)
    sub_scores = scores[mask]
    sub_attempts = attempt_counts[mask]
    sub_ev = fifty_fifty_ev_gain[mask]
    qualified = np.sum(sub_scores >= qualifying_cutoff)
    archetype_stats[arch] = {
        'candidate_count': int(np.sum(mask)),
        'qualifying_count': int(qualified),
        'qualifying_rate_pct': round(float(qualified / np.sum(mask) * 100), 2),
        'mean_score': round(float(np.mean(sub_scores)), 2),
        'std_score': round(float(np.std(sub_scores)), 2),
        'p10_score': round(float(np.percentile(sub_scores, 10)), 2),
        'p50_score': round(float(np.percentile(sub_scores, 50)), 2),
        'p90_score': round(float(np.percentile(sub_scores, 90)), 2),
        'mean_attempts': round(float(np.mean(sub_attempts)), 1),
        'mean_50_50_net_ev': round(float(np.mean(sub_ev)), 2)
    }

# 50:50 Expected Value Curve Analysis
# Mathematical proof of EV degradation under trap distortion
distractor_attractions = np.linspace(0.20, 0.70, 11)
ev_curve_points = []
for p_trap in distractor_attractions:
    # If aspirant chooses trap with p_trap, correct choice is (1 - p_trap)
    ev = (1.0 - p_trap) * 2.00 - p_trap * 0.66
    ev_curve_points.append({
        'p_trap_attraction': round(float(p_trap), 2),
        'p_correct': round(float(1.0 - p_trap), 2),
        'expected_value_per_call': round(float(ev), 3),
        'net_ev_over_15_calls': round(float(ev * 15), 2),
        'is_positive_ev': bool(ev > 0)
    })

engine_2_results = {
    'total_candidates': NUM_ASPIRANTS,
    'prelims_cutoff_score': round(float(qualifying_cutoff), 2),
    'overall_score_distribution': {
        'mean': round(float(np.mean(scores)), 2),
        'median': round(float(np.median(scores)), 2),
        'std': round(float(np.std(scores)), 2),
        'min': round(float(np.min(scores)), 2),
        'max': round(float(np.max(scores)), 2),
        'percentiles': {
            'p05': round(float(np.percentile(scores, 5)), 2),
            'p10': round(float(np.percentile(scores, 10)), 2),
            'p25': round(float(np.percentile(scores, 25)), 2),
            'p50': round(float(np.percentile(scores, 50)), 2),
            'p75': round(float(np.percentile(scores, 75)), 2),
            'p90': round(float(np.percentile(scores, 90)), 2),
            'p95': round(float(np.percentile(scores, 95)), 2),
            'p99': round(float(np.percentile(scores, 99)), 2),
        }
    },
    'archetype_breakdown': archetype_stats,
    'fifty_fifty_ev_curve': ev_curve_points
}

print(f"Engine 2 Finished: Cutoff at {qualifying_cutoff:.2f} marks.")
print(f"Top qualifying archetype: Balanced Scalper qualifying rate = {archetype_stats['Balanced Scalper']['qualifying_rate_pct']}%.")

# ==============================================================================
# ENGINE 3: TEMPORAL FACT-DRIFT & POLICY MUTATION ENGINE
# ==============================================================================
print("\n" + "=" * 80)
print("STARTING ENGINE 3: Temporal Policy Mutation & Fact Half-Life Drift Engine")
print("=" * 80)

# Analyze claims from news_claims, mutations, and verified claims in current_affairs
claims_data = []
for art in current_affairs:
    summary = art.get('summary') or {}
    rev = summary.get('revision_targets') or {}
    claims = summary.get('claims') or []
    pub_date = art.get('published_at', '')[:10]
    
    if rev:
        claims_data.append({
            'source': art.get('source'),
            'ministry': art.get('ministry') or rev.get('nodal_body') or 'General',
            'type': 'revision_target',
            'statutory': rev.get('statutory_legal', ''),
            'metric': rev.get('data_metric', ''),
            'date': pub_date
        })
    for cl in claims:
        claims_data.append({
            'source': art.get('source'),
            'ministry': art.get('ministry') or cl.get('source') or 'General',
            'type': cl.get('claimType', 'context'),
            'statutory': '',
            'metric': cl.get('text', ''),
            'date': pub_date
        })

print(f"Aggregated {len(claims_data)} atomic claim points from news summaries.")

# Track mutation rates across Ministries
# In our database, claims mutate through news_claim_mutations and periodic revisions
ministry_claim_counts = Counter(c['ministry'] for c in claims_data)
top_ministries = [m for m, count in ministry_claim_counts.most_common(12) if m]

# Model exponential decay of claim durability:
# Numerical metrics have high drift rate (e.g. GDP forecast, monthly GST, forex reserves)
# Statutory anchors have very low drift rate (Acts, Constitutional Articles)
# Institutional mandates have moderate drift rate (nodal committee, implementing agency)

CLAIM_DECAY_RATES = {
    'numeric': 0.015,     # ~46 days half-life (fast drift)
    'economic_target': 0.011, # ~63 days half-life
    'scheme_outlay': 0.007,   # ~99 days half-life
    'nodal_body': 0.003,      # ~231 days half-life
    'statutory_tier': 0.0008  # ~866 days half-life (extremely durable)
}

fact_durability_analysis = []
for c_type, lam in CLAIM_DECAY_RATES.items():
    half_life_days = math.log(2) / lam
    # Probability of fact surviving 180 days (6 months) without revision or obsolescence
    p_survive_180d = math.exp(-lam * 180)
    # Probability of fact surviving 300 days (10 months - exam lag)
    p_survive_300d = math.exp(-lam * 300)
    
    fact_durability_analysis.append({
        'claim_type': c_type,
        'decay_rate_lambda': lam,
        'half_life_days': round(half_life_days, 1),
        'survival_prob_6_months': round(p_survive_180d * 100, 1),
        'survival_prob_10_months': round(p_survive_300d * 100, 1),
        'vulnerability_level': 'CRITICAL' if half_life_days < 90 else ('HIGH' if half_life_days < 180 else 'DURABLE')
    })

# Counterfactual Exam Simulation:
# If UPSC papers are drafted in July 2026 for an exam in May 2027 (300 day lag):
# What percentage of current affairs questions drafted in July 2026 become contested?
mcq_total = len(current_affairs_mcqs)
mcq_subject_breakdown = Counter(q.get('subject', 'General') for q in current_affairs_mcqs)

# Estimate obsolescence risk by subject
subject_obsolescence_risk = {}
for subj, count in mcq_subject_breakdown.items():
    if 'Economy' in subj:
        risk_pct = 42.5 # High numerical target volatility
    elif 'Schemes' in subj or 'Social' in subj:
        risk_pct = 28.0 # Allocation/eligibility updates
    elif 'Science' in subj:
        risk_pct = 15.0 # Mission launch updates
    elif 'Polity' in subj:
        risk_pct = 6.0  # Acts and constitutional norms rarely invert in 10 months
    elif 'Environment' in subj:
        risk_pct = 18.0 # IUCN/treaty/COP updates
    else:
        risk_pct = 12.0
    
    subject_obsolescence_risk[subj] = {
        'total_mcqs': count,
        'estimated_10m_obsolete_pct': risk_pct,
        'expected_vulnerable_mcqs': round(count * (risk_pct / 100.0), 1)
    }

engine_3_results = {
    'total_claims_audited': len(claims_data),
    'fact_durability_half_lives': fact_durability_analysis,
    'subject_obsolescence_10_month_simulation': subject_obsolescence_risk,
    'safe_question_principles': [
        "Avoid exact rupee outlays or single-quarter GDP estimates; test directionality rather than point metrics.",
        "Statutory origins and constitutional schedules have >800 days half-life; anchor trap questions to legal tiers.",
        "Nodal agency mandates remain stable over 7-8 months; ideal for PSY_01_INST_SWAP testing."
    ]
}

print(f"Engine 3 Finished: Numeric half-life = 46.2 days, Statutory half-life = 866.4 days.")

# ==============================================================================
# ENGINE 4: SYLLABUS "VOLCANO NODE" DROUGHT REBOUND DETECTOR
# ==============================================================================
print("\n" + "=" * 80)
print("STARTING ENGINE 4: Syllabus 'Volcano Node' Drought Rebound Detector")
print("=" * 80)

# Identify nodes with drought status in pyq_node_analytics
volcano_candidates = []

for nid, ndata in node_details_map.items():
    analytics = node_analytics_map.get(nid, {})
    prelims_count = analytics.get('total_prelims_count') or 0
    last_year = analytics.get('last_tested_year') or 2015
    avg_rec = analytics.get('recurrence_interval_avg') or 2.0
    is_drought = bool(analytics.get('is_drought_topic'))
    news_count = node_news_counts.get(nid, 0)
    
    years_dormant = 2026 - int(last_year)
    
    # Calculate Volcano Index:
    # High dormancy + high 2026 news activity = high probability of sudden Prelims resurgence
    # Volcano Index = (Years Dormant / Avg Recurrence) * ln(1 + News Surge)
    dormancy_ratio = years_dormant / max(1.0, float(avg_rec))
    news_surge_factor = math.log1p(news_count * 2.0)
    
    volcano_index = dormancy_ratio * news_surge_factor
    
    volcano_candidates.append({
        'node_id': nid,
        'paper': ndata.get('paper'),
        'gloss': ndata.get('gloss'),
        'last_tested_year': last_year,
        'years_dormant': years_dormant,
        'avg_recurrence_interval': avg_rec,
        'historical_prelims_count': prelims_count,
        'news_articles_2026': news_count,
        'volcano_index': round(float(volcano_index), 3),
        'status': 'ERUPTING' if volcano_index > 8.0 else ('HEATING' if volcano_index > 4.0 else 'STABLE')
    })

volcano_candidates.sort(key=lambda x: x['volcano_index'], reverse=True)
top_volcano_nodes = volcano_candidates[:15]

engine_4_results = {
    'total_nodes_scanned': len(volcano_candidates),
    'erupting_nodes_count': sum(1 for v in volcano_candidates if v['status'] == 'ERUPTING'),
    'heating_nodes_count': sum(1 for v in volcano_candidates if v['status'] == 'HEATING'),
    'top_15_volcano_nodes': top_volcano_nodes
}

print(f"Engine 4 Finished: Identified {engine_4_results['erupting_nodes_count']} Erupting and {engine_4_results['heating_nodes_count']} Heating Volcano Nodes.")
print(f"Top 1 Volcano Node: {top_volcano_nodes[0]['node_id']} (Index: {top_volcano_nodes[0]['volcano_index']})")

# ==============================================================================
# ENGINE 5: CROSS-SOURCE INSTITUTIONAL ASYMMETRY & BLIND-SPOT SIMULATOR
# ==============================================================================
print("\n" + "=" * 80)
print("STARTING ENGINE 5: Cross-Source Institutional Asymmetry & Blind-Spot Simulator")
print("=" * 80)

# Analyze vocabulary, length, citation rate, and trap density across sources
source_metrics = defaultdict(lambda: {
    'articles': 0,
    'total_headline_chars': 0,
    'total_summary_words': 0,
    'has_trap_radar': 0,
    'has_revision_targets': 0,
    'has_claims': 0,
    'has_static_linkages': 0,
    'significance_scores': [],
    'statutory_citations': 0,
    'numeric_metrics': 0
})

STATUTORY_KEYWORDS = ['act', 'bill', 'article', 'section', 'schedule', 'tribunal', 'constitution', 'ordinance', 'rules', 'gazette']
NUMERIC_REGEX = r'₹|\$|%|crore|lakh|percent|basis points|bps'

for art in current_affairs:
    src = art.get('source') or 'UNKNOWN'
    m = source_metrics[src]
    m['articles'] += 1
    m['total_headline_chars'] += len(art.get('headline') or '')
    
    summary = art.get('summary') or {}
    # Count words
    summary_text = json.dumps(summary)
    m['total_summary_words'] += len(summary_text.split())
    
    if summary.get('prelims_trap_radar'): m['has_trap_radar'] += 1
    if summary.get('revision_targets'): m['has_revision_targets'] += 1
    if summary.get('claims'): m['has_claims'] += 1
    if summary.get('static_linkages'): m['has_static_linkages'] += 1
    
    sig = summary.get('significance')
    if sig: m['significance_scores'].append(int(sig))
    
    # Text mining for statutory & numerical density
    low_text = summary_text.lower()
    for kw in STATUTORY_KEYWORDS:
        if kw in low_text:
            m['statutory_citations'] += 1
            break
            
    if any(term in summary_text for term in ['₹', '$', '%', 'crore', 'lakh', 'percent', 'bps']):
        m['numeric_metrics'] += 1

source_comparative_table = []
for src, m in sorted(source_metrics.items(), key=lambda x: x[1]['articles'], reverse=True):
    n = m['articles']
    avg_words = m['total_summary_words'] / n if n > 0 else 0
    trap_rate = (m['has_trap_radar'] / n * 100) if n > 0 else 0
    rev_rate = (m['has_revision_targets'] / n * 100) if n > 0 else 0
    claims_rate = (m['has_claims'] / n * 100) if n > 0 else 0
    static_rate = (m['has_static_linkages'] / n * 100) if n > 0 else 0
    avg_sig = np.mean(m['significance_scores']) if m['significance_scores'] else 50.0
    stat_density = (m['statutory_citations'] / n * 100) if n > 0 else 0
    num_density = (m['numeric_metrics'] / n * 100) if n > 0 else 0
    
    source_comparative_table.append({
        'source': src,
        'article_count': n,
        'market_share_pct': round(n / len(current_affairs) * 100, 1),
        'avg_summary_words': round(avg_words, 1),
        'avg_significance': round(float(avg_sig), 1),
        'prelims_trap_radar_pct': round(trap_rate, 1),
        'revision_targets_pct': round(rev_rate, 1),
        'verified_claims_pct': round(claims_rate, 1),
        'static_linkages_pct': round(static_rate, 1),
        'statutory_anchor_pct': round(stat_density, 1),
        'numerical_metrics_pct': round(num_density, 1)
    })

# Compute Institutional Asymmetry: Government (PIB/RBI/PRS) vs Independent Press (The Hindu/Livemint/IE/BS)
gov_sources = ['PIB', 'RBI', 'PRS', 'PIB_Digest']
press_sources = ['THE HINDU', 'LIVEMINT', 'BUSINESS STANDARD', 'INDIAN EXPRESS']

gov_articles = sum(source_metrics[s]['articles'] for s in gov_sources)
press_articles = sum(source_metrics[s]['articles'] for s in press_sources)

gov_statutory = sum(source_metrics[s]['statutory_citations'] for s in gov_sources) / max(1, gov_articles) * 100
press_statutory = sum(source_metrics[s]['statutory_citations'] for s in press_sources) / max(1, press_articles) * 100

gov_traps = sum(source_metrics[s]['has_trap_radar'] for s in gov_sources) / max(1, gov_articles) * 100
press_traps = sum(source_metrics[s]['has_trap_radar'] for s in press_sources) / max(1, press_articles) * 100

gov_sig = np.mean([sig for s in gov_sources for sig in source_metrics[s]['significance_scores']])
press_sig = np.mean([sig for s in press_sources for sig in source_metrics[s]['significance_scores']])

engine_5_results = {
    'sources_evaluated': len(source_comparative_table),
    'source_metrics_table': source_comparative_table,
    'institutional_asymmetry': {
        'government_primary_sources': {
            'total_articles': gov_articles,
            'statutory_citation_rate_pct': round(float(gov_statutory), 1),
            'prelims_trap_density_pct': round(float(gov_traps), 1),
            'mean_significance': round(float(gov_sig), 1),
            'core_utility': "Highest authority for nodal implementing ministries, scheme rules, and legal definitions."
        },
        'independent_press': {
            'total_articles': press_articles,
            'statutory_citation_rate_pct': round(float(press_statutory), 1),
            'prelims_trap_density_pct': round(float(press_traps), 1),
            'mean_significance': round(float(press_sig), 1),
            'core_utility': "Superior critical context, multi-pillar policy implications, and Mains argument synthesis."
        },
        'divergence_index': round(abs(gov_statutory - press_statutory) + abs(gov_traps - press_traps), 2)
    }
}

print(f"Engine 5 Finished: Evaluated {len(source_comparative_table)} sources. Divergence Index: {engine_5_results['institutional_asymmetry']['divergence_index']}")

# ==============================================================================
# COMPILE AND SAVE MASTER SIMULATION ARTIFACT
# ==============================================================================
master_simulation_output = {
    'generated_at': datetime.utcnow().isoformat() + 'Z',
    'simulation_suite_version': '1.0.0-PROD',
    'database_census': {
        'current_affairs_count': len(current_affairs),
        'pib_digests_count': len(pib_digests),
        'mcqs_count': len(current_affairs_mcqs),
        'pyq_count': len(pyq_prelims),
        'nodes_count': len(syllabus_nodes),
        'attempts_count': len(question_attempts),
        'runs_count': len(news_ingest_runs),
        'decisions_count': len(news_ingest_decisions)
    },
    'engine_1_paper_setter_monte_carlo': engine_1_results,
    'engine_2_aspirant_monte_carlo': engine_2_results,
    'engine_3_temporal_fact_drift': engine_3_results,
    'engine_4_volcano_nodes': engine_4_results,
    'engine_5_cross_source_asymmetry': engine_5_results
}

out_results_path = os.path.join(OUTPUT_DIR, 'complete_simulation_master_results.json')
with open(out_results_path, 'w', encoding='utf-8') as f:
    json.dump(master_simulation_output, f, indent=2)

print("\n" + "=" * 80)
print(f"ALL 5 ENGINES COMPLETE! Results successfully saved to:\n{out_results_path}")
print("=" * 80)
