import Link from "next/link";

/** "Home / My Account / {current}" breadcrumb shared across account subpages. */
export default function AccountBreadcrumb({ current }: { current?: string }) {
  return (
    <nav className="mb-6 flex items-center gap-1.5 text-xs text-foreground-muted">
      <Link href="/" className="hover:text-foreground">
        Home
      </Link>
      <span className="text-foreground-muted/40">/</span>
      {current ? (
        <Link href="/account" className="hover:text-foreground">
          My Account
        </Link>
      ) : (
        <span className="font-medium text-foreground">My Account</span>
      )}
      {current && (
        <>
          <span className="text-foreground-muted/40">/</span>
          <span className="font-medium text-foreground">{current}</span>
        </>
      )}
    </nav>
  );
}
