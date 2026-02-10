import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo.png"
            alt="Fanflet"
            width={48}
            height={48}
            className="w-12 h-12"
          />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          This Fanflet doesn&apos;t exist or isn&apos;t published yet
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          The link may have expired, or the speaker hasn&apos;t shared this page
          yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-[#1B365D] hover:bg-[#152b4d] text-white font-semibold text-sm h-10 px-6 transition-colors"
        >
          Back to Fanflet
        </Link>
      </div>
    </div>
  );
}
