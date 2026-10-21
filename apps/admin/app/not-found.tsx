import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-900">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-500 mb-4">Could not find requested resource</p>
      <Link href="/" className="px-4 py-2 bg-[#03045E] text-white rounded-lg text-sm font-semibold">
        Return Home
      </Link>
    </div>
  );
}
