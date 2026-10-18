import { Shell } from '../../components/shell';
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <Shell route={'/' + (slug ?? []).join('/')} />;
}
