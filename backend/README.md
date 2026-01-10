## Prerequisites

- Have Python installed

## 1. Create Venv

- Navigate to `backend` folder.
- Type `$ python -m venv venv` on console.

#### On windows powershell,

- Type `$ .\venv\Scripts\activate` to activate virtual environment

#### On Linux

- Type `$ source venv/bin/activate` to activate virtual environment

## 2. Install Requirements

- _After activating venv_ install requirements by `$ pip install -r requirements.txt`

## 3. Migrate the models

- Type `$ python manage.py migrate`

## 4. Run the Backend Tests

The API layer has several integration-style tests implemented under `api/tests.py`.

- Run all tests for the `api` app:

	```bash
	# from backend/
	./venv/bin/python manage.py test api
	```

- See individual test names and classes (more verbose output):

	```bash
	./venv/bin/python manage.py test api --verbosity 2
	```

During tests, Django is configured to use a local SQLite database (see `core/settings.py`),
so your production/development PostgreSQL database is not touched.

Currently covered scenarios include:

- `/api/search/` input validation (rejecting empty abstracts/keywords) and response shape
	verification with the heavy semantic search pipeline mocked.
- `/api/openalex-keyword-search/` happy-path behavior and the requirement to provide at
	least one keyword.
- Basic subscription flow: create subscription via `/api/subscribe-search/`, verify it via
	`/api/subscribe-search/verify/<token>/`, and then fetch details from
	`/api/subscriptions/<id>/`.

## 5. Run the App

- Type `$ python manage.py runserver`

