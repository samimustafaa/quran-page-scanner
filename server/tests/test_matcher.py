import json
from pathlib import Path
import pytest
from matcher import match_page
from main import app, prepare_image
from fastapi.testclient import TestClient
from fastapi import HTTPException
PAGES=json.loads((Path(__file__).parents[1]/'data/pages.json').read_text())
client=TestClient(app)

def test_corpus_integrity():
    assert [p['page'] for p in PAGES]==list(range(1,605))
    verses=[v for p in PAGES for v in p['verses']]
    assert len(verses)==len(set(v['key'] for v in verses))==6236
    assert all(v['arabic'] and v['translation'] for v in verses)
    assert len(PAGES[-1]['surahs'])==3

@pytest.mark.parametrize('n',[1,2,3,42,100,187,282,400,550,600,604])
def test_full_page_match(n):
    result=match_page(' '.join(v['arabic'] for v in PAGES[n-1]['verses']),PAGES)
    assert result['status']=='matched',result
    assert result['page']==n

def test_partial_page():
    result=match_page(' '.join(v['arabic'] for v in PAGES[41]['verses'][:3]),PAGES)
    assert result['page']==42

def test_short_common_or_unrelated():
    for text in ['بسم الله الرحمن الرحيم','','هذه صورة غير متعلقة بالقرآن الكريم '*10]:
        assert match_page(text,PAGES)['status']=='uncertain'

def test_spread():
    text=' '.join(v['arabic'] for p in PAGES[41:43] for v in p['verses'])
    assert match_page(text,PAGES)['status']=='uncertain'

def test_page_boundaries():
    assert client.get('/v1/pages/604').json()['page']==604
    assert client.get('/v1/pages/605').status_code==404
    assert client.get('/v1/pages/0').status_code==404

def test_unconfigured_scanner(monkeypatch):
    monkeypatch.delenv('GOOGLE_VISION_API_KEY',raising=False)
    assert client.post('/v1/scan',files={'image':('x.jpg',b'not image','image/jpeg')}).status_code==503

def test_invalid_image():
    with pytest.raises(HTTPException):prepare_image(b'not an image')

def test_ocr_http_integration(monkeypatch):
    import io
    from PIL import Image
    from unittest.mock import AsyncMock
    import main
    monkeypatch.setenv('GOOGLE_VISION_API_KEY','test-only')
    for name in ['ALL_PROXY','all_proxy','HTTPS_PROXY','https_proxy','HTTP_PROXY','http_proxy']:monkeypatch.delenv(name,raising=False)
    text=' '.join(v['arabic'] for v in PAGES[41]['verses'])
    class Response:
        def raise_for_status(self):pass
        def json(self):return {'responses':[{'fullTextAnnotation':{'text':text}}]}
    monkeypatch.setattr(main.httpx.AsyncClient,'post',AsyncMock(return_value=Response()))
    image=io.BytesIO();Image.new('RGB',(800,1200),'white').save(image,'JPEG')
    result=client.post('/v1/scan',files={'image':('page.jpg',image.getvalue(),'image/jpeg')})
    assert result.status_code==200
    assert result.json()['result']['page']==42
    assert result.json()['result']['edition']=='sq.ahmeti'
