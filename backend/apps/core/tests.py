from datetime import timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from django.test import override_settings
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from apps.accounts.models import User, AuthToken, PhoneVerification
from apps.accounts.services import hash_code
from apps.courses.models import Category, Course, CourseSession
from apps.learning.models import Enrollment, SessionAccessGrant, CourseProgress
from apps.commerce.models import Order
from apps.communications.models import Testimonial

@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher', 'apps.accounts.hashers.LegacyScryptHasher'])
class MigrationApiTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()  # محدودیت AuthThrottle بین تست‌ها پاک شود
        self.admin = User.objects.create_user('09120000001', 'Strong-pass-123', fullname='Admin', role='admin')
        self.teacher = User.objects.create_user('09120000002', 'Strong-pass-123', fullname='Teacher', role='teacher')
        self.other = User.objects.create_user('09120000003', 'Strong-pass-123', fullname='Other', role='teacher')
        self.student = User.objects.create_user('09120000004', 'Strong-pass-123', fullname='Student')
        self.category = Category.objects.create(pk='network', title='Network', short='N', type='network', desc='Network', icon='n')
        self.course = Course.objects.create(pk='ccna', category=self.category, category_name='Network', teacher_user=self.teacher, teacher='Teacher', title='CCNA', price='۴,۸۰۰,۰۰۰ تومان')
        self.lesson = CourseSession.objects.create(course=self.course, title='Private', order=1)
    def auth(self, user):
        token, obj = AuthToken.issue(user)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        return obj
    def test_public_read_and_anonymous_write_denied(self):
        self.assertEqual(self.client.get('/api/courses/').status_code, 200)
        self.assertEqual(self.client.post('/api/categories/', {'id':'hack'}).status_code, 401)
        self.assertEqual(self.client.get('/api/users/').status_code, 401)
    def make_code(self, phone, purpose='register', code='12345'):
        PhoneVerification.objects.update_or_create(phone=phone, purpose=purpose, defaults={
            'code_hash': hash_code(phone, code, purpose), 'attempts': 0, 'expires_at': timezone.now() + timedelta(minutes=2)})
        return code
    def test_registration_requires_valid_code(self):
        data = {'phone':'09120000006', 'fullname':'New', 'password':'Strong-pass-123'}
        self.assertEqual(self.client.post('/api/auth/register/', data).status_code, 400)
        self.make_code('09120000006')
        self.assertEqual(self.client.post('/api/auth/register/', {**data, 'code':'00000'}).status_code, 400)
        self.assertEqual(self.client.post('/api/auth/register/', {**data, 'code':'12345'}).status_code, 201)
        self.assertFalse(PhoneVerification.objects.filter(phone='09120000006').exists())
    @patch('apps.accounts.views.send_verification_sms')
    @override_settings(DEBUG=False)
    def test_forgot_and_reset_password_by_sms(self, sms):
        phone = self.student.phone
        r = self.client.post('/api/auth/forgot-password/', {'phone': phone})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('debug_code', r.data)
        self.assertEqual(sms.call_args[0][0], phone)
        self.assertEqual(sms.call_args[0][2], 'reset')
        code = sms.call_args[0][1]
        r = self.client.post('/api/auth/forgot-password/', {'phone': phone})
        self.assertEqual(r.status_code, 429)  # فاصلهٔ ارسال مجدد
        body = {'phone': phone, 'code': code, 'password': 'New-strong-pass-456'}
        self.assertEqual(self.client.post('/api/auth/reset-password/', {**body, 'code': '00000'}).status_code, 400)
        self.assertEqual(self.client.post('/api/auth/reset-password/', {**body, 'password': '1'}).status_code, 400)
        self.auth(self.student)
        self.client.credentials()
        self.assertEqual(self.client.post('/api/auth/reset-password/', body).status_code, 200)
        self.assertEqual(AuthToken.objects.filter(user=self.student).count(), 0)
        self.assertEqual(self.client.post('/api/auth/reset-password/', body).status_code, 400)  # کد یک‌بارمصرف
        self.assertEqual(self.client.post('/api/auth/login/', {'phone': phone, 'password': 'New-strong-pass-456'}).status_code, 200)
    @patch('apps.accounts.views.send_verification_sms')
    @override_settings(DEBUG=False)
    def test_forgot_password_does_not_reveal_unknown_phone(self, sms):
        r = self.client.post('/api/auth/forgot-password/', {'phone': '09129999999'})
        self.assertEqual(r.status_code, 200)
        sms.assert_not_called()
    def test_register_code_cannot_reset_password(self):
        self.make_code(self.student.phone, 'register')
        r = self.client.post('/api/auth/reset-password/', {'phone': self.student.phone, 'code': '12345', 'password': 'New-strong-pass-456'})
        self.assertEqual(r.status_code, 400)
    def test_reset_code_locks_after_too_many_attempts(self):
        self.make_code(self.student.phone, 'reset')
        for _ in range(5):
            self.client.post('/api/auth/reset-password/', {'phone': self.student.phone, 'code': '00000', 'password': 'New-strong-pass-456'})
        r = self.client.post('/api/auth/reset-password/', {'phone': self.student.phone, 'code': '12345', 'password': 'New-strong-pass-456'})
        self.assertEqual(r.status_code, 400)
    def test_registration_cannot_assign_admin(self):
        r = self.client.post('/api/auth/register/', {'phone':'09120000005', 'fullname':'Student', 'password':'Strong-pass-123', 'role':'admin', 'code':self.make_code('09120000005')})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['user']['role'], 'student')
        self.assertEqual(len(AuthToken.objects.get(user__phone='09120000005').key), 64)
    def test_weak_password_validation(self):
        r = self.client.post('/api/auth/register/', {'phone':'09120000005', 'fullname':'Student', 'password':'1'})
        self.assertEqual(r.status_code, 400)
    def test_student_cannot_change_own_role(self):
        self.auth(self.student)
        r = self.client.patch('/api/auth/me/', {'role':'admin', 'fullname':'New'})
        self.assertEqual(r.status_code, 200)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, 'student')
        self.assertEqual(self.client.get('/api/users/').status_code, 403)
    def test_teacher_ownership(self):
        self.auth(self.other)
        self.assertEqual(self.client.patch('/api/courses/ccna/', {'title':'Stolen'}).status_code, 403)
        self.assertEqual(self.client.post('/api/sessions/', {'course':'ccna','title':'Stolen'}).status_code, 403)
        self.auth(self.teacher)
        self.assertEqual(self.client.patch('/api/courses/ccna/', {'title':'Updated'}).status_code, 200)
    def test_teacher_cannot_transfer_session(self):
        self.auth(self.teacher)
        other_course = Course.objects.create(pk='other', category=self.category, teacher_user=self.other)
        r = self.client.patch(f'/api/sessions/{self.lesson.pk}/', {'course':other_course.pk})
        self.assertEqual(r.status_code, 400)
    def test_enrollment_expiry_and_session_grant(self):
        self.auth(self.student)
        self.assertEqual(self.client.get(f'/api/sessions/{self.lesson.pk}/playback/').status_code, 403)
        Enrollment.objects.create(student=self.student, course=self.course, expires_at=timezone.now()-timedelta(days=1))
        self.assertTrue(self.client.get('/api/courses/ccna/').data['sessions'][0]['locked'])
        SessionAccessGrant.objects.create(student=self.student, course=self.course, session=self.lesson)
        self.assertFalse(self.client.get('/api/courses/ccna/').data['sessions'][0]['locked'])
        self.auth(self.other)
        self.assertTrue(self.client.get('/api/courses/ccna/').data['sessions'][0]['locked'])
    def test_progress_requires_access_and_is_idempotent(self):
        self.auth(self.student)
        payload = {'session':self.lesson.pk,'watched_duration':20,'completed':True}
        self.assertEqual(self.client.post('/api/progress/', payload).status_code, 403)
        self.lesson.is_free=True; self.lesson.save()
        self.assertEqual(self.client.post('/api/progress/', payload).status_code, 200)
        self.assertEqual(self.client.post('/api/progress/', payload).status_code, 200)
        self.assertEqual(CourseProgress.objects.count(), 1)
    def test_grant_rejects_wrong_course(self):
        self.auth(self.admin)
        other_course=Course.objects.create(pk='other',category=self.category)
        r=self.client.post('/api/session-access/',{'student':self.student.pk,'course':other_course.pk,'session':self.lesson.pk})
        self.assertEqual(r.status_code,400)
    def test_expired_and_deactivated_tokens(self):
        obj=self.auth(self.student); obj.expires_at=timezone.now()-timedelta(seconds=1); obj.save()
        self.assertEqual(self.client.get('/api/auth/me/').status_code,401)
        self.auth(self.student); self.student.is_active=False; self.student.save()
        self.assertEqual(self.client.get('/api/auth/me/').status_code,401)
    def test_testimonial_moderation(self):
        self.auth(self.student)
        r=self.client.post('/api/testimonials/',{'name':'Student','text':'Review','approved':True})
        self.assertEqual(r.status_code,201)
        self.assertFalse(Testimonial.objects.get().approved)
        self.auth(self.admin)
        self.assertEqual(len(self.client.get('/api/testimonials/').data),1)
        self.assertEqual(self.client.post(f'/api/testimonials/{r.data["id"]}/approve/').status_code,200)
    def test_private_upload_and_range(self):
        with TemporaryDirectory() as directory, override_settings(PRIVATE_MEDIA_ROOT=Path(directory)):
            self.auth(self.other)
            url=f'/api/sessions/{self.lesson.pk}/video/'
            self.assertEqual(self.client.post(url,{'file':SimpleUploadedFile('a.mp4',b'0123456789',content_type='video/mp4')},format='multipart').status_code,403)
            self.auth(self.teacher)
            self.assertEqual(self.client.post(url,{'file':SimpleUploadedFile('a.mp4',b'0123456789',content_type='video/mp4')},format='multipart').status_code,200)
            self.lesson.refresh_from_db()
            self.lesson.is_free=True; self.lesson.save()
            self.client.credentials()
            playback=self.client.get(f'/api/sessions/{self.lesson.pk}/playback/').data['url']
            endpoint=playback.split('/api',1)[1]
            r=self.client.get('/api'+endpoint,HTTP_RANGE='bytes=2-5')
            self.assertEqual(r.status_code,206)
            self.assertEqual(b''.join(r.streaming_content),b'2345')
            self.assertEqual(self.client.get('/api'+endpoint,HTTP_RANGE='bytes=99-').status_code,416)
            self.lesson.is_free=False;self.lesson.save()
            self.assertEqual(self.client.get('/api'+endpoint).status_code,403)
    def _free_video(self, directory):
        self.auth(self.teacher)
        self.client.post(f'/api/sessions/{self.lesson.pk}/video/',{'file':SimpleUploadedFile('a.mp4',b'0123456789',content_type='video/mp4')},format='multipart')
        self.lesson.refresh_from_db()
        self.lesson.is_free=True; self.lesson.save()
        self.client.credentials()
        data=self.client.get(f'/api/sessions/{self.lesson.pk}/playback/').data
        return data, '/api'+data['url'].split('/api',1)[1]
    def test_stream_token_lasts_beyond_five_minutes_and_expires(self):
        with TemporaryDirectory() as directory, override_settings(PRIVATE_MEDIA_ROOT=Path(directory)):
            data, endpoint = self._free_video(directory)
            self.assertGreaterEqual(data['expires_in'], 3600)
            from django.core import signing
            token = endpoint.rstrip('/').rsplit('/',1)[1]
            real_loads = signing.loads
            def six_minutes_later(value, **kw):
                self.assertGreaterEqual(kw['max_age'], 3600)
                return real_loads(value, salt=kw['salt'], max_age=None)
            with patch('apps.courses.views.signing.loads', side_effect=six_minutes_later):
                self.assertEqual(self.client.get(endpoint, HTTP_RANGE='bytes=0-3').status_code, 206)
            with override_settings(VIDEO_TOKEN_TTL=-1):
                self.assertEqual(self.client.get(endpoint).status_code, 403)
    def test_stream_uses_nginx_accel_redirect_when_configured(self):
        with TemporaryDirectory() as directory, override_settings(PRIVATE_MEDIA_ROOT=Path(directory), VIDEO_ACCEL_REDIRECT_PREFIX='/_protected_video/'):
            data, endpoint = self._free_video(directory)
            r = self.client.get(endpoint, HTTP_RANGE='bytes=2-5')
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.content, b'')
            self.assertRegex(r['X-Accel-Redirect'], r'^/_protected_video/courses/ccna/[0-9a-f]{32}\.mp4$')
            self.lesson.is_free=False; self.lesson.save()
            self.assertEqual(self.client.get(endpoint).status_code, 403)
    @patch('apps.commerce.views.gateway_call')
    def test_checkout_recalculates_prices(self,gateway):
        gateway.return_value={'code':100,'authority':'test-authority'}
        self.auth(self.student)
        r=self.client.post('/api/checkout/',{'items':[{'type':'course','id':'ccna','qty':9,'price':1}]},format='json')
        self.assertEqual(r.status_code,200)
        self.assertEqual(Order.objects.get().amount,4800000)
        self.assertEqual(Order.objects.get().items[0]['qty'],1)
        self.assertEqual(Enrollment.objects.count(),0)
    @patch('apps.commerce.views.gateway_call')
    def test_callback_verifies_and_is_idempotent(self,gateway):
        gateway.return_value={'code':100,'ref_id':'1234'}
        order=Order.objects.create(session_id='s',phone=self.student.phone,items=[{'type':'course','id':'ccna'}],amount=4800000,authority='trusted')
        self.assertEqual(self.client.get('/api/payment/callback/?Authority=wrong&Status=OK').status_code,302)
        self.assertFalse(Enrollment.objects.exists())
        self.client.get('/api/payment/callback/?Authority=trusted&Status=OK')
        self.client.get('/api/payment/callback/?Authority=trusted&Status=OK')
        self.assertEqual(Enrollment.objects.count(),1)
        self.assertEqual(gateway.call_count,1)
        order.refresh_from_db();self.assertEqual(order.status,'paid')
    def test_order_visibility(self):
        Order.objects.create(session_id='s',phone=self.student.phone,amount=1)
        self.auth(self.other)
        self.assertEqual(self.client.get('/api/orders/').data,[])

    def test_progress_does_not_regress(self):
        self.auth(self.student)
        self.lesson.is_free = True; self.lesson.save()
        self.client.post('/api/progress/', {'session':self.lesson.pk, 'watched_duration':100, 'completed':True})
        self.client.post('/api/progress/', {'session':self.lesson.pk, 'watched_duration':10, 'completed':False})
        progress = CourseProgress.objects.get()
        self.assertEqual(progress.watched_duration, 100)
        self.assertTrue(progress.completed)
    def test_mongo_import_dry_run_and_repeat(self):
        import json
        from django.core.management import call_command
        from apps.accounts.hashers import LegacyScryptHasher
        salt = 'legacy-salt'
        encoded = LegacyScryptHasher().encode('Old-password-123', salt)
        with TemporaryDirectory() as directory:
            row = {'_id':{'$oid':'old-user'}, 'phone':'09120000009', 'fullname':'Legacy', 'role':'student', 'passwordSalt':salt, 'passwordHash':encoded.split('$')[2], 'purchasedCourses':[{'courseId':'ccna'}]}
            Path(directory, 'users.json').write_text(json.dumps([row]), encoding='utf-8')
            call_command('import_mongodb', directory, dry_run=True, verbosity=0)
            self.assertFalse(User.objects.filter(phone=row['phone']).exists())
            call_command('import_mongodb', directory, verbosity=0)
            call_command('import_mongodb', directory, verbosity=0)
            imported = User.objects.get(phone=row['phone'])
            self.assertTrue(imported.check_password('Old-password-123'))
            self.assertEqual(Enrollment.objects.filter(student=imported).count(), 1)
            imported.refresh_from_db()
            self.assertFalse(imported.password.startswith('legacy_scrypt'))

    def test_teacher_cannot_overwrite_course_by_changing_id(self):
        other_course = Course.objects.create(pk='other', category=self.category, teacher_user=self.other, title='Other')
        self.auth(self.teacher)
        response = self.client.patch('/api/courses/ccna/', {'id':'other', 'title':'Overwrite'})
        self.assertEqual(response.status_code, 400)
        other_course.refresh_from_db()
        self.assertEqual(other_course.title, 'Other')
