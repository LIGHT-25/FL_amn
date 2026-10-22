import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../store/workflowStore';
import { useCreateWorkflow } from '../api/query';
import { buildTemplateCanvas, templates } from '../templates/templates';
import './explore.css';

export default function Explore() {
  const navigate = useNavigate();
  const seedCanvas = useWorkflowStore((s) => s.seedCanvas);
  const create = useCreateWorkflow();

  const applyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    create.mutate(tpl.name, {
      onSuccess: (wf) => {
        seedCanvas(wf.id, buildTemplateCanvas(tpl));
        navigate(`/app/editor/${wf.id}`);
      },
    });
  };

  return (
    <div className="ff-explore">
      <h1>Explore</h1>
      <p>Start from a working automation. Each template opens a prebuilt canvas you can edit and run.</p>
      <div className="ff-tpl-grid">
        {templates.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <div className="ff-tpl-card" key={tpl.id}>
              <span className="ff-tpl-icon" style={{ background: tpl.color }}>
                <Icon size={20} />
              </span>
              <h2>{tpl.name}</h2>
              <p>{tpl.description}</p>
              <div className="ff-tpl-tags">
                {tpl.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <button className="ff-tpl-use" disabled={create.isPending} onClick={() => applyTemplate(tpl.id)}>
                Use template <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
