import json
import re
import os
import math
from collections import Counter, defaultdict
from datetime import datetime

SNAPSHOT_PATH = os.path.join(os.path.dirname(__file__), 'data', 'mega_news_corpus_snapshot.json')
OUTPUT_METRICS_PATH = os.path.join(os.path.dirname(__file__), 'data', 'mega_phd_analytics_results.json')

with open(SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
    corpus = json.load(f)

ca_articles = corpus.get('current_affairs_articles', [])
pib_digests = corpus.get('pib_digests', [])
ca_mcqs = corpus.get('current_affairs_mcqs', [])

print(f"Loaded {len(ca_articles)} CA articles, {len(pib_digests)} PIB digests, {len(ca_mcqs)} CA MCQs.")

# Helper to extract text from an article item
def extract_ca_article_text(art):
    headline = art.get('headline', '') or ''
    source = art.get('source', '') or ''
    ministry = art.get('ministry', '') or ''
    summary_raw = art.get('summary', '')
    summary_text = ''
    if isinstance(summary_raw, dict):
        summary_text = ' '.join(str(v) for v in summary_raw.values())
    elif isinstance(summary_raw, list):
        summary_text = ' '.join(str(v) for v in summary_raw)
    elif isinstance(summary_raw, str):
        summary_text = summary_raw
    return f"{headline}\n{source} | {ministry}\n{summary_text}"

# ==============================================================================
# 1. CORPUS CENSUS & CHRONOMETRY
# ==============================================================================
total_ca_art_chars = sum(len(extract_ca_article_text(a)) for a in ca_articles)
total_ca_art_words = sum(len(extract_ca_article_text(a).split()) for a in ca_articles)

total_pib_chars = sum(len(d.get('content', '') or '') for d in pib_digests)
total_pib_words = sum(len((d.get('content', '') or '').split()) for d in pib_digests)

total_mcq_chars = sum(len((q.get('question', '') or '') + (q.get('explanation', '') or '') + (q.get('headline', '') or '')) for q in ca_mcqs)
total_mcq_words = sum(len(((q.get('question', '') or '') + ' ' + (q.get('explanation', '') or '') + ' ' + (q.get('headline', '') or '')).split()) for q in ca_mcqs)

total_words = total_ca_art_words + total_pib_words + total_mcq_words
total_chars = total_ca_art_chars + total_pib_chars + total_mcq_chars
total_docs = len(ca_articles) + len(pib_digests) + len(ca_mcqs)

# Source breakdown across 927 articles
source_counts = Counter(a.get('source', 'UNKNOWN') for a in ca_articles)
ministry_counts = Counter(a.get('ministry', 'UNKNOWN') for a in ca_articles)

# Weekly distribution
def get_iso_week(date_str):
    if not date_str: return 'Unknown'
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00')[:19])
        return f"{dt.year}-W{dt.isocalendar()[1]:02d}"
    except:
        try:
            dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
            return f"{dt.year}-W{dt.isocalendar()[1]:02d}"
        except:
            return 'Unknown'

weekly_dist = defaultdict(lambda: {'articles': 0, 'pib': 0, 'mcqs': 0, 'words': 0})

for a in ca_articles:
    w = get_iso_week(a.get('published_at') or a.get('created_at'))
    w_words = len(extract_ca_article_text(a).split())
    weekly_dist[w]['articles'] += 1
    weekly_dist[w]['words'] += w_words

for d in pib_digests:
    w = get_iso_week(d.get('date'))
    w_words = len((d.get('content', '') or '').split())
    weekly_dist[w]['pib'] += 1
    weekly_dist[w]['words'] += w_words

for q in ca_mcqs:
    w = get_iso_week(q.get('edition_date') or q.get('created_at'))
    w_words = len(((q.get('question', '') or '') + ' ' + (q.get('explanation', '') or '')).split())
    weekly_dist[w]['mcqs'] += 1
    weekly_dist[w]['words'] += w_words

census_data = {
    "total_documents": total_docs,
    "current_affairs_articles_count": len(ca_articles),
    "pib_digests_count": len(pib_digests),
    "current_affairs_mcqs_count": len(ca_mcqs),
    "total_character_volume": total_chars,
    "total_word_volume": total_words,
    "breakdown": {
        "articles_words": total_ca_art_words,
        "pib_words": total_pib_words,
        "mcqs_words": total_mcq_words,
    },
    "source_distribution": dict(source_counts.most_common(15)),
    "ministry_distribution": dict(ministry_counts.most_common(20)),
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

all_texts = [extract_ca_article_text(a) for a in ca_articles] + \
            [d.get('title', '') + '\n' + (d.get('content', '') or '') for d in pib_digests] + \
            [(q.get('headline', '') or '') + '\n' + (q.get('question', '') or '') + '\n' + (q.get('explanation', '') or '') for q in ca_mcqs]

entity_counts = Counter()
for text in all_texts:
    for min_name, patterns in MINISTRIES.items():
        for pat in patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            if matches:
                entity_counts[min_name] += len(matches)
    for body_name, patterns in REGULATORY_CONSTITUTIONAL_BODIES.items():
        for pat in patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            if matches:
                entity_counts[body_name] += len(matches)

# ==============================================================================
# 3. GEOPOLITICAL VECTORS
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

geo_counts = Counter()
for text in all_texts:
    for geo, patterns in GEOPOLITICAL_ENTITIES.items():
        for pat in patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            if matches:
                geo_counts[geo] += len(matches)

# ==============================================================================
# 4. RHETORIC VS SUBSTANCE METRICS
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

def compute_linguistic_scores(text_list):
    full_text = "\n".join(text_list)
    words = full_text.split()
    word_count = max(1, len(words))

    rhetoric_count = 0
    matched_rhetoric = Counter()
    for term in RHETORIC_TERMS:
        matches = re.findall(term, full_text, re.IGNORECASE)
        if matches:
            rhetoric_count += len(matches)
            matched_rhetoric[term.lower()] += len(matches)

    substance_count = 0
    matched_substance = Counter()
    for cat, pat in SUBSTANCE_PATTERNS.items():
        matches = re.findall(pat, full_text, re.IGNORECASE)
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

articles_ling = compute_linguistic_scores([extract_ca_article_text(a) for a in ca_articles])
pib_ling = compute_linguistic_scores([d.get('content', '') or '' for d in pib_digests])
mcqs_ling = compute_linguistic_scores([((q.get('question', '') or '') + '\n' + (q.get('explanation', '') or '')) for q in ca_mcqs])
mega_ling = compute_linguistic_scores(all_texts)

final_results = {
    "generated_at": datetime.now().isoformat(),
    "census": census_data,
    "institutions": {
        "ranking_by_mentions": entity_counts.most_common(25),
    },
    "geopolitics": {
        "partner_ranking": geo_counts.most_common(15),
    },
    "linguistics": {
        "mega_overall": mega_ling,
        "articles_only": articles_ling,
        "pib_only": pib_ling,
        "mcqs_only": mcqs_ling
    }
}

with open(OUTPUT_METRICS_PATH, 'w', encoding='utf-8') as f:
    json.dump(final_results, f, indent=2)

print(f"\n Master Mega-Analytics execution complete!")
print(f"Results written to: {OUTPUT_METRICS_PATH}")
print(f"Total Words Analyzed Across Mega-Corpus: {census_data['total_word_volume']}")
print(f"Source breakdown: {census_data['source_distribution']}")
print(f"Top 5 Institutions in Full Mega-Corpus: {entity_counts.most_common(5)}")
print(f"Top 5 Foreign Partners in Full Mega-Corpus: {geo_counts.most_common(5)}")
print(f"Full Corpus Substance-to-Rhetoric Ratio (SRR): {mega_ling['srr_ratio']} (SAR: {mega_ling['sar_score']}, RDS: {mega_ling['rds_score']})")
