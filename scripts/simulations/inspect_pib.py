import json
import re
from collections import Counter, defaultdict

with open('scripts/data/simulations/all_pib_digests_499.json', 'r', encoding='utf-8') as f:
    digests = json.load(f)

print(f"Total digests: {len(digests)}")

# Date spread
dates = [d.get('date') for d in digests if d.get('date')]
dates.sort()
print(f"Date range: {dates[0]} to {dates[-1]}")

# Monthly count
months = Counter(d[:7] for d in dates)
print("Monthly distribution:", sorted(months.items()))

# Content analysis: length, keywords
total_words = sum(len(d.get('content', '').split()) for d in digests)
print(f"Total words across all digests: {total_words:,} (avg {total_words/len(digests):.1f} words/digest)")

# Extract ministries/organizations from titles and content
ministry_patterns = [
    r'Ministry of [A-Za-z &,\'\-]+',
    r'Department of [A-Za-z &,\'\-]+',
    r'Cabinet Committee on [A-Za-z &,\'\-]+',
    r'NITI Aayog',
    r'Reserve Bank of India',
    r'ISRO',
    r'DRDO',
    r'Prime Minister',
    r'President of India'
]

ministry_counter = Counter()
for d in digests:
    text = (d.get('title', '') + ' ' + d.get('content', '')[:500])
    for pat in ministry_patterns:
        matches = re.findall(pat, text)
        for m in matches:
            cleaned = m.strip().rstrip(',.-')
            # normalize
            if len(cleaned) < 50:
                ministry_counter[cleaned] += 1

print("\nTop detected ministries/institutions:")
for m, c in ministry_counter.most_common(25):
    print(f"  {m}: {c}")

# Let's see some sample titles and content
print("\nSample titles from different periods:")
for idx in [0, 50, 150, 250, 350, 450, 498]:
    if idx < len(digests):
        d = digests[idx]
        print(f"[{idx+1}] ({d.get('date')}): {d.get('title')}")
        snippet = d.get('content', '').replace('\n', ' ')[:140]
        print(f"     Snippet: {snippet}...\n")
