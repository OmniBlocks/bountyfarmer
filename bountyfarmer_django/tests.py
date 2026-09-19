"""Test suite for Django Hello World endpoints and WSGI/ASGI configurations."""
from django.test import Client, SimpleTestCase
from django.urls import reverse
from bountyfarmer_django.wsgi import application as wsgi_app
from bountyfarmer_django.asgi import application as asgi_app


class HelloWorldViewTests(SimpleTestCase):
    """Verify Hello World HTTP endpoints produce genuine Django responses."""

    def setUp(self) -> None:
        """Initialize the Django test client."""
        self.client = Client()

    def test_root_endpoint_returns_hello_world(self) -> None:
        """Ensure GET / returns 200 OK with Hello, World! content."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode("utf-8"), "Hello, World!")

    def test_named_hello_endpoint_returns_hello_world(self) -> None:
        """Ensure GET /hello/ returns 200 OK with Hello, World! content."""
        url = reverse("hello_world_alt")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode("utf-8"), "Hello, World!")

    def test_api_json_endpoint_returns_valid_payload(self) -> None:
        """Ensure GET /api/hello/ returns 200 OK with expected JSON structure."""
        url = reverse("hello_world_json")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/json")
        data = response.json()
        self.assertEqual(data.get("message"), "Hello, World!")
        self.assertEqual(data.get("framework"), "Django")
        self.assertEqual(data.get("status"), "success")

    def test_wsgi_application_callable(self) -> None:
        """Ensure the WSGI application object is callable."""
        self.assertTrue(callable(wsgi_app))

    def test_asgi_application_callable(self) -> None:
        """Ensure the ASGI application object is callable."""
        self.assertTrue(callable(asgi_app))
