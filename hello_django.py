#!/usr/bin/env python3
"""Standalone executable script running Django Hello World."""
import os
import sys


def run_standalone() -> None:
    """Configure Django in-memory and dispatch an internal request to verify Hello World."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bountyfarmer_django.settings")
    import django

    django.setup()
    from django.test import RequestFactory
    from bountyfarmer_django.views import hello_world, hello_world_json

    factory = RequestFactory()

    text_request = factory.get("/")
    text_response = hello_world(text_request)

    json_request = factory.get("/api/hello/")
    json_response = hello_world_json(json_request)

    print(f"Django Status: {text_response.status_code}")
    print(f"Django Plain Response: {text_response.content.decode('utf-8')}")
    print(f"Django JSON Response: {json_response.content.decode('utf-8')}")


def main() -> None:
    """Entrypoint for standalone Django runner."""
    if len(sys.argv) > 1 and sys.argv[1] == "--serve":
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bountyfarmer_django.settings")
        from django.core.management import execute_from_command_line

        execute_from_command_line([sys.argv[0], "runserver", "8000"])
    else:
        run_standalone()


if __name__ == "__main__":
    main()
