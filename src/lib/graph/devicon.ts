const CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

const EXT_TO_ICON: Record<string, string> = {
  ts: "typescript/typescript-original.svg",
  tsx: "typescript/typescript-original.svg",
  js: "javascript/javascript-original.svg",
  jsx: "javascript/javascript-original.svg",
  py: "python/python-original.svg",
  rs: "rust/rust-original.svg",
  go: "go/go-original.svg",
  rb: "ruby/ruby-original.svg",
  java: "java/java-original.svg",
  kt: "kotlin/kotlin-original.svg",
  swift: "swift/swift-original.svg",
  cpp: "cplusplus/cplusplus-original.svg",
  cc: "cplusplus/cplusplus-original.svg",
  c: "c/c-original.svg",
  cs: "csharp/csharp-original.svg",
  php: "php/php-original.svg",
  css: "css3/css3-original.svg",
  scss: "sass/sass-original.svg",
  html: "html5/html5-original.svg",
  json: "json/json-original.svg",
  md: "markdown/markdown-original.svg",
  sh: "bash/bash-original.svg",
  yml: "yaml/yaml-original.svg",
  yaml: "yaml/yaml-original.svg",
  sql: "postgresql/postgresql-original.svg",
};

const FRAMEWORK_ICONS: Record<string, string> = {
  react: "react/react-original.svg",
  nextjs: "nextjs/nextjs-original.svg",
  vue: "vuejs/vuejs-original.svg",
  svelte: "svelte/svelte-original.svg",
  angular: "angular/angular-original.svg",
  django: "django/django-plain.svg",
  flask: "flask/flask-original.svg",
  express: "express/express-original.svg",
  nodejs: "nodejs/nodejs-original.svg",
  tailwind: "tailwindcss/tailwindcss-original.svg",
  tailwindcss: "tailwindcss/tailwindcss-original.svg",
  docker: "docker/docker-original.svg",
  kubernetes: "kubernetes/kubernetes-original.svg",
  postgres: "postgresql/postgresql-original.svg",
  redis: "redis/redis-original.svg",
  github: "github/github-original.svg",
  vercel: "vercel/vercel-original.svg",
  supabase: "supabase/supabase-original.svg",
  anthropic: "anthropic/anthropic-original.svg",
};

export function iconUrlForLanguage(language?: string): string | null {
  if (!language) return null;
  const key = language.toLowerCase();
  const frameworkPath = FRAMEWORK_ICONS[key];
  if (frameworkPath) return `${CDN}/${frameworkPath}`;
  const extPath = EXT_TO_ICON[key];
  if (extPath) return `${CDN}/${extPath}`;
  return null;
}

export function iconUrlForPath(path?: string): string | null {
  if (!path) return null;
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  const extPath = EXT_TO_ICON[ext];
  return extPath ? `${CDN}/${extPath}` : null;
}
