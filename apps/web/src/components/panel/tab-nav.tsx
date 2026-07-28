import Link from "next/link";

interface TabDef {
  key: string;
  label: string;
  count?: number;
}

export function TabNav({
  tabs,
  activeTab,
  baseHref,
  ariaLabel = "Secciones del contrato",
}: {
  tabs: TabDef[];
  activeTab: string;
  baseHref: string;
  ariaLabel?: string;
}) {
  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      className="mb-6 flex flex-wrap gap-1 rounded-xl p-1"
      style={{ background: "var(--hw-border)" }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={`${baseHref}?tab=${tab.key}`}
            role="tab"
            aria-selected={isActive}
            className="relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: isActive ? "var(--hw-surface)" : "transparent",
              // --hw-text-1 (texto primario) flipea con el tema y contrasta sobre
              // --hw-surface en dark y light. Antes usaba --hw-sidebar (un token de
              // FONDO oscuro) que en dark daba texto oscuro sobre surface oscuro.
              color: isActive ? "var(--hw-text-1)" : "var(--hw-text-3)",
              boxShadow: isActive ? "var(--hw-shadow-1)" : "none",
              textDecoration: "none",
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                aria-label={`${tab.count} elementos`}
                className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs font-bold"
                style={{
                  background: isActive ? "var(--hw-primary-lt)" : "rgba(100,116,139,0.15)",
                  color: isActive ? "var(--hw-primary)" : "var(--hw-text-3)",
                }}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
