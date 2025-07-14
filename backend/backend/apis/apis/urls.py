"""
URL configuration for apis project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# apis/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def home(request):
    return HttpResponse("<h1>YOLOv8 Image Classification API</h1>")

urlpatterns = [
    path('', home),                            # Root path
    path('admin/', admin.site.urls),           # Admin panel
    path('api/', include('img_classification.urls')), # Include app urls
    path('api/chatbot/', include('chatbot.urls')),  # Include chatbot app URLs
]

