import LandLocator from '@/components/LandLocator';
import { REVALIDATE_SECONDS, loadDataset } from '@/lib/source';

export const revalidate = 60;

export default async function Page() {
  const dataset = await loadDataset();
  return <LandLocator initial={dataset} pollHint={REVALIDATE_SECONDS} />;
}
