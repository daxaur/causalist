import type { CausalGraph } from "../types";

// Hand-curated map of pallets/flask. Flask is small enough that this is
// close to complete for the core `flask/` package (ignoring tests + docs).
export const flaskGraph: CausalGraph = {
  repo: "pallets/flask",
  rootLabel: "flask",
  commit: "main",
  nodes: [
    // ── app entrypoints ───────────────────────────────────────────────
    { id: "app", label: "flask/app.py", path: "src/flask/app.py", layer: "api", language: "py", kind: "file", summary: "The concrete `Flask` class most users import as `from flask import Flask`. Adds WSGI behavior (the `__call__` / `wsgi_app` entry point, context push/pop, request dispatching) on top of the sansio base and wires in sessions, JSON, CLI, and the test client." },
    { id: "sansio-app", label: "flask/sansio/app.py", path: "src/flask/sansio/app.py", layer: "logic", language: "py", kind: "file", summary: "Transport-free base class holding everything Flask does before I/O — URL map construction, blueprint registration, error-handler dispatch logic, config. 'Sansio' means no sockets or WSGI touched here; keeps the core testable in isolation." },
    { id: "blueprints", label: "flask/blueprints.py", path: "src/flask/blueprints.py", layer: "api", language: "py", kind: "file", summary: "The concrete `Blueprint` class users instantiate for modular apps. Adds the WSGI-aware pieces on top of the sansio blueprint; its `@bp.route` decorators queue up deferred operations that fire when `app.register_blueprint` is called." },
    { id: "sansio-bp", label: "flask/sansio/blueprints.py", path: "src/flask/sansio/blueprints.py", layer: "logic", language: "py", kind: "file", summary: "Transport-free blueprint base — shares decorator APIs and deferred-registration bookkeeping with the concrete Blueprint. Holds the `record`/`record_once` queue that the app replays when registering." },
    { id: "scaffold", label: "flask/sansio/scaffold.py", path: "src/flask/sansio/scaffold.py", layer: "logic", language: "py", kind: "file", summary: "The common ancestor of both Flask and Blueprint. Centralizes route/error-handler decorators, template folder resolution, static file paths, and the `before_request`/`after_request` hook registries so both classes behave identically where it matters." },

    // ── request/response + ctx ────────────────────────────────────────
    { id: "wrappers", label: "flask/wrappers.py", path: "src/flask/wrappers.py", layer: "api", language: "py", kind: "file", summary: "Flask's `Request` and `Response` subclasses. They inherit almost everything from Werkzeug and only override bits that need Flask-awareness — JSON config hooks on Request, default mimetype and session-saving behavior on Response." },
    { id: "ctx", label: "flask/ctx.py", path: "src/flask/ctx.py", layer: "logic", language: "py", kind: "file", summary: "The `AppContext` and `RequestContext` classes — the famous push/pop stacks that make `current_app` and `request` work. `wsgi_app` pushes a RequestContext on entry and pops it (running teardown callbacks) on exit, even if an exception propagates." },
    { id: "globals", label: "flask/globals.py", path: "src/flask/globals.py", layer: "data", language: "py", kind: "file", summary: "Defines the `current_app`, `request`, `session`, and `g` proxies. As of Flask 3.x these are `LocalProxy` objects backed by `contextvars.ContextVar`, so they're asyncio-safe and don't leak across tasks." },

    // ── routing ───────────────────────────────────────────────────────
    { id: "typing-routing", label: "flask/typing.py", path: "src/flask/typing.py", layer: "config", language: "py", kind: "file", summary: "Central typing aliases used across the codebase — `ResponseReturnValue`, `ViewCallable`, `RouteCallable`, `BeforeRequestCallable`, etc. Pure type hints, no runtime logic." },

    // ── templating ────────────────────────────────────────────────────
    { id: "templating", label: "flask/templating.py", path: "src/flask/templating.py", layer: "ui", language: "py", kind: "file", summary: "Jinja2 integration layer. Builds the `Environment` with Flask-aware loaders, injects `url_for`/`get_flashed_messages`/`g`/`session`/`request` into every template's context, and exposes `render_template` + `render_template_string` + `stream_template` as the public API." },

    // ── sessions + config ─────────────────────────────────────────────
    { id: "sessions", label: "flask/sessions.py", path: "src/flask/sessions.py", layer: "data", language: "py", kind: "file", summary: "Session implementations. `SecureCookieSessionInterface` is the default — serializes the session dict, signs it with itsdangerous using `SECRET_KEY`, and stores it in a single cookie. Subclass `SessionInterface` to back sessions with Redis or a DB instead." },
    { id: "config", label: "flask/config.py", path: "src/flask/config.py", layer: "config", language: "py", kind: "file", summary: "The `Config` dict subclass attached to `app.config`. Adds `from_object`, `from_pyfile`, `from_envvar`, `from_mapping`, and `from_prefixed_env` so settings can come from Python modules, files, or env vars with a shared prefix." },

    // ── helpers + signals ─────────────────────────────────────────────
    { id: "helpers", label: "flask/helpers.py", path: "src/flask/helpers.py", layer: "api", language: "py", kind: "file", summary: "The grab-bag of top-level utilities users import directly: `url_for`, `redirect`, `abort`, `flash`, `get_flashed_messages`, `send_file`, `send_from_directory`, plus `stream_with_context`. Most of them read the current `request`/`current_app` proxies to do their work." },
    { id: "signals", label: "flask/signals.py", path: "src/flask/signals.py", layer: "api", language: "py", kind: "file", summary: "Declares the framework's blinker signals — `request_started`, `request_finished`, `got_request_exception`, `template_rendered`, `appcontext_pushed`, etc. Other modules import these and call `.send(app, ...)` at the right lifecycle points." },

    // ── json + errors ─────────────────────────────────────────────────
    { id: "json-init", label: "flask/json/__init__.py", path: "src/flask/json/__init__.py", layer: "data", language: "py", kind: "file", summary: "Top-level JSON facade. Exposes `jsonify`, `dumps`, `dump`, `loads`, `load` — all of which delegate to whichever `JSONProvider` the current app has configured, so swapping to orjson is a one-line change." },
    { id: "json-provider", label: "flask/json/provider.py", path: "src/flask/json/provider.py", layer: "data", language: "py", kind: "file", summary: "The `JSONProvider` abstract interface and the stdlib-based `DefaultJSONProvider`. Extending this class and setting `app.json = MyProvider(app)` is the canonical way to change how Flask encodes and decodes JSON." },
    { id: "json-tag", label: "flask/json/tag.py", path: "src/flask/json/tag.py", layer: "data", language: "py", kind: "file", summary: "A tagged-JSON serializer that can round-trip Python types JSON can't represent natively — tuple, set, bytes, datetime, UUID, Markup. Used primarily by the session cookie serializer." },

    // ── CLI ───────────────────────────────────────────────────────────
    { id: "cli", label: "flask/cli.py", path: "src/flask/cli.py", layer: "api", language: "py", kind: "file", summary: "The `flask` command-line entry point — implements `run`, `shell`, `routes`, and user-defined commands. Built on Click; resolves the target app via `FLASK_APP` / `--app` and supports loading dotenv files automatically." },

    // ── views + debug ─────────────────────────────────────────────────
    { id: "views", label: "flask/views.py", path: "src/flask/views.py", layer: "api", language: "py", kind: "file", summary: "Class-based view support — the generic `View` plus `MethodView`, which dispatches to `get`/`post`/`put`/... based on the request method. `as_view()` turns the class into a regular view callable Flask's router can register." },
    { id: "debughelpers", label: "flask/debughelpers.py", path: "src/flask/debughelpers.py", layer: "test", language: "py", kind: "file", summary: "Debug-mode ergonomics — produces helpful errors for common misconfigurations like duplicate endpoints, missing template folders, or passing a form where JSON was expected. Only active when `app.debug` is true." },

    // ── tests ─────────────────────────────────────────────────────────
    { id: "testing", label: "flask/testing.py", path: "src/flask/testing.py", layer: "test", language: "py", kind: "file", summary: "`FlaskClient` (a Werkzeug test client wired to push app/request contexts) and `FlaskCliRunner` (a Click test runner that knows about the Flask app). What `app.test_client()` and `app.test_cli_runner()` return." },

    // ── externals ────────────────────────────────────────────────────
    { id: "werkzeug", label: "werkzeug", layer: "infra", language: "py", kind: "external", summary: "The WSGI toolkit Flask is built on. Provides the routing (`Map` + `Rule`), Request/Response base classes, HTTP exceptions, and the dev server — Flask is genuinely a thin layer on top." },
    { id: "jinja", label: "jinja2", layer: "infra", language: "py", kind: "external", summary: "The template engine powering `render_template` and `render_template_string`. Flask preconfigures a Jinja `Environment` wired to its loader system and context processors." },
    { id: "itsdangerous", label: "itsdangerous", layer: "infra", language: "py", kind: "external", summary: "Cryptographically signs values so they can ride in cookies without being tampered with. `SecureCookieSessionInterface` uses it to sign the session payload with `SECRET_KEY`." },
    { id: "click", label: "click", layer: "infra", language: "py", kind: "external", summary: "The command-line framework underneath `flask/cli.py`. Every `@app.cli.command` decorator is literally a Click command registered into Flask's `AppGroup`." },
    { id: "blinker", label: "blinker", layer: "infra", language: "py", kind: "external", summary: "In-process signal/event dispatch. Flask uses it for all the `request_started` / `template_rendered` / `appcontext_pushed` lifecycle events declared in `flask/signals.py`." },
  ],
  edges: [
    // app ↔ sansio base
    { source: "app", target: "sansio-app", kind: "extends" },
    { source: "sansio-app", target: "scaffold", kind: "extends" },
    { source: "blueprints", target: "sansio-bp", kind: "extends" },
    { source: "sansio-bp", target: "scaffold", kind: "extends" },

    // app wires everything
    { source: "app", target: "wrappers", kind: "imports" },
    { source: "app", target: "ctx", kind: "imports" },
    { source: "app", target: "globals", kind: "imports" },
    { source: "app", target: "templating", kind: "imports" },
    { source: "app", target: "sessions", kind: "imports" },
    { source: "app", target: "config", kind: "imports" },
    { source: "app", target: "helpers", kind: "imports" },
    { source: "app", target: "signals", kind: "imports" },
    { source: "app", target: "json-init", kind: "imports" },
    { source: "app", target: "cli", kind: "imports" },
    { source: "app", target: "views", kind: "imports" },
    { source: "app", target: "werkzeug", kind: "calls" },

    // ctx + globals
    { source: "ctx", target: "globals", kind: "writes" },
    { source: "ctx", target: "wrappers", kind: "reads" },
    { source: "globals", target: "ctx", kind: "reads" },

    // templating
    { source: "templating", target: "jinja", kind: "calls" },
    { source: "templating", target: "globals", kind: "reads" },
    { source: "templating", target: "signals", kind: "writes" },

    // sessions
    { source: "sessions", target: "itsdangerous", kind: "calls" },
    { source: "sessions", target: "wrappers", kind: "reads" },

    // helpers + signals
    { source: "helpers", target: "globals", kind: "reads" },
    { source: "helpers", target: "wrappers", kind: "calls" },
    { source: "signals", target: "blinker", kind: "calls" },

    // json
    { source: "json-init", target: "json-provider", kind: "imports" },
    { source: "json-init", target: "json-tag", kind: "imports" },

    // cli
    { source: "cli", target: "click", kind: "calls" },
    { source: "cli", target: "app", kind: "reads" },
    { source: "cli", target: "config", kind: "reads" },

    // views
    { source: "views", target: "globals", kind: "reads" },
    { source: "views", target: "wrappers", kind: "calls" },

    // testing
    { source: "testing", target: "app", kind: "calls" },
    { source: "testing", target: "werkzeug", kind: "calls" },

    // external wiring
    { source: "wrappers", target: "werkzeug", kind: "extends" },
  ],
};
