import asyncio
import base64
import io
import json
import os
import time
from collections import defaultdict, deque
from pathlib import Path
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError
import httpx
from matcher import match_page

PAGES = json.loads((Path(__file__).parent / 'data/pages.json').read_text())
MAX_BYTES = 10 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 24_000_000
app = FastAPI(title='Mus’haf Scan', docs_url=None, redoc_url=None)
origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:8081').split(',')
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])
requests = defaultdict(deque)
ocr_slots = asyncio.Semaphore(3)


@app.middleware('http')
async def guard(request: Request, call_next):
    from fastapi.responses import JSONResponse
    if request.url.path == '/v1/scan':
        # Trust the direct peer only; configure a trusted reverse proxy at deployment.
        ip = request.client.host if request.client else 'unknown'
        now = time.monotonic()
        if len(requests) > 10000:
            for key in list(requests):
                if not requests[key] or requests[key][-1] < now - 60:
                    del requests[key]
        q = requests[ip]
        while q and q[0] < now - 60:
            q.popleft()
        if len(q) >= 8:
            return JSONResponse({'detail': 'Shumë kërkesa. Provo pas një minute.'}, 429)
        q.append(now)
        size = request.headers.get('content-length')
        if not size or not size.isdigit() or int(size) > MAX_BYTES + 100000:
            return JSONResponse({'detail': 'Fotografia duhet të jetë nën 10 MB.'}, 413)
    return await call_next(request)


@app.get('/health')
async def health():
    return {'ok': True, 'pages': len(PAGES), 'scannerConfigured': bool(os.getenv('GOOGLE_VISION_API_KEY'))}


@app.get('/v1/pages/{number}')
async def page(number: int):
    if not 1 <= number <= 604:
        raise HTTPException(404, 'Faqja nuk ekziston.')
    return PAGES[number - 1]


def prepare_image(raw):
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if image.format not in ('JPEG', 'PNG', 'WEBP'):
                raise ValueError()
            image = ImageOps.exif_transpose(image).convert('RGB')
            image.thumbnail((2400, 3200))
            if min(image.size) < 200:
                raise ValueError()
            out = io.BytesIO()
            image.save(out, format='JPEG', quality=90)  # strips EXIF and location
            return base64.b64encode(out.getvalue()).decode()
    except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(400, 'Dërgo një fotografi të qartë JPEG, PNG ose WebP.')


@app.post('/v1/scan')
async def scan(image: UploadFile = File(...)):
    key = os.getenv('GOOGLE_VISION_API_KEY')
    if not key:
        raise HTTPException(503, 'Skaneri ende nuk është konfiguruar. Përdor numrin e faqes për momentin.')
    raw = await image.read(MAX_BYTES + 1)
    await image.close()
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, 'Fotografia duhet të jetë nën 10 MB.')
    content = await asyncio.to_thread(prepare_image, raw)
    try:
        async with ocr_slots:
            async with httpx.AsyncClient(timeout=40) as client:
                result = await client.post('https://vision.googleapis.com/v1/images:annotate',
                    headers={'X-Goog-Api-Key': key}, json={'requests': [{
                        'image': {'content': content},
                        'features': [{'type': 'DOCUMENT_TEXT_DETECTION'}],
                        'imageContext': {'languageHints': ['ar']}
                    }]})
        result.raise_for_status()
        annotation = result.json()['responses'][0]
        if 'error' in annotation:
            raise ValueError('OCR service error')
        text = annotation.get('fullTextAnnotation', {}).get('text', '')
    except (httpx.HTTPError, ValueError, KeyError, IndexError):
        raise HTTPException(502, 'Shërbimi i skanimit nuk u përgjigj. Provo përsëri.')
    # Never log/store photographs or OCR text. Only return canonical corpus content.
    match = await asyncio.to_thread(match_page, text, PAGES)
    if match['status'] == 'matched':
        match['result'] = PAGES[match['page'] - 1]
    return match
