/*
 * Vencord、Discordクライアントの修正
 * 著作権 (c) 2024 Vendicatedと貢献者
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { ComponentDispatch, FocusLock, i18n, Menu, useEffect, useRef } from "@webpack/common";
import type { HTMLAttributes, ReactElement } from "react";

type SettingsEntry = { section: string, label: string; };

const cl = classNameFactory("");
let Classes: Record<string, string>;
waitFor(["animating", "baseLayer", "bg", "layer", "layers"], m => Classes = m);

const settings = definePluginSettings({
    disableFade: {
        description: "クロスフェードアニメーションを無効にする",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    organizeMenu: {
        description: "設定コグコンテキストメニューをカテゴリに整理する",
        type: OptionType.BOOLEAN,
        default: true
    },
    eagerLoad: {
        description: "初めてメニューを開くときの読み込み遅延を削除する",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

interface LayerProps extends HTMLAttributes<HTMLDivElement> {
    mode: "SHOWN" | "HIDDEN";
    baseLayer?: boolean;
}

function Layer({ mode, baseLayer = false, ...props }: LayerProps) {
    const hidden = mode === "HIDDEN";
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => () => {
        ComponentDispatch.dispatch("LAYER_POP_START");
        ComponentDispatch.dispatch("LAYER_POP_COMPLETE");
    }, []);

    const node = (
        <div
            ref={containerRef}
            aria-hidden={hidden}
            className={cl({
                [Classes.layer]: true,
                [Classes.baseLayer]: baseLayer,
                "stop-animations": hidden
            })}
            style={{ opacity: hidden ? 0 : undefined }}
            {...props}
        />
    );

    return baseLayer
        ? node
        : <FocusLock containerRef={containerRef}>{node}</FocusLock>;
}

export default definePlugin({
    name: "BetterSettings",
    description: "Enhances your settings-menu-opening experience",
    authors: [Devs.Kyuuhachi],
    settings,

    patches: [
        {
            find: "this.renderArtisanalHack()",
            replacement: [
                { // Fade in on layer
                    match: /(?<=\((\i),"contextType",\i\.AccessibilityPreferencesContext\);)/,
                    replace: "$1=$self.Layer;",
                    predicate: () => settings.store.disableFade
                },
                { // Lazy-load contents
                    match: /createPromise:\(\)=>([^:}]*?),webpackId:"\d+",name:(?!="CollectiblesShop")"[^"]+"/g,
                    replace: "$&,_:$1",
                    predicate: () => settings.store.eagerLoad
                }
            ]
        },
        { // For some reason standardSidebarView also has a small fade-in
            find: "DefaultCustomContentScroller:function()",
            replacement: [
                {
                    match: /\(0,\i\.useTransition\)\((\i)/,
                    replace: "(_cb=>_cb(void 0,$1))||$&"
                },
                {
                    match: /\i\.animated\.div/,
                    replace: '"div"'
                }
            ],
            predicate: () => settings.store.disableFade
        },
        { // Load menu TOC eagerly
            find: "Messages.USER_SETTINGS_WITH_BUILD_OVERRIDE.format",
            replacement: {
                match: /(?<=(\i)\(this,"handleOpenSettingsContextMenu",.{0,100}?openContextMenuLazy.{0,100}?(await Promise\.all[^};]*?\)\)).*?,)(?=\1\(this)/,
                replace: "(async ()=>$2)(),"
            },
            predicate: () => settings.store.eagerLoad
        },
        { // Settings cog context menu
            find: "Messages.USER_SETTINGS_ACTIONS_MENU_LABEL",
            replacement: {
                match: /\(0,\i.useDefaultUserSettingsSections\)\(\)(?=\.filter\(\i=>\{let\{section:\i\}=)/,
                replace: "$self.wrapMenu($&)"
            }
        }
    ],

    // This is the very outer layer of the entire ui, so we can't wrap this in an ErrorBoundary
    // without possibly also catching unrelated errors of children.
    //
    // Thus, we sanity check webpack modules & do this really hacky try catch to hopefully prevent hard crashes if something goes wrong.
    // try catch will only catch errors in the Layer function (hence why it's called as a plain function rather than a component), but
    // not in children
    Layer(props: LayerProps) {
        if (!FocusLock || !ComponentDispatch || !Classes) {
            new Logger("BetterSettings").error("Failed to find some components");
            return props.children;
        }

        return <Layer {...props} />;
    },

    wrapMenu(list: SettingsEntry[]) {
        if (!settings.store.organizeMenu) return list;

        const items = [{ label: null as string | null, items: [] as SettingsEntry[] }];

        for (const item of list) {
            if (item.section === "HEADER") {
                items.push({ label: item.label, items: [] });
            } else if (item.section === "DIVIDER") {
                items.push({ label: i18n.Messages.OTHER_OPTIONS, items: [] });
            } else {
                items.at(-1)!.items.push(item);
            }
        }

        return {
            filter(predicate: (item: SettingsEntry) => boolean) {
                for (const category of items) {
                    category.items = category.items.filter(predicate);
                }
                return this;
            },
            map(render: (item: SettingsEntry) => ReactElement) {
                return items
                    .filter(a => a.items.length > 0)
                    .map(({ label, items }) => {
                        const children = items.map(render);
                        if (label) {
                            return (
                                <Menu.MenuItem
                                    id={label.replace(/\W/, "_")}
                                    label={label}
                                    children={children}
                                    action={children[0].props.action}
                                />);
                        } else {
                            return children;
                        }
                    });
            }
        };
    }
});
