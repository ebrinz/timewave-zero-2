import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="grid place-items-center h-full">
      <div className="text-center space-y-3">
        <p className="phosphor-glow">ERR · 404 · ROUTE NOT FOUND</p>
        <p className="text-[var(--tw-dim)]">The address you entered does not exist in this build.</p>
        <Link href="/" className="underline">[ RETURN TO CHART ]</Link>
      </div>
    </div>
  );
}
