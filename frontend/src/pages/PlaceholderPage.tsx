import { Compass } from 'lucide-react';

export default function PlaceholderPage({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="max-w-[1400px] px-7 pb-10 pt-5">
      <div className="mt-4 flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-line px-5 py-16 text-center text-muted">
        <Compass size={26} />
        <h2 className="m-0 mt-1.5 text-[17px] text-ink">{title}</h2>
        <p className="m-0 max-w-[420px] text-[13.5px]">{copy}</p>
      </div>
    </div>
  );
}
