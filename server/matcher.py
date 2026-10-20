"""Conservative text matching against a fixed, verified 604-page corpus."""
import re
import unicodedata
from collections import defaultdict
from functools import lru_cache
from rapidfuzz.fuzz import partial_ratio


@lru_cache(maxsize=8000)
def normalize(text):
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = text.translate(str.maketrans('أإآٱىؤئ', 'اااايوي'))
    text = re.sub(r'[^\u0621-\u063A\u0641-\u064A ]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


BISMILLAH = normalize('بسم الله الرحمن الرحيم')


def match_page(text, pages):
    observed = normalize(text).replace(BISMILLAH, '').strip()
    if len(observed) < 45:
        return {'status': 'uncertain', 'reason': 'too_little_text', 'candidates': []}
    observed_words = set(observed.split())
    scores = defaultdict(float)
    evidence = defaultdict(list)
    for page in pages:
        for verse in page['verses']:
            target = normalize(verse['arabic']).replace(BISMILLAH, '').strip()
            if len(target) < 24:
                continue
            words = set(target.split())
            coverage = len(words & observed_words) / max(1, len(words))
            # Exact word overlap is an extra guard against shared short expressions.
            if coverage < .50:
                continue
            similarity = partial_ratio(target, observed)
            if similarity >= 86:
                weight = min(len(target), len(observed), 260) * (similarity / 100) * coverage
                scores[page['page']] += weight
                evidence[page['page']].append({'key': verse['key'], 'characters': len(target), 'similarity': round(similarity, 1)})
        # A complete-page anchor also covers pages made up of short ayahs.
        whole = normalize(' '.join(v['arabic'] for v in page['verses'])).replace(BISMILLAH, '').strip()
        words = set(whole.split())
        coverage = len(words & observed_words) / max(1, len(words))
        if len(whole) >= 100 and len(observed) >= len(whole) * .65 and coverage >= .75:
            similarity = partial_ratio(whole, observed)
            if similarity >= 92:
                scores[page['page']] += min(len(whole), 900) * similarity / 100 * coverage
                evidence[page['page']].append({'key': 'page', 'characters': len(whole), 'similarity': round(similarity, 1)})
    ranked = sorted(scores, key=scores.get, reverse=True)
    candidates = [{'page': p, 'score': round(scores[p], 1)} for p in ranked[:3]]
    if not ranked:
        return {'status': 'uncertain', 'reason': 'no_match', 'candidates': []}
    best = ranked[0]
    margin = scores[best] / max(scores[ranked[1]], 1) if len(ranked) > 1 else 99
    strong = len(evidence[best]) >= 2 or any(v['characters'] >= 90 and v['similarity'] >= 94 for v in evidence[best])
    if scores[best] < 90 or margin < 1.8 or not strong:
        return {'status': 'uncertain', 'reason': 'ambiguous', 'candidates': candidates}
    return {'status': 'matched', 'page': best, 'evidence': evidence[best], 'candidates': candidates}
