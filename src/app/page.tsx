import LandLocator from '@/components/LandLocator';
import { loadDataset } from '@/lib/source';

export const revalidate = 60;

export default async function Page() {
  const dataset = await loadDataset();
  return <LandLocator initial={dataset} />;
}
