import json
import re
import os
import math
from collections import Counter, defaultdict
from datetime import datetime

SNAPSHOT_PATH = os.path.join(os.path.dirname(__file__), 'data', 'news_corpus_snapshot.json')
OUTPUT_METRICS_PATH = os.path.join(os.path.dirname(__file__), 'data', 'phd_analytics_results.json')

with open(SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
    corpus = json.load(f)

pib_digests = corpus.get('pib_digests', [])
ca_mcqs = corpus.get('current_affairs', [])

print(f"Loaded {len(pib_digests)} PIB digests and {len(ca_mcqs)} Current Affairs MCQs.")

# ==============================================================================
# 1. CORPUS CENSUS & CHRONOMETRY
# ==============================================================================
total_pib_chars = sum(len(d.get('content', '') or '') for d in pib_digests)
total_pib_words = sum(len((d.get('content', '') or '').split()) for d in pib_digests)

total_ca_chars = sum(len((q.get('question', '') or '') + (q.get('explanation', '') or '') + (q.get('headline', '') or '')) for q in ca_mcqs)
total_ca_words = sum(len(((q.get('question', '') or '') + ' ' + (q.get('explanation', '') or '') + ' ' + (q.get('headline', '') or '')).split()) for q in ca_mcqs)

pib_dates = [d.get('date') for d in pib_digests if d.get('date')]
ca_dates = [q.get('edition_date') or q.get('created_at')[:10] for q in ca_mcqs if q.get('edition_date') or q.get('created_at')]

# Weekly binning
def get_iso_week(date_str):
    try:
        dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
        return f"{dt.year}-W{dt.isocalendar()[1]:02d}"
    except:
        return 'Unknown'

weekly_dist = defaultdict(lambda: {'pib_count': 0, 'pib_words': 0, 'ca_count': 0, 'ca_words': 0})

for d in pib_digests:
    w = get_iso_week(d.get('date', ''))
    words = len((d.get('content', '') or '').split())
    weekly_dist[w]['pib_count'] += 1
    weekly_dist[w]['pib_words'] += words

for q in ca_mcqs:
    d_str = q.get('edition_date') or q.get('created_at')[:10]
    w = get_iso_week(d_str)
    words = len(((q.get('question', '') or '') + ' ' + (q.get('explanation', '') or '')).split())
    weekly_dist[w]['ca_count'] += 1
    weekly_dist[w]['ca_words'] += words

census_data = {
    "total_documents": len(pib_digests) + len(ca_mcqs),
    "pib_digests_count": len(pib_digests),
    "ca_mcqs_count": len(ca_mcqs),
    "total_character_volume": total_pib_chars + total_ca_chars,
    "total_word_volume": total_pib_words + total_ca_words,
    "pib_word_volume": total_pib_words,
    "ca_word_volume": total_ca_words,
    "avg_words_per_pib": round(total_pib_words / max(1, len(pib_digests)), 1),
    "avg_words_per_ca": round(total_ca_words / max(1, len(ca_mcqs)), 1),
    "temporal_span": {
        "pib_earliest": min(pib_dates) if pib_dates else None,
        "pib_latest": max(pib_dates) if pib_dates else None,
        "ca_earliest": min(ca_dates) if ca_dates else None,
        "ca_latest": max(ca_dates) if ca_dates else None,
    },
    "weekly_distribution": dict(sorted(weekly_dist.items()))
}

# ==============================================================================
# 2. INSTITUTIONAL & MINISTERIAL POWER GRAPH
# ==============================================================================
MINISTRIES = {
    "Ministry of Finance": [r"Ministry of Finance", r"MoF\b", r"Finance Ministry", r"Department of Economic Affairs", r"Department of Revenue", r"CBDT", r"CBIC", r"Chief Economic Advisor"],
    "Ministry of Commerce & Industry": [r"Ministry of Commerce", r"Commerce Ministry", r"DPIIT", r"DGFT", r"Directorate General of Foreign Trade"],
    "Ministry of External Affairs": [r"Ministry of External Affairs", r"MEA\b", r"Foreign Ministry", r"External Affairs Ministry", r"Diplomatic Mission"],
    "Ministry of Agriculture & Farmers Welfare": [r"Ministry of Agriculture", r"Agriculture Ministry", r"MoA&FW", r"ICAR", r"Department of Agriculture"],
    "Ministry of Rural Development": [r"Ministry of Rural Development", r"MoRD\b", r"Gram Sabha", r"Panchayati Raj", r"MGNREGA", r"NRLM"],
    "Ministry of Environment, Forest & Climate Change": [r"Ministry of Environment", r"MoEFCC", r"Forest & Climate Change", r"Pollution Control Board", r"CPCB"],
    "Ministry of Electronics & Information Technology": [r"Ministry of Electronics", r"MeitY", r"Information Technology Ministry", r"Digital India"],
    "Ministry of Science & Technology": [r"Ministry of Science & Technology", r"Department of Science & Technology", r"DST\b", r"DBT\b", r"CSIR"],
    "Ministry of Defence": [r"Ministry of Defence", r"MoD\b", r"Defence Ministry", r"Armed Forces", r"NCC\b", r"DRDO"],
    "Ministry of Home Affairs": [r"Ministry of Home Affairs", r"MHA\b", r"Home Ministry", r"Internal Security", r"Paramilitary"],
    "Ministry of Power & Renewable Energy": [r"Ministry of Power", r"MNRE\b", r"Renewable Energy Ministry", r"Solar Energy", r"Grid"],
    "Ministry of Health & Family Welfare": [r"Ministry of Health", r"MoHFW", r"Health Ministry", r"ICMR", r"National Health Authority"],
    "Ministry of Education": [r"Ministry of Education", r"MoE\b", r"School Education", r"Higher Education", r"NCERT", r"UGC"],
    "Ministry of Law & Justice": [r"Ministry of Law", r"Law Ministry", r"Department of Legal Affairs", r"Legislative Department"]
}

REGULATORY_CONSTITUTIONAL_BODIES = {
    "Reserve Bank of India (RBI)": [r"Reserve Bank of India", r"RBI\b", r"Monetary Policy Committee", r"MPC\b", r"Central Bank Digital Currency", r"CBDC"],
    "Directorate of Revenue Intelligence (DRI)": [r"Directorate of Revenue Intelligence", r"DRI\b", r"Customs Enforcement", r"SAFTA Misuse"],
    "Food and Drug Administration (FDA)": [r"Food and Drug Administration", r"FDA\b", r"Food Safety and Standards", r"FSSAI"],
    "Election Commission of India (ECI)": [r"Election Commission of India", r"ECI\b", r"Chief Election Commissioner", r"Model Code of Conduct", r"Nomination Rejection"],
    "Finance Commission": [r"Finance Commission", r"State Finance Commission", r"SFC\b", r"16th Finance Commission"],
    "ISRO / Space Commission": [r"ISRO\b", r"Space Vision 2047", r"Department of Space", r"Antrix", r"IN-SPACe", r"NSIL"],
    "NITI Aayog": [r"NITI Aayog", r"National Institution for Transforming India", r"Atal Innovation Mission"],
    "Judiciary (Supreme Court & High Courts)": [r"Supreme Court", r"High Court", r"Bombay HC", r"Chief Justice", r"Judicial Review", r"Quo Warranto", r"Mandamus", r"Habeas Corpus", r"Certiorari"]
}

def analyze_entities(corpus_items, text_extractor):
    entity_counts = Counter()
    entity_chars = defaultdict(int)
    co_occurrence = defaultdict(Counter)

    for item in corpus_items:
        text = text_extractor(item)
        found_in_item = set()

        # Check ministries
        for min_name, patterns in MINISTRIES.items():
            for pat in patterns:
                if re.search(pat, text, re.IGNORECASE):
                    entity_counts[min_name] += len(re.findall(pat, text, re.IGNORECASE))
                    found_in_item.add(min_name)
                    break

        # Check regulators
        for body_name, patterns in REGULATORY_CONSTITUTIONAL_BODIES.items():
            for pat in patterns:
                if re.search(pat, text, re.IGNORECASE):
                    entity_counts[body_name] += len(re.findall(pat, text, re.IGNORECASE))
                    found_in_item.add(body_name)
                    break

        for ent in found_in_item:
            entity_chars[ent] += len(text)
            for other in found_in_item:
                if ent != other:
                    co_occurrence[ent][other] += 1

    return entity_counts, entity_chars, co_occurrence

pib_entity_counts, pib_entity_chars, pib_co_occ = analyze_entities(pib_digests, lambda d: d.get('title', '') + '\n' + (d.get('content', '') or ''))
ca_entity_counts, ca_entity_chars, ca_co_occ = analyze_entities(ca_mcqs, lambda q: (q.get('headline', '') or '') + '\n' + (q.get('question', '') or '') + '\n' + (q.get('explanation', '') or ''))

# Combined institutional rankings
combined_institutions = Counter()
for k, v in pib_entity_counts.items():
    combined_institutions[k] += v
for k, v in ca_entity_counts.items():
    combined_institutions[k] += v

# ==============================================================================
# 3. GEOPOLITICAL VECTORS & DIPLOMATIC ALIGNMENT
# ==============================================================================
GEOPOLITICAL_ENTITIES = {
    "Australia": [r"Australia\b", r"Canberra\b", r"India-Australia", r"Comprehensive Strategic Partnership", r"ECTA\b"],
    "ASEAN": [r"ASEAN\b", r"Association of Southeast Asian Nations", r"AITIGA\b", r"Jakarta\b"],
    "BRICS": [r"BRICS\b", r"BRICS Science Academies", r"New Development Bank"],
    "SACU (Southern African Customs Union)": [r"SACU\b", r"Southern African Customs Union", r"India-SACU", r"PTA\b"],
    "SAARC / SAFTA": [r"SAFTA\b", r"South Asian Free Trade Area", r"SAARC\b"],
    "United States / Quad": [r"United States\b", r"USA\b", r"Washington\b", r"Quad\b", r"Indo-Pacific"],
    "China": [r"China\b", r"Beijing\b", r"Sino-Indian", r"LAC\b"],
    "European Union / UK": [r"European Union", r"EU\b", r"Brussels", r"FTA with UK", r"EFTA\b"],
    "Japan": [r"Japan\b", r"Tokyo\b", r"India-Japan"],
    "Africa / Global South": [r"African Union", r"Global South", r"India-Africa"]
}

def analyze_geopolitics(all_texts):
    geo_counts = Counter()
    geo_domains = defaultdict(Counter)

    domain_keywords = {
        "Trade & Free Trade Agreements": [r"trade", r"FTA", r"PTA", r"tariff", r"customs", r"export", r"import", r"economic partnership", r"CECA", r"ECTA"],
        "Defense & Maritime Security": [r"defense", r"defence", r"maritime", r"naval", r"joint exercise", r"security", r"Indo-Pacific"],
        "Critical Minerals & Clean Energy": [r"critical minerals", r"lithium", r"rare earth", r"clean energy", r"solar", r"climate"],
        "Science, Space & Technology": [r"space", r"science", r"technology", r"AI\b", r"digital", r"R&D", r"academies forum"],
        "Diplomatic & Multilateral Summits": [r"summit", r"bilateral", r"dialogue", r"delegation", r"consulate", r"treaty"]
    }

    for text in all_texts:
        for geo, patterns in GEOPOLITICAL_ENTITIES.items():
            matched = False
            for pat in patterns:
                if re.search(pat, text, re.IGNORECASE):
                    geo_counts[geo] += len(re.findall(pat, text, re.IGNORECASE))
                    matched = True
            if matched:
                for dom, d_pats in domain_keywords.items():
                    for dp in d_pats:
                        if re.search(dp, text, re.IGNORECASE):
                            geo_domains[geo][dom] += 1
                            break

    return geo_counts, geo_domains

all_corpus_texts = [d.get('title', '') + '\n' + (d.get('content', '') or '') for d in pib_digests] + \
                   [(q.get('headline', '') or '') + '\n' + (q.get('question', '') or '') + '\n' + (q.get('explanation', '') or '') for q in ca_mcqs]

geo_counts, geo_domains = analyze_geopolitics(all_corpus_texts)

# ==============================================================================
# 4. JUDICIAL-EXECUTIVE FRICTION & REGULATORY AUDITS
# ==============================================================================
LEGAL_CASES_AND_DISPUTES = []

for idx, d in enumerate(pib_digests):
    content = d.get('content', '') or ''
    # Look for judicial rulings, legal cases, and regulatory crackdowns
    if "Court" in content or "Case" in content or "Dispute" in content or "Nomination" in content or "SAFTA" in content or "DRI" in content or "PTA" in content:
        lines = content.split('\n')
        case_block = []
        for line in lines:
            if any(term in line.lower() for term in ['case name', 'vs.', 'v.', 'high court', 'supreme court', 'writ', 'tribunal', 'crackdown', 'misuse', 'violation', 'disqualification', 'nomination']):
                case_block.append(line.strip())
        if case_block:
            LEGAL_CASES_AND_DISPUTES.append({
                "source_type": "pib_digest",
                "date": d.get('date'),
                "title": d.get('title'),
                "case_evidence": case_block[:5]
            })

for q in ca_mcqs:
    headline = q.get('headline', '') or ''
    expl = q.get('explanation', '') or ''
    combined = headline + ' ' + expl
    if any(k in combined.lower() for k in ['court', 'hc ', 'sc ', 'tribunal', 'judgment', 'bench', 'order', 'fine', 'cost', 'quashed', 'unconstitutional', 'stayed']):
        LEGAL_CASES_AND_DISPUTES.append({
            "source_type": "current_affairs_mcq",
            "date": q.get('edition_date') or q.get('created_at')[:10],
            "headline": headline,
            "subject": q.get('subject'),
            "summary": expl[:250] + '...'
        })

# ==============================================================================
# 5. PSYCHOLINGUISTIC RHETORIC VS. SUBSTANCE METRICS (RDS & SAR)
# ==============================================================================
RHETORIC_TERMS = [
    r"holistic", r"transformative", r"catalytic", r"seamless", r"sustainable",
    r"paradigm shift", r"vision 2047", r"visionary", r"robust", r"empowerment",
    r"unprecedented", r"pioneering", r"ecosystem", r"synergy", r"vibrant",
    r"unwavering", r"epochal", r"cornerstone", r"leapfrog", r"dynamic",
    r"inclusivity", r"resilient", r"strategic roadmap", r"nexus", r"harnessing"
]

SUBSTANCE_PATTERNS = {
    "currency_amount": r"(?:₹|Rs\.?|INR|USD|\$)\s*\d+(?:\.\d+)?\s*(?:crore|lakh|thousand|billion|million|trillion)?",
    "percentage_metric": r"\d+(?:\.\d+)?%",
    "statutory_reference": r"(?:Section|Article|Clause|Schedule|Act)\s+\d+[A-Za-z]?(?:\s*\(\d+\))?",
    "timeline_target_year": r"\b(?:202[6-9]|203\d|204\d|2050)\b",
    "physical_quant_metric": r"\d+(?:\.\d+)?\s*(?:km|MW|GW|tonnes|MT|hectares|districts|villages|cadets|students|hospitals|laboratories)"
}

def compute_linguistic_scores(text):
    words = text.split()
    word_count = max(1, len(words))

    # Rhetoric matches
    rhetoric_count = 0
    matched_rhetoric = Counter()
    for term in RHETORIC_TERMS:
        matches = re.findall(term, text, re.IGNORECASE)
        if matches:
            rhetoric_count += len(matches)
            matched_rhetoric[term.lower()] += len(matches)

    # Substance matches
    substance_count = 0
    matched_substance = Counter()
    for cat, pat in SUBSTANCE_PATTERNS.items():
        matches = re.findall(pat, text, re.IGNORECASE)
        if matches:
            substance_count += len(matches)
            matched_substance[cat] += len(matches)

    rds = (rhetoric_count / word_count) * 1000.0
    sar = (substance_count / word_count) * 1000.0
    srr = sar / max(0.001, rds)

    return {
        "word_count": word_count,
        "rhetoric_count": rhetoric_count,
        "substance_count": substance_count,
        "rds_score": round(rds, 2),
        "sar_score": round(sar, 2),
        "srr_ratio": round(srr, 2),
        "top_rhetoric": dict(matched_rhetoric.most_common(5)),
        "substance_breakdown": dict(matched_substance)
    }

pib_full_text = "\n".join(d.get('content', '') or '' for d in pib_digests)
ca_full_text = "\n".join(((q.get('question', '') or '') + '\n' + (q.get('explanation', '') or '')) for q in ca_mcqs)

pib_ling = compute_linguistic_scores(pib_full_text)
ca_ling = compute_linguistic_scores(ca_full_text)

# Per-digest breakdown
pib_per_edition_ling = []
for d in pib_digests:
    c = d.get('content', '') or ''
    scores = compute_linguistic_scores(c)
    pib_per_edition_ling.append({
        "date": d.get('date'),
        "title": d.get('title'),
        "scores": scores
    })

# ==============================================================================
# 6. MACROECONOMIC & CAPITAL LEDGER
# ==============================================================================
CURRENCY_EXTRACTIONS = []

for idx, d in enumerate(pib_digests):
    content = d.get('content', '') or ''
    matches = re.findall(r"((?:₹|Rs\.?|USD|\$)\s*\d+(?:\.\d+)?\s*(?:crore|lakh|thousand|billion|million|trillion)?)", content)
    if matches:
        for m in matches:
            # find surrounding sentence
            pos = content.find(m)
            start = max(0, pos - 60)
            end = min(len(content), pos + len(m) + 60)
            context_snippet = content[start:end].replace('\n', ' ').strip()
            CURRENCY_EXTRACTIONS.append({
                "date": d.get('date'),
                "amount_str": m,
                "context": context_snippet,
                "source": "pib"
            })

for q in ca_mcqs:
    comb = (q.get('headline', '') or '') + ' ' + (q.get('explanation', '') or '')
    matches = re.findall(r"((?:₹|Rs\.?|USD|\$)\s*\d+(?:\.\d+)?\s*(?:crore|lakh|thousand|billion|million|trillion)?)", comb)
    if matches:
        for m in matches:
            pos = comb.find(m)
            start = max(0, pos - 50)
            end = min(len(comb), pos + len(m) + 50)
            CURRENCY_EXTRACTIONS.append({
                "date": q.get('edition_date') or q.get('created_at')[:10],
                "amount_str": m,
                "context": comb[start:end].replace('\n', ' ').strip(),
                "source": "ca_mcq"
            })

# ==============================================================================
# 7. THEMATIC CLUSTERING & N-GRAM COLLOCATIONS
# ==============================================================================
STOPWORDS = set([
    "the", "of", "and", "in", "to", "a", "is", "for", "that", "on", "with", "as", "by", "this", "an", "be",
    "are", "from", "at", "which", "it", "or", "was", "has", "have", "been", "its", "their", "under", "not",
    "will", "also", "such", "other", "into", "can", "all", "more", "between", "key", "india", "indian", "national",
    "policy", "development", "government", "states", "state", "public", "central", "act", "case", "table", "content"
])

def extract_ngrams(texts, n=2, min_freq=3):
    ngram_counts = Counter()
    for text in texts:
        words = re.findall(r"[A-Za-z0-9\-\_]{3,}", text.lower())
        filtered = [w for w in words if w not in STOPWORDS]
        for i in range(len(filtered) - n + 1):
            gram = " ".join(filtered[i:i+n])
            ngram_counts[gram] += 1
    return [item for item in ngram_counts.most_common(30) if item[1] >= min_freq]

bigrams = extract_ngrams(all_corpus_texts, n=2, min_freq=4)
trigrams = extract_ngrams(all_corpus_texts, n=3, min_freq=3)

# Compile full results
final_results = {
    "generated_at": datetime.now().isoformat(),
    "census": census_data,
    "institutions": {
        "ranking_by_mentions": combined_institutions.most_common(20),
        "pib_counts": pib_entity_counts.most_common(15),
        "ca_counts": ca_entity_counts.most_common(15),
        "pib_co_occurrences": {k: dict(v.most_common(5)) for k, v in pib_co_occ.items() if v}
    },
    "geopolitics": {
        "partner_ranking": geo_counts.most_common(15),
        "domain_alignment": {k: dict(v) for k, v in geo_domains.items()}
    },
    "judicial_friction_cases_count": len(LEGAL_CASES_AND_DISPUTES),
    "sample_judicial_frictions": LEGAL_CASES_AND_DISPUTES[:12],
    "linguistics": {
        "pib_overall": pib_ling,
        "ca_overall": ca_ling,
        "per_edition_breakdown": pib_per_edition_ling
    },
    "capital_ledger": {
        "total_financial_anchors_found": len(CURRENCY_EXTRACTIONS),
        "sample_entries": CURRENCY_EXTRACTIONS[:20]
    },
    "thematic_collocations": {
        "top_bigrams": bigrams,
        "top_trigrams": trigrams
    }
}

with open(OUTPUT_METRICS_PATH, 'w', encoding='utf-8') as f:
    json.dump(final_results, f, indent=2)

print(f"\n Master Analytics Engine execution complete!")
print(f"Results written to: {OUTPUT_METRICS_PATH}")
print(f"Total Words Analyzed: {census_data['total_word_volume']}")
print(f"PIB Substance-to-Rhetoric Ratio (SRR): {pib_ling['srr_ratio']} (SAR: {pib_ling['sar_score']}, RDS: {pib_ling['rds_score']})")
print(f"CA MCQ Substance-to-Rhetoric Ratio (SRR): {ca_ling['srr_ratio']} (SAR: {ca_ling['sar_score']}, RDS: {ca_ling['rds_score']})")
print(f"Top 3 Institutions: {combined_institutions.most_common(3)}")
print(f"Top 3 Foreign Partners: {geo_counts.most_common(3)}")
