import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.accounts.models import User
from apps.courses.models import Category, Course, CourseSession, Career
from apps.catalog.models import Product, Service, Rack, RackRequest
from apps.learning.models import Enrollment, SessionAccessGrant, CourseProgress, CourseAnnouncement, CourseQuestion
from apps.commerce.models import Order
from apps.communications.models import Testimonial

def normalize(value):
    if isinstance(value, dict):
        if '$oid' in value: return value['$oid']
        if '$date' in value:
            date = value['$date']
            if isinstance(date, str): return date
            from datetime import datetime, timezone
            return datetime.fromtimestamp(int(date.get('$numberLong', date))/1000, timezone.utc).isoformat()
        for kind in ('$numberInt', '$numberLong', '$numberDouble'):
            if kind in value: return float(value[kind]) if kind == '$numberDouble' else int(value[kind])
        return {k:normalize(v) for k,v in value.items()}
    if isinstance(value, list): return [normalize(v) for v in value]
    return value

class Command(BaseCommand):
    help = 'Import MongoDB mongoexport JSON files atomically; supports --dry-run.'
    def add_arguments(self, parser):
        parser.add_argument('directory', type=Path)
        parser.add_argument('--dry-run', action='store_true')
    def handle(self, *args, **options):
        self.directory = options['directory']
        if not self.directory.is_dir(): raise CommandError('Export directory does not exist')
        self.count = 0
        try:
            with transaction.atomic():
                self.import_all()
                if options['dry_run']: transaction.set_rollback(True)
        except Exception as exc:
            raise CommandError(f'Import failed; transaction rolled back: {exc}') from exc
        self.stdout.write(self.style.SUCCESS(f'Processed {self.count} records' + (' (dry run; rolled back)' if options['dry_run'] else '')))
    def rows(self, name):
        file = self.directory / (name + '.json')
        if not file.exists(): return []
        text = file.read_text(encoding='utf-8-sig').strip()
        if not text: return []
        rows = json.loads(text) if text.startswith('[') else [json.loads(line) for line in text.splitlines() if line.strip()]
        return normalize(rows)
    def save(self, model, row, mapping, **extra):
        data = {}
        fields = {f.name:f for f in model._meta.fields}
        for old,new in mapping.items():
            if old not in row: continue
            val = row[old]
            field = fields.get(new)
            if val is None and field and not field.null:
                val = '' if field.get_internal_type() in ('CharField','TextField','FileField') else field.get_default()
            if field and field.get_internal_type() == 'FileField' and isinstance(val, str):
                val = val.removeprefix('/uploads/')
            data[new] = val
        data.update(extra)
        key = {'pk':row['_id']} if model._meta.pk.get_internal_type() == 'CharField' else {'legacy_id':str(row['_id'])}
        obj, _ = model.objects.update_or_create(**key, defaults=data)
        dates = {}
        for old,new in {'createdAt':'created_at', 'updatedAt':'updated_at', 'enrolledAt':'enrolled_at', 'lastWatchedAt':'last_watched_at', 'grantedAt':'granted_at'}.items():
            if old in row and new in fields:
                dates[new] = row[old]
        if dates: model.objects.filter(pk=obj.pk).update(**dates)
        self.count += 1
        return obj
    def user(self, pk):
        return User.objects.get(legacy_id=str(pk)) if pk else None
    def session(self, pk):
        return CourseSession.objects.get(legacy_id=str(pk))
    def import_all(self):
        simple = {
            'categories':(Category,['title','short','type','desc','icon'],{}),
            'products':(Product,['name','short','type','desc','price','specs','image'],{}),
            'services':(Service,['title','short','type','desc','steps','benefits','features','image'],{}),
            'racks':(Rack,['name','capacity','terms','duration','equipment','specs','image'],{'priceNote':'price_note'}),
            'careers':(Career,['title','summary','description'],{'courseIds':'course_ids'}),
        }
        for collection,(model,names,aliases) in simple.items():
            for row in self.rows(collection): self.save(model,row,{**{n:n for n in names},**aliases})
        user_rows = self.rows('users')
        for row in user_rows:
            overrides = {p['courseId']:p['price'] for p in row.get('priceOverrides',[])}
            password = 'legacy_scrypt$'+row['passwordSalt']+'$'+row['passwordHash'] if row.get('passwordHash') and row.get('passwordSalt') else '!'
            existing = User.objects.filter(phone=row['phone']).first()
            if existing and existing.legacy_id not in (None,str(row['_id'])): raise ValueError('Conflicting user phone')
            data = {k:row.get(old,'') or '' for old,k in {'phone':'phone','fullname':'fullname','name':'name','role':'role','specialty':'specialty','teachingField':'teaching_field','bio':'bio','avatar':'avatar'}.items()}
            data.update(password=password, is_active=row.get('isActive',True), price_overrides=overrides, is_staff=row.get('role')=='admin', legacy_id=str(row['_id']))
            obj, _ = User.objects.update_or_create(phone=row['phone'],defaults=data)
            dates = {new:row[old] for old,new in {'createdAt':'created_at','updatedAt':'updated_at'}.items() if row.get(old)}
            if dates: User.objects.filter(pk=obj.pk).update(**dates)
            self.count += 1
        for row in self.rows('courses'):
            names=['title','teacher','duration','capacity','price','desc','type','level','audience','prerequisites','goals','skills','features']
            self.save(Course,row,{**{n:n for n in names},'category':'category_name','categoryId':'category_id','isActive':'is_active','classLink':'class_link'},teacher_user=self.user(row.get('teacherId')))
        for row in self.rows('coursesessions'):
            names=['title','description','duration','order']
            course=Course.objects.get(pk=row['courseId'])
            if not course.sessions.filter(legacy_id__isnull=False).exists(): course.sessions.filter(legacy_id__isnull=True).delete()
            row = dict(row)
            if row.get('videoFile') and '/' not in row['videoFile']:
                row['videoFile'] = f"courses/{course.pk}/{row['videoFile']}"
            self.save(CourseSession,row,{**{n:n for n in names},'isFree':'is_free','videoFile':'video_file','videoOriginalName':'video_original_name','videoSize':'video_size','videoMime':'video_mime','videoStatus':'video_status'},course=course,teacher=self.user(row.get('teacherId')))
        for row in self.rows('courses'):
            course=Course.objects.get(pk=row['_id'])
            if not course.sessions.filter(legacy_id__isnull=False).exists():
                course.sessions.filter(legacy_id__isnull=True).delete()
                for session in row.get('sessions',[]):
                    CourseSession.objects.update_or_create(legacy_id=f"{course.pk}:{session['id']}",defaults={'course':course,'title':session['title'],'duration':session.get('duration',''),'order':session.get('index',0),'is_free':not session.get('locked',True)})
        for row in self.rows('orders'):
            self.save(Order,row,{'sessionId':'session_id','phone':'phone','items':'items','amount':'amount','authority':'authority','refId':'ref_id','status':'status'})
        for row in self.rows('enrollments'):
            self.save(Enrollment,row,{'status':'status','expiresAt':'expires_at'},student=self.user(row['studentId']),course_id=row['courseId'],order=Order.objects.filter(legacy_id=str(row.get('orderId'))).first())
        for row in user_rows:
            for purchase in row.get('purchasedCourses',[]):
                Enrollment.objects.get_or_create(student=self.user(row['_id']),course_id=purchase['courseId'],status='active')
        for row in self.rows('sessionaccessgrants'):
            self.save(SessionAccessGrant,row,{},student=self.user(row['studentId']),course_id=row['courseId'],session=self.session(row['sessionId']),granted_by=self.user(row.get('grantedBy')))
        for row in self.rows('courseprogresses'):
            self.save(CourseProgress,row,{'watchedDuration':'watched_duration','completed':'completed'},student=self.user(row['studentId']),course_id=row['courseId'],session=self.session(row['sessionId']))
        for row in self.rows('courseannouncements'):
            self.save(CourseAnnouncement,row,{'title':'title','text':'text','announcementDate':'announcement_date','classLink':'class_link'},course_id=row['courseId'],teacher=self.user(row['teacherId']))
        for row in self.rows('coursequestions'):
            reply=row.get('reply') or {}
            self.save(CourseQuestion,row,{'type':'type','text':'text'},course_id=row['courseId'],student=self.user(row['studentId']),teacher=self.user(row['teacherId']),reply_text=reply.get('text',''),replied_at=reply.get('repliedAt'))
        for row in self.rows('rackrequests'):
            self.save(RackRequest,row,{**{n:n for n in ['name','phone','email','duration','notes','status']},'rackId':'rack_id','startDate':'start_date'})
        for row in self.rows('testimonials'):
            reply=row.get('reply') or {}
            self.save(Testimonial,row,{n:n for n in ['name','role','text','phone','approved']},reply_text=reply.get('text',''),replied_at=reply.get('repliedAt'))
