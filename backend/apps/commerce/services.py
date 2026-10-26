import json
import re
from urllib.request import Request, urlopen
from django.conf import settings

def toman_price(value):
    if isinstance(value, (int, float)):
        return int(value)
    value = str(value).translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
    digits = re.sub(r'[^0-9]', '', value)
    return int(digits or 0)

def gateway_call(endpoint, payload):
    if not settings.ZARINPAL_MERCHANT_ID:
        raise ValueError('مرچنت پرداخت تنظیم نشده است.')
    host = 'https://sandbox.zarinpal.com' if settings.ZARINPAL_SANDBOX else 'https://payment.zarinpal.com'
    payload = {'merchant_id': settings.ZARINPAL_MERCHANT_ID, **payload}
    req = Request(f'{host}/pg/v4/payment/{endpoint}.json', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json'})
    with urlopen(req, timeout=20) as response:
        result = json.load(response)
    data = result.get('data') or {}
    if not isinstance(data, dict) or data.get('code') not in (100, 101):
        raise ValueError('پرداخت توسط درگاه تایید نشد.')
    return data
