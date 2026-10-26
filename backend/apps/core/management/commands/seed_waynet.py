import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.courses.models import Category, Course, CourseSession, Career
from apps.catalog.models import Service, Product, Rack

class Command(BaseCommand):
    help = 'Load original public catalog; never overwrite existing records.'
    @transaction.atomic
    def handle(self, *args, **options):
        data = json.loads((Path(__file__).resolve().parents[2] / 'seed_data.json').read_text(encoding='utf-8'))
        for row in data['categories']:
            row = dict(row); pk = row.pop('id')
            Category.objects.get_or_create(pk=pk, defaults=row)
        for row in data['courses']:
            row = dict(row); pk = row.pop('id'); sessions = row.pop('sessions', [])
            row['category_id'] = row.pop('categoryId'); row['category_name'] = row.pop('category')
            obj, created = Course.objects.get_or_create(pk=pk, defaults=row)
            if created:
                for s in sessions:
                    CourseSession.objects.create(course=obj, title=s['title'], duration=s['duration'], order=s['index'], is_free=not s['locked'])
        for key, model in [('careers', Career), ('services', Service), ('products', Product), ('racks', Rack)]:
            for row in data[key]:
                row = dict(row); pk = row.pop('id')
                if 'courseIds' in row: row['course_ids'] = row.pop('courseIds')
                if 'priceNote' in row: row['price_note'] = row.pop('priceNote')
                model.objects.get_or_create(pk=pk, defaults=row)
        self.stdout.write(self.style.SUCCESS('Original catalog loaded.'))
