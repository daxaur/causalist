import { Marquee } from "@/components/ui/marquee";

const CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

const LANGS: { name: string; path: string }[] = [
  { name: "TypeScript", path: "typescript/typescript-original.svg" },
  { name: "Python", path: "python/python-original.svg" },
  { name: "Rust", path: "rust/rust-original.svg" },
  { name: "Go", path: "go/go-original.svg" },
  { name: "React", path: "react/react-original.svg" },
  { name: "Next.js", path: "nextjs/nextjs-original.svg" },
  { name: "Vue", path: "vuejs/vuejs-original.svg" },
  { name: "Svelte", path: "svelte/svelte-original.svg" },
  { name: "Ruby", path: "ruby/ruby-original.svg" },
  { name: "Java", path: "java/java-original.svg" },
  { name: "Kotlin", path: "kotlin/kotlin-original.svg" },
  { name: "Swift", path: "swift/swift-original.svg" },
  { name: "C++", path: "cplusplus/cplusplus-original.svg" },
  { name: "C#", path: "csharp/csharp-original.svg" },
  { name: "Flask", path: "flask/flask-original.svg" },
  { name: "Django", path: "django/django-plain.svg" },
  { name: "Node.js", path: "nodejs/nodejs-original.svg" },
  { name: "Postgres", path: "postgresql/postgresql-original.svg" },
  { name: "Docker", path: "docker/docker-original.svg" },
];

export function LanguageMarquee() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
      <Marquee className="[--duration:60s]" pauseOnHover>
        {LANGS.map((lang) => (
          <div
            key={lang.name}
            className="flex h-12 w-12 items-center justify-center grayscale transition-all hover:grayscale-0"
            title={lang.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${CDN}/${lang.path}`}
              alt={lang.name}
              width={36}
              height={36}
              loading="lazy"
            />
          </div>
        ))}
      </Marquee>
    </div>
  );
}
