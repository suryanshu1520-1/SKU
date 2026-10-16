import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data/simulations/all_pib_digests_499.json', 'r', encoding='utf-8') as f:
    digests = json.load(f)

for idx in [0, 228, 300, 360, 420]:
    d = digests[idx]
    print("=" * 80)
    print(f"DIGEST [{idx+1}] | Date: {d.get('date')} | Title: {d.get('title')}")
    print("URL:", d.get('url'))
    print("CONTENT:\n")
    print(d.get('content')[:1200])
    print("\n" + "=" * 80)
