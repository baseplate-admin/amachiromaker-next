import type { Layer, LayerImage } from '../types';
import defaultCombination from './defaultCombination.json';
import orderedLayers from './orderedLayers.json';

export function asLayerImages(value: unknown): LayerImage[] {
    return Array.isArray(value) ? (value as LayerImage[]) : [];
}

export function asLayers(value: unknown): Layer[] {
    return Array.isArray(value) ? (value as Layer[]) : [];
}

export function getDefaultCombination(): LayerImage[] {
    return asLayerImages(defaultCombination);
}

export function getOrderedLayers(): Layer[] {
    return asLayers(orderedLayers);
}
