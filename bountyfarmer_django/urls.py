"""URL configuration for bountyfarmer_django project."""
from django.urls import path
from bountyfarmer_django.views import hello_world, hello_world_json

urlpatterns = [
    path("", hello_world, name="hello_world"),
    path("hello/", hello_world, name="hello_world_alt"),
    path("api/hello/", hello_world_json, name="hello_world_json"),
]
