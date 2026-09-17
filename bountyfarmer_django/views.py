"""HTTP view handlers for bountyfarmer_django."""
from django.http import HttpRequest, HttpResponse, JsonResponse


def hello_world(request: HttpRequest) -> HttpResponse:
    """Return a plain text Hello World HTTP response."""
    return HttpResponse("Hello, World!")


def hello_world_json(request: HttpRequest) -> JsonResponse:
    """Return a structured JSON Hello World HTTP response."""
    return JsonResponse(
        {
            "message": "Hello, World!",
            "framework": "Django",
            "status": "success",
        }
    )
