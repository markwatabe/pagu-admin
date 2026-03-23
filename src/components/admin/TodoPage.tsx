interface Props {
  title: string;
  description: string;
  icon: string;
  tasks: string[];
}

export default function TodoPage({ title, description, icon, tasks }: Props) {
  return (
    <div className="mx-auto max-w-2xl py-16 px-6 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-4xl">
        {icon}
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
      <p className="mt-4 text-gray-500">{description}</p>

      <div className="mt-10 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-8 text-left">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-indigo-500">TODO</p>
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task} className="flex items-start gap-3">
              <span className="mt-1 h-4 w-4 shrink-0 rounded border-2 border-indigo-300" />
              <span className="text-gray-700">{task}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-sm text-gray-400 italic">This page is not yet implemented.</p>
    </div>
  );
}
