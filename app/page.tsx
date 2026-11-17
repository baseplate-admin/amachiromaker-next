import AmachiromakerClient from "@/src/components/AmachiromakerClient";
import { getDefaultCombination, getOrderedLayers } from "@/src/lib/data";

export default function Home() {
    const layerComb = getDefaultCombination();
    const orderedLayers = getOrderedLayers();

    return (
        <AmachiromakerClient
            initialLayerComb={layerComb}
            initialOrderedLayers={orderedLayers}
        />
    );
}
