import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '../store/workflowStore';
import { useCreateWorkflow } from '../api/query';
import { buildTemplateCanvas, templates } from '../templates/templates';

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
    <div className="max-w-[1200px] px-7 pt-6 pb-10">
      <h1 className="text-xl font-[650]">Explore</h1>
      <p className="mt-1.5 mb-5 text-sm text-muted">
        Start from a working automation. Each template opens a prebuilt canvas you can edit and run.
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3.5">
        {templates.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <div
              className="flex flex-col gap-2.5 rounded-xl border border-line bg-panel p-[18px] transition-colors hover:border-faint"
              key={tpl.id}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-[10px] text-white"
                style={{ background: tpl.color }}
              >
                <Icon size={20} />
              </span>
              <h2 className="text-[15.5px] font-semibold">{tpl.name}</h2>
              <p className="flex-1 text-[13px] leading-[1.55] text-muted">{tpl.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {tpl.tags.map((t) => (
                  <span
                    className="rounded-full border border-line bg-panel-2 px-[9px] py-[3px] text-[11.5px] text-muted"
                    key={t}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                disabled={create.isPending}
                onClick={() => applyTemplate(tpl.id)}
                className="mt-1 h-auto gap-[7px] self-start rounded-lg border-brand px-3.5 py-[7px] text-[13.5px] font-semibold text-brand shadow-none hover:bg-lime-400/10 hover:text-brand [&_svg]:size-3.5"
              >
                Use template <ArrowRight size={14} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
