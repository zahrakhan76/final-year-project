# img_classification/urls.py
from django.urls import path
from .views import classify_image

urlpatterns = [
    path('classify/', classify_image, name='image_classification')
]
