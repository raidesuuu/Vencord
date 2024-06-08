/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { showNotice } from "@api/Notices";
import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { CogWheel, InfoIcon } from "@components/Icons";
import PluginModal from "@components/PluginSettings/PluginModal";
import { AddonCard } from "@components/VencordSettings/AddonCard";
import { SettingsTab } from "@components/VencordSettings/shared";
import { ChangeList } from "@utils/ChangeList";
import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes, isObjectEmpty } from "@utils/misc";
import { openModalLazy } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { Plugin } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Alerts, Button, Card, Forms, lodash, Parser, React, Select, Text, TextInput, Toasts, Tooltip } from "@webpack/common";

import Plugins from "~plugins";

// Avoid circular dependency
const { startDependenciesRecursive, startPlugin, stopPlugin } = proxyLazy(() => require("../../plugins"));

const cl = classNameFactory("vc-plugins-");
const logger = new Logger("PluginSettings", "#a6d189");

const InputStyles = findByPropsLazy("inputDefault", "inputWrapper");
const ButtonClasses = findByPropsLazy("button", "disabled", "enabled");


function showErrorToast(message: string) {
    Toasts.show({
        message,
        type: Toasts.Type.FAILURE,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        }
    });
}

function ReloadRequiredCard({ required }: { required: boolean; }) {
    return (
        <Card className={cl("info-card", { "restart-card": required })}>
            {required ? (
                <>
                    <Forms.FormTitle tag="h5">再起動が必要です！</Forms.FormTitle>
                    <Forms.FormText className={cl("dep-text")}>
                        新しいプラグインとその設定を適用するために、今すぐ再起動してください
                    </Forms.FormText>
                    <Button onClick={() => location.reload()}>
                        再起動
                    </Button>
                </>
            ) : (
                <>
                    <Forms.FormTitle tag="h5">プラグイン管理</Forms.FormTitle>
                    <Forms.FormText>歯車アイコンまたは情報アイコンを押して、プラグインの詳細情報を表示します</Forms.FormText>
                    <Forms.FormText>歯車アイコンのあるプラグインには、変更できる設定があります！</Forms.FormText>
                </>
            )}
        </Card>
    );
}

interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled: boolean;
    onRestartNeeded(name: string): void;
    isNew?: boolean;
}

export function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave, isNew }: PluginCardProps) {
    const settings = Settings.plugins[plugin.name];

    const isEnabled = () => settings.enabled ?? false;

    function openModal() {
        openModalLazy(async () => {
            return modalProps => {
                return <PluginModal {...modalProps} plugin={plugin} onRestartNeeded={() => onRestartNeeded(plugin.name)} />;
            };
        });
    }

    function toggleEnabled() {
        const wasEnabled = isEnabled();

        // プラグインを有効にする場合、依存関係のあるすべてのプラグインも再帰的に有効にする
        if (!wasEnabled) {
            const { restartNeeded, failures } = startDependenciesRecursive(plugin);
            if (failures.length) {
                logger.error(`${plugin.name} の依存関係の開始に失敗しました: ${failures.join(", ")}`);
                showNotice("依存関係の開始に失敗しました: " + failures.join(", "), "閉じる", () => null);
                return;
            } else if (restartNeeded) {
                // 依存関係にパッチがある場合、プラグインをまだ開始しない
                settings.enabled = true;
                onRestartNeeded(plugin.name);
                return;
            }
        }

        // プラグインにパッチがある場合、stopPlugin/startPlugin を使用しないで、変更を適用するために再起動を待つ
        if (plugin.patches?.length) {
            settings.enabled = !wasEnabled;
            onRestartNeeded(plugin.name);
            return;
        }

        // プラグインが有効で、まだ開始されていない場合、単に無効にする
        if (wasEnabled && !plugin.started) {
            settings.enabled = !wasEnabled;
            return;
        }

        const result = wasEnabled ? stopPlugin(plugin) : startPlugin(plugin);

        if (!result) {
            settings.enabled = false;

            const msg = `${plugin.name} の${wasEnabled ? "停止" : "開始"}中にエラーが発生しました`;
            logger.error(msg);
            showErrorToast(msg);
            return;
        }

        settings.enabled = !wasEnabled;
    }

    return (
        <AddonCard
            name={plugin.name}
            description={plugin.description}
            isNew={isNew}
            enabled={isEnabled()}
            setEnabled={toggleEnabled}
            disabled={disabled}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            infoButton={
                <button role="switch" onClick={() => openModal()} className={classes(ButtonClasses.button, cl("info-button"))}>
                    {plugin.options && !isObjectEmpty(plugin.options)
                        ? <CogWheel />
                        : <InfoIcon />}
                </button>
            }
        />
    );
}

const enum SearchStatus {
    ALL, // 全てのプラグインを表示
    ENABLED, // 有効なプラグインのみ表示
    DISABLED, // 無効なプラグインのみ表示
    NEW // 新しいプラグインのみ表示
}

export default function PluginSettings() {
    const settings = useSettings();
    const changes = React.useMemo(() => new ChangeList<string>(), []);

    React.useEffect(() => {
        return () => void (changes.hasChanges && Alerts.show({
            title: "再起動が必要です",
            body: (
                <>
                    <p>以下のプラグインは再起動が必要です:</p>
                    <div>{changes.map((s, i) => (
                        <>
                            {i > 0 && ", "}
                            {Parser.parse("`" + s + "`")}
                        </>
                    ))}</div>
                </>
            ),
            confirmText: "今すぐ再起動",
            cancelText: "後で！",
            onConfirm: () => location.reload()
        }));
    }, []);

    const depMap = React.useMemo(() => {
        const o = {} as Record<string, string[]>;
        for (const plugin in Plugins) {
            const deps = Plugins[plugin].dependencies;
            if (deps) {
                for (const dep of deps) {
                    o[dep] ??= [];
                    o[dep].push(plugin);
                }
            }
        }
        return o;
    }, []);

    const sortedPlugins = React.useMemo(() => Object.values(Plugins)
        .sort((a, b) => a.name.localeCompare(b.name)), []);

    const [searchValue, setSearchValue] = React.useState({ value: "", status: SearchStatus.ALL });

    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, value: query }));
    const onStatusChange = (status: SearchStatus) => setSearchValue(prev => ({ ...prev, status }));

    const pluginFilter = (plugin: typeof Plugins[keyof typeof Plugins]) => {
        const enabled = settings.plugins[plugin.name]?.enabled;
        if (enabled && searchValue.status === SearchStatus.DISABLED) return false;
        if (!enabled && searchValue.status === SearchStatus.ENABLED) return false;
        if (searchValue.status === SearchStatus.NEW && !newPlugins?.includes(plugin.name)) return false;
        if (!searchValue.value.length) return true;

        const v = searchValue.value.toLowerCase();
        return (
            plugin.name.toLowerCase().includes(v) ||
            plugin.description.toLowerCase().includes(v) ||
            plugin.tags?.some(t => t.toLowerCase().includes(v))
        );
    };

    const [newPlugins] = useAwaiter(() => DataStore.get("Vencord_existingPlugins").then((cachedPlugins: Record<string, number> | undefined) => {
        const now = Date.now() / 1000;
        const existingTimestamps: Record<string, number> = {};
        const sortedPluginNames = Object.values(sortedPlugins).map(plugin => plugin.name);

        const newPlugins: string[] = [];
        for (const { name: p } of sortedPlugins) {
            const time = existingTimestamps[p] = cachedPlugins?.[p] ?? now;
            if ((time + 60 * 60 * 24 * 2) > now) {
                newPlugins.push(p);
            }
        }
        DataStore.set("Vencord_existingPlugins", existingTimestamps);

        return lodash.isEqual(newPlugins, sortedPluginNames) ? [] : newPlugins;
    }));

    type P = JSX.Element | JSX.Element[];
    let plugins: P, requiredPlugins: P;
    if (sortedPlugins?.length) {
        plugins = [];
        requiredPlugins = [];

        const showApi = searchValue.value === "API";
        for (const p of sortedPlugins) {
            if (p.hidden || (!p.options && p.name.endsWith("API") && !showApi))
                continue;

            if (!pluginFilter(p)) continue;

            const isRequired = p.required || depMap[p.name]?.some(d => settings.plugins[d].enabled);

            if (isRequired) {
                const tooltipText = p.required
                    ? "このプラグインは Vencord の動作に必要です。"
                    : makeDependencyList(depMap[p.name]?.filter(d => settings.plugins[d].enabled));

                requiredPlugins.push(
                    <Tooltip text={tooltipText} key={p.name}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <PluginCard
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                                onRestartNeeded={name => changes.handleChange(name)}
                                disabled={true}
                                plugin={p}
                            />
                        )}
                    </Tooltip>
                );
            } else {
                plugins.push(
                    <PluginCard
                        onRestartNeeded={name => changes.handleChange(name)}
                        disabled={false}
                        plugin={p}
                        isNew={newPlugins?.includes(p.name)}
                        key={p.name}
                    />
                );
            }

        }
    } else {
        plugins = requiredPlugins = <Text variant="text-md/normal">検索条件に一致するプラグインはありません。</Text>;
    }

    return (
        <SettingsTab title="プラグイン">
            <ReloadRequiredCard required={changes.hasChanges} />

            <Forms.FormTitle tag="h5" className={classes(Margins.top20, Margins.bottom8)}>
                フィルター
            </Forms.FormTitle>

            <div className={cl("filter-controls")}>
                <TextInput autoFocus value={searchValue.value} placeholder="プラグインを検索..." onChange={onSearch} className={Margins.bottom20} />
                <div className={InputStyles.inputWrapper}>
                    <Select
                        options={[
                            { label: "すべて表示", value: SearchStatus.ALL, default: true },
                            { label: "有効なプラグインのみ表示", value: SearchStatus.ENABLED },
                            { label: "無効なプラグインのみ表示", value: SearchStatus.DISABLED },
                            { label: "新しいプラグインのみ表示", value: SearchStatus.NEW }
                        ]}
                        serialize={String}
                        select={onStatusChange}
                        isSelected={v => v === searchValue.status}
                        closeOnSelect={true}
                    />
                </div>
            </div>

            <Forms.FormTitle className={Margins.top20}>プラグイン</Forms.FormTitle>

            <div className={cl("grid")}>
                {plugins}
            </div>

            <Forms.FormDivider className={Margins.top20} />

            <Forms.FormTitle tag="h5" className={classes(Margins.top20, Margins.bottom8)}>
                必須プラグイン
            </Forms.FormTitle>
            <div className={cl("grid")}>
                {requiredPlugins}
            </div>
        </SettingsTab >
    );
}

function makeDependencyList(deps: string[]) {
    return (
        <React.Fragment>
            <Forms.FormText>このプラグインは以下によって必要です:</Forms.FormText>
            {deps.map((dep: string) => <Forms.FormText className={cl("dep-text")}>{dep}</Forms.FormText>)}
        </React.Fragment>
    );
}
