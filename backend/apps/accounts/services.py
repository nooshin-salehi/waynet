import hashlib
import hmac
import json
import logging
import secrets
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

KAVENEGAR_URL = 'https://api.kavenegar.com/v1/{key}/verify/lookup.json'


class SmsError(Exception):
    pass


def make_code():
    return ''.join(secrets.choice('0123456789') for _ in range(settings.SMS_CODE_LENGTH))


def hash_code(phone, code, purpose='register'):
    return hmac.new(settings.SECRET_KEY.encode(), f'{purpose}:{phone}:{code}'.encode(), hashlib.sha256).hexdigest()


def kavenegar_lookup(phone, token, template=None):
    """ارسال پیامک تأیید با قالب Verify Lookup کاوه‌نگار (بدون وابستگی اضافه)."""
    if not settings.KAVENEGAR_API_KEY:
        raise SmsError('KAVENEGAR_API_KEY تنظیم نشده است.')
    query = urllib.parse.urlencode({'receptor': phone, 'token': token, 'template': template or settings.KAVENEGAR_TEMPLATE})
    url = KAVENEGAR_URL.format(key=urllib.parse.quote(settings.KAVENEGAR_API_KEY, safe='')) + '?' + query
    try:
        with urllib.request.urlopen(url, timeout=settings.KAVENEGAR_TIMEOUT) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        # کاوه‌نگار خطاها را با کد HTTP و بدنهٔ JSON برمی‌گرداند؛ کلید در لاگ ثبت نمی‌شود.
        logger.error('Kavenegar HTTP error %s', exc.code)
        raise SmsError('ارسال پیامک ناموفق بود.')
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        logger.error('Kavenegar request failed: %s', type(exc).__name__)
        raise SmsError('ارتباط با سرویس پیامک برقرار نشد.')
    if data.get('return', {}).get('status') != 200:
        logger.error('Kavenegar rejected request: %s', data.get('return'))
        raise SmsError('ارسال پیامک ناموفق بود.')
    return data


def send_verification_sms(phone, code, purpose='register'):
    template = settings.KAVENEGAR_RESET_TEMPLATE if purpose == 'reset' else settings.KAVENEGAR_TEMPLATE
    return kavenegar_lookup(phone, code, template)
