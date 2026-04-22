import type { CausalGraph } from "../types";

// Hand-curated map of pallets/flask. Flask is small enough that this is
// close to complete for the core `flask/` package (ignoring tests + docs).
export const flaskGraph: CausalGraph = {
  repo: "pallets/flask",
  rootLabel: "flask",
  commit: "main",
  nodes: [
    // ── app entrypoints ───────────────────────────────────────────────
    { id: "app", label: "flask/app.py", path: "src/flask/app.py", layer: "api", language: "py", kind: "file", summary: "The Flask class. Entry point for all applications. Binds URL map, blueprints, view functions, CLI." },
    { id: "sansio-app", label: "flask/sansio/app.py", path: "src/flask/sansio/app.py", layer: "logic", language: "py", kind: "file", summary: "Framework-agnostic app base class. Sansio = 'no I/O' — protocol-level behavior without a transport." },
    { id: "blueprints", label: "flask/blueprints.py", path: "src/flask/blueprints.py", layer: "api", language: "py", kind: "file", summary: "Blueprint — deferred route registration object. Enables app factories and modular design." },
    { id: "sansio-bp", label: "flask/sansio/blueprints.py", path: "src/flask/sansio/blueprints.py", layer: "logic", language: "py", kind: "file" },
    { id: "scaffold", label: "flask/sansio/scaffold.py", path: "src/flask/sansio/scaffold.py", layer: "logic", language: "py", kind: "file", summary: "Common base for Flask and Blueprint — route decorators, error handlers, template folders." },

    // ── request/response + ctx ────────────────────────────────────────
    { id: "wrappers", label: "flask/wrappers.py", path: "src/flask/wrappers.py", layer: "api", language: "py", kind: "file", summary: "Request + Response wrappers extending Werkzeug's." },
    { id: "ctx", label: "flask/ctx.py", path: "src/flask/ctx.py", layer: "logic", language: "py", kind: "file", summary: "AppContext + RequestContext. The famous 'push/pop' context stacks." },
    { id: "globals", label: "flask/globals.py", path: "src/flask/globals.py", layer: "data", language: "py", kind: "file", summary: "The `g`, `session`, `request`, `current_app` proxies bound to contextvars." },

    // ── routing ───────────────────────────────────────────────────────
    { id: "typing-routing", label: "flask/typing.py", path: "src/flask/typing.py", layer: "config", language: "py", kind: "file" },

    // ── templating ────────────────────────────────────────────────────
    { id: "templating", label: "flask/templating.py", path: "src/flask/templating.py", layer: "ui", language: "py", kind: "file", summary: "Jinja integration — render_template, render_template_string, environment setup." },

    // ── sessions + config ─────────────────────────────────────────────
    { id: "sessions", label: "flask/sessions.py", path: "src/flask/sessions.py", layer: "data", language: "py", kind: "file", summary: "Itsdangerous-signed cookie sessions. SecureCookieSessionInterface." },
    { id: "config", label: "flask/config.py", path: "src/flask/config.py", layer: "config", language: "py", kind: "file", summary: "Config dict with from_object / from_pyfile / from_envvar." },

    // ── helpers + signals ─────────────────────────────────────────────
    { id: "helpers", label: "flask/helpers.py", path: "src/flask/helpers.py", layer: "api", language: "py", kind: "file", summary: "url_for, send_file, send_from_directory, flash, abort, redirect." },
    { id: "signals", label: "flask/signals.py", path: "src/flask/signals.py", layer: "api", language: "py", kind: "file", summary: "Blinker-powered request/teardown signals." },

    // ── json + errors ─────────────────────────────────────────────────
    { id: "json-init", label: "flask/json/__init__.py", path: "src/flask/json/__init__.py", layer: "data", language: "py", kind: "file", summary: "jsonify + module-level JSON helpers." },
    { id: "json-provider", label: "flask/json/provider.py", path: "src/flask/json/provider.py", layer: "data", language: "py", kind: "file", summary: "Pluggable JSON serializer (default: DefaultJSONProvider)." },
    { id: "json-tag", label: "flask/json/tag.py", path: "src/flask/json/tag.py", layer: "data", language: "py", kind: "file" },

    // ── CLI ───────────────────────────────────────────────────────────
    { id: "cli", label: "flask/cli.py", path: "src/flask/cli.py", layer: "api", language: "py", kind: "file", summary: "The `flask run / flask shell / flask routes` CLI. Click-based." },

    // ── views + debug ─────────────────────────────────────────────────
    { id: "views", label: "flask/views.py", path: "src/flask/views.py", layer: "api", language: "py", kind: "file", summary: "MethodView and View class-based views." },
    { id: "debughelpers", label: "flask/debughelpers.py", path: "src/flask/debughelpers.py", layer: "test", language: "py", kind: "file" },

    // ── tests ─────────────────────────────────────────────────────────
    { id: "testing", label: "flask/testing.py", path: "src/flask/testing.py", layer: "test", language: "py", kind: "file", summary: "FlaskClient + FlaskCliRunner for integration tests." },

    // ── externals ────────────────────────────────────────────────────
    { id: "werkzeug", label: "werkzeug", layer: "infra", language: "py", kind: "external", summary: "WSGI toolkit. Flask is a thin layer on top." },
    { id: "jinja", label: "jinja2", layer: "infra", language: "py", kind: "external", summary: "Template engine." },
    { id: "itsdangerous", label: "itsdangerous", layer: "infra", language: "py", kind: "external", summary: "Signed token/cookie utility — powers secure sessions." },
    { id: "click", label: "click", layer: "infra", language: "py", kind: "external", summary: "CLI framework." },
    { id: "blinker", label: "blinker", layer: "infra", language: "py", kind: "external", summary: "Signal dispatch library." },
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
