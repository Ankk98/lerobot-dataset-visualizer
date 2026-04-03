import EpisodeViewer from "./episode-viewer";
import { getEpisodeDataSafe } from "./fetch-data";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string; dataset: string; episode: string }>;
}) {
  const { org, dataset, episode } = await params;
  return {
    title: `${org}/${dataset} | episode ${episode}`,
  };
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ org: string; dataset: string; episode: string }>;
}) {
  // episode is like 'episode_1'
  const { org, dataset, episode } = await params;
  // fetchData should be updated if needed to support this path pattern
  const episodeNumber = Number(episode.replace(/^episode_/, ""));
  const { data, error } = await getEpisodeDataSafe(org, dataset, episodeNumber);
  return (
    <Suspense fallback={null}>
      <EpisodeViewer 
        key={`${org}/${dataset}/${episode}`} 
        data={data} 
        error={error} 
        org={org} 
        dataset={dataset} 
      />
    </Suspense>
  );
}
