import { useStore } from '../src/store/store';
import { NodeScreen } from '../src/ui/NodeScreen';

export default function Home() {
  const { currentProjectId } = useStore();
  return <NodeScreen nodeId={currentProjectId} />;
}
