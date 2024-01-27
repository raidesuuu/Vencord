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

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import DonateButton from "@components/DonateButton";
import { ErrorCard } from "@components/ErrorCard";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { relaunch, showItemInFolder } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { Button, Card, Forms, React, Select, Slider, Switch } from "@webpack/common";

import { SettingsTab, wrapTab } from "./shared";

const cl = classNameFactory("vc-settings-");

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://media.discordapp.net/stickers/1039992459209490513.png";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function VencordSettings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(VencordNative.settings.getSettingsDir, {
        fallbackValue: "ロード中..."
    });
    const settings = useSettings();

    const donateImage = React.useMemo(() => Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE, []);

    const isWindows = navigator.platform.toLowerCase().startsWith("win");
    const isMac = navigator.platform.toLowerCase().startsWith("mac");
    const needsVibrancySettings = IS_DISCORD_DESKTOP && isMac;

    // One-time migration of the old setting to the new one if necessary.
    React.useEffect(() => {
        if (settings.macosTranslucency === true && !settings.macosVibrancyStyle) {
            settings.macosVibrancyStyle = "sidebar";
            settings.macosTranslucency = undefined;
        }
    }, []);

    const Switches: Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        note: string;
    }> =
        [
            {
                key: "useQuickCss",
                title: "クイックCSSを有効にする",
                note: "あなたのカスタムCSSを有効にする"
            },
            !IS_WEB && {
                key: "enableReactDevtools",
                title: "Reactのデベロッパーツールを有効にする",
                note: "完全な再起動が必要です。"
            },
            !IS_WEB && (!IS_DISCORD_DESKTOP || !isWindows ? {
                key: "frameless",
                title: "ウインドウのフレームを無効にする",
                note: "完全な再起動が必要です。"
            } : {
                key: "winNativeTitleBar",
                title: "Windowsのタイトルバーを使用する",
                note: "完全な再起動が必要です。"
            }),
            !IS_WEB && false /* This causes electron to freeze / white screen for some people */ && {
                key: "transparent",
                title: "ウインドウの透過を有効にする",
                note: "完全な再起動が必要です。この機能を使用する際に、Discordがフリーズしたりホワイトスクリーンが表示される可能性があります。"
            },
            !IS_WEB && isWindows && {
                key: "winCtrlQ",
                title: "Ctrl+QでDiscordを終了できるようにする (Alt+F4の代替)",
                note: "完全な再起動が必要です。"
            },
            IS_DISCORD_DESKTOP && {
                key: "disableMinSize",
                title: "ウインドウの最小サイズ制限を解除する",
                note: "完全な再起動が必要です。"
            },
        ];

    return (
        <SettingsTab title="Vencord 設定">
            <DonateCard image={donateImage} />
            <Forms.FormSection title="クイックアクション">
                <Card className={cl("quick-actions-card")}>
                    <React.Fragment>
                        {!IS_WEB && (
                            <Button
                                onClick={relaunch}
                                size={Button.Sizes.SMALL}>
                                クライアントを再起動
                            </Button>
                        )}
                        <Button
                            onClick={() => VencordNative.quickCss.openEditor()}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDir === "ロード中..."}>
                            QuickCSSのファイルを開く
                        </Button>
                        {!IS_WEB && (
                            <Button
                                onClick={() => showItemInFolder(settingsDir)}
                                size={Button.Sizes.SMALL}
                                disabled={settingsDirPending}>
                                設定フォルダを開く
                            </Button>
                        )}
                        <Button
                            onClick={() => VencordNative.native.openExternal("https://github.com/vencordjp/Vencord")}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDirPending}>
                            GitHubで開く
                        </Button>
                    </React.Fragment>
                </Card>
            </Forms.FormSection>

            <Forms.FormDivider />

            <Forms.FormSection className={Margins.top16} title="設定" tag="h5">
                <Forms.FormText className={Margins.bottom20}>
                    ヒント: 設定のセクションの場所は、「Settings」プラグインの設定を変更することで場所を変更できます。
                </Forms.FormText>
                {Switches.map(s => s && (
                    <Switch
                        key={s.key}
                        value={settings[s.key]}
                        onChange={v => settings[s.key] = v}
                        note={s.note}
                    >
                        {s.title}
                    </Switch>
                ))}
            </Forms.FormSection>


            {needsVibrancySettings && <>
                <Forms.FormTitle tag="h5">Window vibrancy style (requires restart)</Forms.FormTitle>
                <Select
                    className={Margins.bottom20}
                    placeholder="Window vibrancy style"
                    options={[
                        // Sorted from most opaque to most transparent
                        {
                            label: "No vibrancy", default: !settings.macosTranslucency, value: undefined
                        },
                        {
                            label: "Under Page (window tinting)",
                            value: "under-page"
                        },
                        {
                            label: "Content",
                            value: "content"
                        },
                        {
                            label: "Window",
                            value: "window"
                        },
                        {
                            label: "Selection",
                            value: "selection"
                        },
                        {
                            label: "Titlebar",
                            value: "titlebar"
                        },
                        {
                            label: "Header",
                            value: "header"
                        },
                        {
                            label: "Sidebar (old value for transparent windows)",
                            value: "sidebar",
                            default: settings.macosTranslucency
                        },
                        {
                            label: "Tooltip",
                            value: "tooltip"
                        },
                        {
                            label: "Menu",
                            value: "menu"
                        },
                        {
                            label: "Popover",
                            value: "popover"
                        },
                        {
                            label: "Fullscreen UI (transparent but slightly muted)",
                            value: "fullscreen-ui"
                        },
                        {
                            label: "HUD (Most transparent)",
                            value: "hud"
                        },
                    ]}
                    select={v => settings.macosVibrancyStyle = v}
                    isSelected={v => settings.macosVibrancyStyle === v}
                    serialize={identity} />
            </>}

            {typeof Notification !== "undefined" && <NotificationSection settings={settings.notifications} />}
        </SettingsTab>
    );
}

function NotificationSection({ settings }: { settings: typeof Settings["notifications"]; }) {
    return (
        <>
            <Forms.FormTitle tag="h5">通知の見た目</Forms.FormTitle>
            {settings.useNative !== "never" && Notification?.permission === "denied" && (
                <ErrorCard style={{ padding: "1em" }} className={Margins.bottom8}>
                    <Forms.FormTitle tag="h5">デスクトップ通知の権限を拒否しました。</Forms.FormTitle>
                    <Forms.FormText>あなたはデスクトップ通知の権限を拒否したため、デスクトップ通知は配信されません。</Forms.FormText>
                </ErrorCard>
            )}
            <Forms.FormText className={Margins.bottom8}>
                いくつかのプラグインは、あなたに通知を配信します。それには、二つのスタイルがあります。:
                <ul>
                    <li><strong>Vencordの通知</strong>: アプリ内通知も配信します。</li>
                    <li><strong>デスクトップ通知</strong>: ネイティブのデスクトップ通知 (メンションされた時の通知)</li>
                </ul>
            </Forms.FormText>
            <Select
                placeholder="通知のスタイル"
                options={[
                    { label: "Discordにフォーカスされていない場合のみ、デスクトップ通知を使用する", value: "not-focused", default: true },
                    { label: "常にデスクトップ通知を使用する", value: "always" },
                    { label: "常にVencordの通知を使用する", value: "never" },
                ] satisfies Array<{ value: typeof settings["useNative"]; } & Record<string, any>>}
                closeOnSelect={true}
                select={v => settings.useNative = v}
                isSelected={v => v === settings.useNative}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>通知の位置</Forms.FormTitle>
            <Select
                isDisabled={settings.useNative === "always"}
                placeholder="通知の位置"
                options={[
                    { label: "右下", value: "bottom-right", default: true },
                    { label: "右上", value: "top-right" },
                ] satisfies Array<{ value: typeof settings["position"]; } & Record<string, any>>}
                select={v => settings.position = v}
                isSelected={v => v === settings.position}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>通知のタイムアウト</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>自動的に通知を非表示しない場合は、0秒を選択します。</Forms.FormText>
            <Slider
                disabled={settings.useNative === "always"}
                markers={[0, 1000, 2500, 5000, 10_000, 15_000, 20_000]}
                minValue={0}
                maxValue={20_000}
                initialValue={settings.timeout}
                onValueChange={v => settings.timeout = v}
                onValueRender={v => (v / 1000).toFixed(2) + "s"}
                onMarkerRender={v => (v / 1000) + "s"}
                stickToMarkers={false}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>通知のログ制限</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>
                古い通知が削除されるまで、ログに保存される通知の量。
                <code>0</code> に設定すると、通知のログを無効にし、 <code>∞</code> に設定すると無限に通知をログします。
            </Forms.FormText>
            <Slider
                markers={[0, 25, 50, 75, 100, 150, 200]}
                minValue={0}
                maxValue={200}
                stickToMarkers={true}
                initialValue={settings.logLimit}
                onValueChange={v => settings.logLimit = v}
                onValueRender={v => v === 200 ? "∞" : v}
                onMarkerRender={v => v === 200 ? "∞" : v}
            />

            <Button
                onClick={openNotificationLogModal}
                disabled={settings.logLimit === 0}
            >
                通知のログを開く
            </Button>
        </>
    );
}

interface DonateCardProps {
    image: string;
}

function DonateCard({ image }: DonateCardProps) {
    return (
        <Card className={cl("card", "donate")}>
            <div>
                <Forms.FormTitle tag="h5">プロジェクトをサポート</Forms.FormTitle>
                <Forms.FormText>寄付をして、Vencordをサポートしましょう！</Forms.FormText>
                <DonateButton style={{ transform: "translateX(-1em)" }} />
            </div>
            <img
                role="presentation"
                src={image}
                alt=""
                height={128}
                style={{
                    imageRendering: image === SHIGGY_DONATE_IMAGE ? "pixelated" : void 0,
                    marginLeft: "auto",
                    transform: image === DEFAULT_DONATE_IMAGE ? "rotate(10deg)" : void 0
                }}
            />
        </Card>
    );
}

export default wrapTab(VencordSettings, "Vencord 設定");
