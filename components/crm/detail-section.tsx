import type { ReactNode } from "react";
export function DetailSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) { return <section className="rounded-3xl border bg-background shadow-sm"><div className="flex items-center justify-between gap-3 border-b px-5 py-4"><h2 className="font-semibold">{title}</h2>{action}</div><div className="p-5">{children}</div></section>; }
export function EmptyRelationship({ children }: { children: ReactNode }) { return <p className="text-sm text-muted-foreground">{children}</p>; }
