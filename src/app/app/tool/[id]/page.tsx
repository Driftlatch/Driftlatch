import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LIBRARY } from "@/lib/toolLibrary";
import ToolClient from "./ToolClient";

export const runtime = "edge";

type RouteParams = { id: string };

export default async function Page({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const resolvedParams = await params;

  const tool = LIBRARY.tools.find((item) => item.id === resolvedParams.id);

  if (!tool) return notFound();

  return (
    <Suspense fallback={null}>
      <ToolClient tool={tool} />
    </Suspense>
  );
}
