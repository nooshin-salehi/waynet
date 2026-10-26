from urllib.error import URLError
from django.conf import settings
from django.db import transaction
from django.shortcuts import redirect
from rest_framework import viewsets, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.accounts.models import User
from apps.courses.models import Course
from apps.catalog.models import Product
from apps.learning.models import Enrollment
from .models import Order
from .serializers import OrderSerializer, CheckoutSerializer
from .services import toman_price, gateway_call

class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Order.objects.order_by('-created_at')
    serializer_class = OrderSerializer
    def get_queryset(self):
        q = super().get_queryset()
        return q if self.request.user.role == 'admin' else q.filter(phone=self.request.user.phone)

@api_view(['POST'])
def checkout(request):
    s = CheckoutSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    items = []
    for item in s.validated_data['items']:
        if item['type'] == 'course':
            obj = Course.objects.filter(pk=item['id'], is_active=True).first()
            if not obj: raise serializers.ValidationError('دوره موجود یا فعال نیست.')
            price = request.user.price_overrides.get(obj.pk, toman_price(obj.price))
            qty, title = 1, obj.title
        else:
            obj = Product.objects.filter(pk=item['id']).first()
            if not obj: raise serializers.ValidationError('محصول موجود نیست.')
            price, qty, title = obj.price, item['qty'], obj.name
        if not isinstance(price, int) or price < 0:
            raise serializers.ValidationError('قیمت معتبر نیست.')
        items.append({'type': item['type'], 'id': obj.pk, 'title': title, 'price': price, 'qty': qty})
    amount = sum(i['price'] * i['qty'] for i in items)
    if amount <= 0: raise serializers.ValidationError('مبلغ سفارش معتبر نیست.')
    order = Order.objects.create(session_id=str(request.user.pk), phone=request.user.phone, items=items, amount=amount)
    try:
        data = gateway_call('request', {'amount': amount, 'currency': 'IRT', 'description': f'Waynet #{order.pk}',
            'callback_url': f'{settings.BACKEND_URL}/api/payment/callback/', 'metadata': {'mobile': request.user.phone}})
        authority = data.get('authority')
        if not authority: raise ValueError('شناسه پرداخت دریافت نشد.')
    except (ValueError, URLError, TimeoutError):
        order.status = 'failed'; order.save()
        return Response({'detail': 'ارتباط با درگاه برقرار نشد؛ تنظیمات پرداخت را بررسی کنید.'}, status=502)
    order.authority = authority; order.save()
    host = 'https://sandbox.zarinpal.com' if settings.ZARINPAL_SANDBOX else 'https://www.zarinpal.com'
    return Response({'ok': True, 'order': order.pk, 'redirect': f'{host}/pg/StartPay/{authority}'})

@api_view(['GET'])
@permission_classes([AllowAny])
def payment_callback(request):
    authority = request.query_params.get('Authority')
    if not authority: return redirect(f'{settings.FRONTEND_URL}/cart?payment=failed')
    with transaction.atomic():
        order = Order.objects.select_for_update().filter(authority=authority).first()
        if not order: return redirect(f'{settings.FRONTEND_URL}/cart?payment=failed')
        if order.status == 'paid':
            return redirect(f'{settings.FRONTEND_URL}/dashboard/orders?payment=paid')
        if request.query_params.get('Status') != 'OK':
            order.status = 'failed'; order.save()
            return redirect(f'{settings.FRONTEND_URL}/cart?payment=failed')
        try:
            data = gateway_call('verify', {'amount': order.amount, 'authority': order.authority})
        except (ValueError, URLError, TimeoutError):
            # Keep retryable status for ambiguous network failures.
            return redirect(f'{settings.FRONTEND_URL}/cart?payment=failed')
        buyer = User.objects.filter(phone=order.phone).first()
        if not buyer: return redirect(f'{settings.FRONTEND_URL}/cart?payment=failed')
        for item in order.items:
            if item['type'] == 'course':
                Enrollment.objects.get_or_create(student=buyer, course_id=item['id'], status='active', defaults={'order': order})
        order.status = 'paid'
        order.ref_id = str(data.get('ref_id', ''))
        order.save()
    return redirect(f'{settings.FRONTEND_URL}/dashboard/orders?payment=paid')
