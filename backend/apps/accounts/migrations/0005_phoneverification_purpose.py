from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_phoneverification'),
    ]

    operations = [
        migrations.AddField(
            model_name='phoneverification',
            name='purpose',
            field=models.CharField(default='register', max_length=16),
        ),
        migrations.AlterField(
            model_name='phoneverification',
            name='phone',
            field=models.CharField(max_length=32),
        ),
        migrations.AlterUniqueTogether(
            name='phoneverification',
            unique_together={('phone', 'purpose')},
        ),
    ]
