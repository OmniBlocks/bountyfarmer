# bountyfarmer

Automated bounty operations and demonstration repository.

## Django Hello World (Issue #18)

A genuine, full-stack Django Hello World implementation integrated into the repository.

### Features
- Complete Django project structure (bountyfarmer_django) with settings, URLs, views, WSGI, and ASGI applications.
- Plain text endpoint (/ and /hello/) returning Hello, World!.
- Structured JSON API endpoint (/api/hello/) returning JSON payload with framework details.
- Zero-dependency standalone runner (hello_django.py) for instantaneous verification.
- Unit and integration test suite via bountyfarmer_django/tests.py testing endpoints and application objects.
- Node.js bridge entrypoint (index.js) and regression tests (test/issue_18.test.js).

### Prerequisites
- Python 3.10+
- Django (pip install -r requirements.txt)
- Node.js 18+

### Quickstart

#### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 2. Run the Development Server
```bash
python3 manage.py runserver 8000
```
Visit http://127.0.0.1:8000/ in your browser.

#### 3. Run Standalone Script
```bash
python3 hello_django.py
```

#### 4. Run Node.js Runner
```bash
node index.js
```

### Running Tests

#### Django Test Suite
```bash
python3 manage.py test bountyfarmer_django
```

#### Node.js Test Suite
```bash
node test/issue_18.test.js
```
