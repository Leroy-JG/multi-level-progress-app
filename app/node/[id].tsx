import { useLocalSearchParams } from 'expo-router';
import { NodeScreen } from '../../src/ui/NodeScreen';

export default function NodePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NodeScreen nodeId={id ?? null} />;
}
