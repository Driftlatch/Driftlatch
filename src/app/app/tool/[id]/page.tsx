import { notFound } from "next/navigation";
import { LIBRARY } from "@/lib/toolLibrary";
import ToolClient from "./ToolClient";

export const runtime = "edge";

type RouteParams = { id: string };

export default async function Page({
  params,
}: {
  params: RouteParams | Promise<RouteParams>;
}) {
  const resolvedParams: RouteParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<RouteParams>)
      : (params as RouteParams);

  const tool = LIBRARY.tools.find((item) => item.id === resolvedParams.id);

  if (!tool) return notFound();

  return <ToolClient tool={tool} />;
}
