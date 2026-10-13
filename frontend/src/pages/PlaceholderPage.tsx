import { Compass } from 'lucide-react';
import './dashboard.css';

export default function PlaceholderPage({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="ff-dash">
      <div className="ff-empty">
        <Compass size={26} />
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  );
}
