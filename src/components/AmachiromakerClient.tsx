"use client";

import type { Psd, Layer as PsdLayer } from "ag-psd";
import { saveAs } from "file-saver";
import mergeImages from "merge-images";
import NextImage from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import { useWindowDimensions } from "../hooks";
import { assetPath } from "../lib/basePath";
import { asLayerImages, asLayers, getDefaultCombination } from "../lib/data";
import type { LayerImage } from "../types";

export default function AmachiromakerClient({
    initialLayerComb,
    initialOrderedLayers,
}: {
    initialLayerComb: unknown;
    initialOrderedLayers: unknown;
}) {
    const [layerComb, setLayerComb] = useState<LayerImage[]>(() =>
        asLayerImages(initialLayerComb),
    );
    const orderedLayers = useMemo(
        () => asLayers(initialOrderedLayers),
        [initialOrderedLayers],
    );
    const [outputImage, setOutputImage] = useState<string | undefined>();
    const { width, height } = useWindowDimensions();

    const outputImageDimension = useMemo(() => {
        const maxWidth = 600;
        const minWidth = 300;
        const calculatedWidth = width > height ? width * 0.3 : width * 0.5;
        return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
    }, [width, height]);

    const itemImageDimension = useMemo(() => {
        const calculatedWidth = width > height ? width * 0.1 : width * 0.167;
        return Math.min(160, calculatedWidth);
    }, [width, height]);

    const colorImageDimension = useMemo(() => {
        const calculatedWidth = width > height ? width * 0.05 : width * 0.083;
        return Math.min(60, calculatedWidth);
    }, [width, height]);

    const tabImageDimension = colorImageDimension;

    useEffect(() => {
        const savedComb = JSON.parse(
            localStorage.getItem("layerComb") || "null",
        );

        // Restore the persisted combination after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLayerComb(
            savedComb ? asLayerImages(savedComb) : getDefaultCombination(),
        );
    }, []);

    const handleChangeItem = (
        layerIdx: number,
        itmId: number | undefined,
        cId: number | undefined,
        url: string | undefined,
    ) => {
        const layerComb_ = [...(layerComb || [])];

        layerComb_[layerIdx] = {
            ...layerComb_[layerIdx],
            itmId: itmId as number,
            cId: cId as number,
            url: url as string,
        };

        localStorage.setItem("layerComb", JSON.stringify(layerComb_));

        setLayerComb(layerComb_);
    };

    const handleReset = () => {
        const res = getDefaultCombination();
        setLayerComb(res);
        localStorage.setItem("layerComb", JSON.stringify(res));
    };

    useEffect(() => {
        const layerList =
            layerComb
                ?.filter((i) => i.url)
                .map((i) => ({
                    src: assetPath(i.url),
                    x: i.x,
                    y: i.y,
                })) || [];

        mergeImages(layerList).then((b64) => {
            setOutputImage(b64);
        });
    }, [layerComb]);

    const handleDownloadPsd = async () => {
        const agPsd = await import("ag-psd");

        const psdLayers = await Promise.all(
            (layerComb || [])
                .map((i, idx) => ({
                    ...i,
                    name: orderedLayers?.[idx].pNm,
                }))
                .filter((i) => i.url)
                .map(async (layer): Promise<PsdLayer> => {
                    const drawImg = (
                        ctx: OffscreenCanvasRenderingContext2D | null,
                        url: string,
                    ) => {
                        return new Promise<void>((resolve) => {
                            const image = new Image();
                            image.onload = () => {
                                ctx?.drawImage(image, 0, 0);
                                resolve();
                            };
                            image.src = `${url}`;
                        });
                    };

                    const canvas2 = new OffscreenCanvas(600, 600);
                    await drawImg(
                        canvas2.getContext("2d"),
                        assetPath(layer.url),
                    );

                    return {
                        top: layer.y,
                        left: layer.x,
                        blendMode: "normal",
                        opacity: 1,
                        name: layer.name,
                        canvas: canvas2 as unknown as HTMLCanvasElement,
                    };
                }),
        );

        const psdData: Psd = {
            width: 600,
            height: 600,
            colorMode: 3,
            channels: 3,
            bitsPerChannel: 8,
            children: psdLayers,
        };

        const data = agPsd.writePsd(psdData);
        const blob = new Blob([data]);
        saveAs(blob, `amachiromaker-output-${Date.now()}.psd`);
    };

    const handleDownloadPreset = () => {
        const presetJson = JSON.stringify(layerComb);
        const presetBlob = new Blob([presetJson], {
            type: "text/plain",
        });
        saveAs(presetBlob, `amachiromaker-preset-${Date.now()}.json`);
    };

    const handleLoadPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const data = JSON.parse(reader.result as string);
            localStorage.setItem("layerComb", reader.result as string);
            setLayerComb(asLayerImages(data));
            e.target.value = "";
        };
        reader.readAsText(file);
    };

    const isOutputReady =
        typeof outputImage === "string" &&
        outputImage.startsWith("data:image/png;base64,");

    return (
        <div
            className="flex min-h-screen min-w-screen items-start bg-[#282c34] text-white"
            style={{ flexDirection: width > height ? "row" : "column" }}
        >
            <div className="m-2 flex flex-col items-center text-center">
                {isOutputReady && outputImage ? (
                    <>
                        <NextImage
                            className="rounded-2xl border border-solid border-[#555]"
                            width={outputImageDimension}
                            height={outputImageDimension}
                            src={outputImage}
                            title="Output Image"
                            alt="Output"
                        />
                        <div className="flex flex-row">
                            <button
                                type="button"
                                className="mt-4 max-w-fit cursor-pointer rounded-lg border-0 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 select-none bg-[#A1586D] hover:bg-[#FCA4CE]"
                                onClick={handleReset}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                className="ml-4 max-w-fit cursor-pointer rounded-lg border-0 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 select-none bg-[#FC7C73] hover:bg-[#FEC8A9]"
                                onClick={() => {
                                    saveAs(
                                        outputImage || "",
                                        `amachiromaker-output-${Date.now()}.png`,
                                    );
                                }}
                            >
                                Save PNG
                            </button>
                            <button
                                type="button"
                                className="ml-4 max-w-fit cursor-pointer rounded-lg border-0 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 select-none bg-[#FC7C73] hover:bg-[#FEC8A9]"
                                onClick={handleDownloadPsd}
                            >
                                Save PSD
                            </button>
                        </div>
                        <div className="flex flex-row">
                            <input
                                id="presetInput"
                                type="file"
                                style={{ display: "none" }}
                                onChange={handleLoadPreset}
                            />
                            <button
                                type="button"
                                className="ml-4 max-w-fit cursor-pointer rounded-lg border-0 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 select-none bg-[#DD9785] hover:bg-[#DFC8AB]"
                                onClick={() => {
                                    document
                                        .getElementById("presetInput")
                                        ?.click();
                                }}
                            >
                                Load Preset
                            </button>
                            <button
                                type="button"
                                className="ml-4 max-w-fit cursor-pointer rounded-lg border-0 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 select-none bg-[#FC7C73] hover:bg-[#FEC8A9]"
                                onClick={handleDownloadPreset}
                            >
                                Download Preset
                            </button>
                        </div>
                    </>
                ) : (
                    <div
                        className="flex flex-col items-center justify-center rounded-2xl border border-solid border-[#555] text-gray-400"
                        style={{
                            width: outputImageDimension || 300,
                            height: outputImageDimension || 300,
                        }}
                    >
                        loading...
                    </div>
                )}
            </div>

            <div className="config-area m-4 h-full w-full">
                <Tabs>
                    <TabList>
                        {orderedLayers?.map((i) => (
                            <Tab key={i.pId}>
                                <NextImage
                                    className="rounded-lg"
                                    width={tabImageDimension}
                                    height={tabImageDimension}
                                    src={assetPath(i.thumbUrl)}
                                    alt=""
                                />
                            </Tab>
                        ))}
                    </TabList>
                    {orderedLayers?.map((i, idx) => (
                        <TabPanel key={i.pId}>
                            <div className="flex flex-col items-start text-left">
                                <div className="min-w-full rounded-2xl border border-dashed border-[rgb(114,57,57)]">
                                    {!!i.isRmv && (
                                        <NextImage
                                            className={
                                                layerComb?.[idx]?.itmId === 0
                                                    ? "ml-1 mr-1 mt-1 inline-block cursor-default rounded-xl border border-solid border-[#f0e982] object-contain"
                                                    : "ml-1 mr-1 mt-1 inline-block cursor-pointer rounded-xl border border-dashed border-[rgb(62,62,143)] object-contain transition-all duration-200 hover:border-solid hover:border-[#F082AC]"
                                            }
                                            onClick={() => {
                                                handleChangeItem(idx, 0, 0, "");
                                            }}
                                            width={itemImageDimension}
                                            height={itemImageDimension}
                                            src={assetPath("/emptyset.svg")}
                                            alt=""
                                        />
                                    )}
                                    {i.items.map((item) => (
                                        <NextImage
                                            key={item.itmId}
                                            className={
                                                layerComb?.[idx]?.itmId ===
                                                item.itmId
                                                    ? "ml-1 mr-1 mt-1 inline-block cursor-default rounded-xl border border-solid border-[#f0e982] object-contain"
                                                    : "ml-1 mr-1 mt-1 inline-block cursor-pointer rounded-xl border border-dashed border-[rgb(62,62,143)] object-contain transition-all duration-200 hover:border-solid hover:border-[#F082AC]"
                                            }
                                            src={assetPath(item.thumbUrl)}
                                            width={itemImageDimension}
                                            height={itemImageDimension}
                                            onClick={() => {
                                                const sameColorItem =
                                                    item.originals.find(
                                                        (o) =>
                                                            o.cId ===
                                                            layerComb?.[idx]
                                                                ?.cId,
                                                    );
                                                handleChangeItem(
                                                    idx,
                                                    item.itmId,
                                                    sameColorItem?.cId ||
                                                        item.originals[0].cId,
                                                    sameColorItem?.url ||
                                                        item.originals[0].url,
                                                );
                                            }}
                                            alt=""
                                        />
                                    ))}
                                </div>
                                {!(
                                    Object.keys(i.colors).length > 1 &&
                                    layerComb?.[idx]?.itmId
                                ) ? null : (
                                    <div className="mt-1 min-w-full rounded-2xl border border-dashed border-[rgb(44,90,44)]">
                                        {i.items
                                            .find(
                                                (j) =>
                                                    j.itmId ===
                                                    layerComb?.[idx]?.itmId,
                                            )
                                            ?.originals.map((orig) => (
                                                <button
                                                    key={orig.cId}
                                                    type="button"
                                                    className={
                                                        (layerComb?.[idx]
                                                            ?.cId === orig.cId
                                                            ? "ml-1 mr-1 mt-1.5 inline-block cursor-default rounded-full border-4 border-solid border-white object-contain"
                                                            : "ml-1 mr-1 mt-1.5 inline-block cursor-pointer rounded-full border-4 border-solid border-gray-500 object-contain transition-all duration-200 hover:border-[#F082AC]") +
                                                        " bg-transparent p-0"
                                                    }
                                                    style={{
                                                        background:
                                                            i.colors[orig.cId],
                                                        width: colorImageDimension,
                                                        height: colorImageDimension,
                                                    }}
                                                    onClick={() => {
                                                        handleChangeItem(
                                                            idx,
                                                            layerComb?.[idx]
                                                                ?.itmId as number,
                                                            orig.cId,
                                                            orig.url,
                                                        );
                                                    }}
                                                />
                                            ))}
                                    </div>
                                )}
                            </div>
                        </TabPanel>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}
