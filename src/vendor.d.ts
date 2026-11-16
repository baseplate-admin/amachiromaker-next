declare module "merge-images" {
  interface MergeImagesLayer {
    src: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }
  const mergeImages: (layers: MergeImagesLayer[]) => Promise<string>;
  export default mergeImages;
}

declare module "file-saver" {
  export function saveAs(
    data: Blob | string,
    filename?: string,
    options?: { autoBom?: boolean },
  ): void;
}
