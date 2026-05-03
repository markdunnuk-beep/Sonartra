import Link from 'next/link';

type LibraryBreadcrumbItem = {
  label: string;
  href?: string;
};

export function LibraryBreadcrumbs({ items }: { items: readonly LibraryBreadcrumbItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-[0.14em]">
      <ol className="flex flex-wrap items-center gap-2 text-[#D8D0C3]/56">
        {items.map((item, index) => (
          <li className="flex items-center gap-2" key={`${item.label}-${index}`}>
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link
                className="text-[#32D6B0] transition hover:text-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-[#D8D0C3]/62">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
