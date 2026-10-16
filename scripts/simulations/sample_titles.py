import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data/simulations/all_pib_digests_499.json', 'r', encoding='utf-8') as f:
    digests = json.load(f)

print(f"Total digests: {len(digests)}")

# Print 40 evenly spaced titles
step = len(digests) // 40
for idx in range(0, len(digests), step):
    d = digests[idx]
    title = d.get('title') or 'NO TITLE'
    date = d.get('date') or 'NO DATE'
    print(f"[{idx+1:03d}] {date} | {title}")
