"use client";

import type { Psd, Layer as PsdLayer } from "ag-psd";
import { saveAs } from "file-saver";
import mergeImages from "merge-images";
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
    const [outputImage, setOutputImage] = useState<string>();
    const { width, height } = useWindowDimensions();

    const outputImageDimension = useMemo(() => {
        const maxWidth = 600;
        const minWidth = 300;
        const calculatedWidth = width > height ? width * 0.3 : width * 0.5;
        const finalWidth = Math.min(maxWidth, calculatedWidth);
        return Math.max(minWidth, finalWidth);
    }, [width, height]);

    const itemImageDimension = useMemo(() => {
        const maxWidth = 160;
        const calculatedWidth = width > height ? width * 0.1 : width * 0.167;
        return Math.min(maxWidth, calculatedWidth);
    }, [width, height]);

    const colorImageDimension = useMemo(() => {
        const maxWidth = 60;
        const calculatedWidth = width > height ? width * 0.05 : width * 0.083;
        return Math.min(maxWidth, calculatedWidth);
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

    return (
        <div
            className="App"
            style={{ flexDirection: width > height ? "row" : "column" }}
        >
            <div className="left-area">
                {outputImage?.startsWith("data:image/png;base64,") ? (
                    <>
                        <img
                            className="layer-image"
                            width={outputImageDimension}
                            src={outputImage}
                            title="Output Image"
                            alt="Output"
                        />
                        <div className="button-group">
                            <button
                                type="button"
                                className="button-1"
                                onClick={handleReset}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                className="button-2"
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
                                className="button-2"
                                onClick={handleDownloadPsd}
                            >
                                Save PSD
                            </button>
                        </div>
                        <div className="button-group">
                            <input
                                id="presetInput"
                                type="file"
                                style={{ display: "none" }}
                                onChange={handleLoadPreset}
                            />
                            <button
                                type="button"
                                className="button-3"
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
                                className="button-2"
                                onClick={handleDownloadPreset}
                            >
                                Download Preset
                            </button>
                        </div>
                    </>
                ) : (
                    <div
                        className="loading-text-container"
                        style={{
                            width: outputImageDimension,
                            height: outputImageDimension,
                        }}
                    >
                        loading...
                    </div>
                )}
            </div>

            <div className="config-area">
                <Tabs>
                    <TabList>
                        {orderedLayers?.map((i) => (
                            <Tab key={i.pId}>
                                <img
                                    className="tab-image"
                                    width={tabImageDimension}
                                    src={assetPath(i.thumbUrl)}
                                    alt=""
                                />
                            </Tab>
                        ))}
                    </TabList>
                    {orderedLayers?.map((i, idx) => (
                        <TabPanel key={i.pId}>
                            <div className="tab-content">
                                <div className="item-container">
                                    {!!i.isRmv && (
                                        <img
                                            className={
                                                layerComb?.[idx]?.itmId === 0
                                                    ? "item-image-selected"
                                                    : "item-image"
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
                                        <img
                                            key={item.itmId}
                                            className={
                                                layerComb?.[idx]?.itmId ===
                                                item.itmId
                                                    ? "item-image-selected"
                                                    : "item-image"
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
                                {!!(
                                    Object.keys(i.colors).length > 1 &&
                                    layerComb?.[idx]?.itmId
                                ) && (
                                    <div className="color-container">
                                        {i.items
                                            .find(
                                                (j) =>
                                                    j.itmId ===
                                                    layerComb?.[idx]?.itmId,
                                            )
                                            ?.originals.map((orig) => (
                                                <div
                                                    key={orig.cId}
                                                    className={
                                                        layerComb?.[idx]
                                                            ?.cId === orig.cId
                                                            ? "color-image-selected"
                                                            : "color-image"
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
