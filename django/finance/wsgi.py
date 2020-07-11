"""
WSGI config for finance project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/howto/deployment/wsgi/
"""

python_home = '/var/www/django/finance/finance-env'

import sys
import site

python_version = '.'.join(map(str, sys.version_info[:2]))
site_packages = python_home + '/lib/python%s/site-packages' % python_version
site.addsitedir(site_packages)

import os
from django.core.wsgi import get_wsgi_application

path = u"/var/www/django/finance/finance"

if path not in sys.path:
	sys.path.append(path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'finance.settings'

application = get_wsgi_application()
