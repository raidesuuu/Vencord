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
        fallbackValue: "読み込み中..."
    });
    const settings = useSettings();

    const donateImage = React.useMemo(() => Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE, []);

    const isWindows = navigator.platform.toLowerCase().startsWith("win");
    const isMac = navigator.platform.toLowerCase().startsWith("mac");
    const needsVibrancySettings = IS_DISCORD_DESKTOP && isMac;

    const Switches: Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        note: string;
    }> =
        [
            {
                key: "useQuickCss",
                title: "カスタムCSSを有効にする",
                note: "カスタムCSSを読み込みます"
            },
            !IS_WEB && {
                key: "enableReactDevtools",
                title: "React Developer Toolsを有効にする",
                note: "完全な再起動が必要です"
            },
            !IS_WEB && (!IS_DISCORD_DESKTOP || !isWindows ? {
                key: "frameless",
                title: "ウィンドウフレームを無効にする",
                note: "完全な再起動が必要です"
            } : {
                key: "winNativeTitleBar",
                title: "Discordのカスタムタイトルバーの代わりにWindowsのネイティブタイトルバーを使用する",
                note: "完全な再起動が必要です"
            }),
            !IS_WEB && {
                key: "transparent",
                title: "ウィンドウの透明化を有効にする",
                note: "透明化をサポートするテーマが必要です。ウィンドウのサイズ変更ができなくなります。完全な再起動が必要です"
            },
            !IS_WEB && isWindows && {
                key: "winCtrlQ",
                title: "Discordを閉じるショートカットとしてCtrl+Qを登録する（Alt+F4の代替）",
                note: "完全な再起動が必要です"
            },
            IS_DISCORD_DESKTOP && {
                key: "disableMinSize",
                title: "最小ウィンドウサイズを無効にする",
                note: "完全な再起動が必要です"
            },
        ];

    return (
        <SettingsTab title="Vencordの設定">
            <DonateCard image={donateImage} />
            <Forms.FormSection title="クイックアクション">
                <Card className={cl("quick-actions-card")}>
                    <React.Fragment>
                        {!IS_WEB && (
                            <Button
                                onClick={relaunch}
                                size={Button.Sizes.SMALL}>
                                Restart Client
                            </Button>
                        )}
                        <Button
                            onClick={() => VencordNative.quickCss.openEditor()}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDir === "Loading..."}>
                            クイックCSSファイルを開く
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
                            onClick={() => VencordNative.native.openExternal("https://github.com/Vendicated/Vencord")}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDirPending}>
                            GitHubで開く(オリジナル)
                        </Button>
                        <Button
                            onClick={() => VencordNative.native.openExternal("https://github.com/VencordJP/Vencord")}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDirPending}>
                            GitHubで開く(JP)
                        </Button>
                    </React.Fragment>
                </Card>
            </Forms.FormSection>

            <Forms.FormDivider />

            <Forms.FormSection className={Margins.top16} title="設定" tag="h5">
                <Forms.FormText className={Margins.bottom20}>
                    ヒント：「設定」プラグインの設定で、この設定セクションの位置を変更できます！
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
                <Forms.FormTitle tag="h5">ウィンドウの透明度設定 (再起動が必要)</Forms.FormTitle>
                <Select
                    className={Margins.bottom20}
                    placeholder="ウィンドウの透明度設定"
                    options={[
                        // 最も不透明から最も透明に並べ替えられた順に並べる
                        {
                            label: "透明度なし", value: undefined
                        },
                        {
                            label: "ページの下（ウィンドウの色調整）",
                            value: "under-page"
                        },
                        {
                            label: "コンテンツ",
                            value: "content"
                        },
                        {
                            label: "ウィンドウ",
                            value: "window"
                        },
                        {
                            label: "選択",
                            value: "selection"
                        },
                        {
                            label: "タイトルバー",
                            value: "titlebar"
                        },
                        {
                            label: "ヘッダー",
                            value: "header"
                        },
                        {
                            label: "サイドバー",
                            value: "sidebar"
                        },
                        {
                            label: "ツールチップ",
                            value: "tooltip"
                        },
                        {
                            label: "メニュー",
                            value: "menu"
                        },
                        {
                            label: "ポップオーバー",
                            value: "popover"
                        },
                        {
                            label: "フルスクリーンUI（透明ですがわずかに静か）",
                            value: "fullscreen-ui"
                        },
                        {
                            label: "HUD（最も透明）",
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
            <Forms.FormTitle tag="h5">通知のスタイル</Forms.FormTitle>
            {settings.useNative !== "never" && Notification?.permission === "denied" && (
                <ErrorCard style={{ padding: "1em" }} className={Margins.bottom8}>
                    <Forms.FormTitle tag="h5">デスクトップ通知が拒否されました</Forms.FormTitle>
                    <Forms.FormText>あなたはデスクトップ通知を設定で無効にしました。そのため、デスクトップ通知を受信できません。</Forms.FormText>
                </ErrorCard>
            )}
            <Forms.FormText className={Margins.bottom8}>
                一部のプラグインは通知を表示する場合があります。これらには2つのスタイルがあります：
                <ul>
                    <li><strong>Vencordの通知</strong>: これらはアプリ内通知です</li>
                    <li><strong>デスクトップ通知</strong>: ネイティブのデスクトップ通知（例：メンションを受け取ったとき）</li>
                </ul>
            </Forms.FormText>
            <Select
                placeholder="通知スタイル"
                options={[
                    { label: "Discordがフォーカスされていない場合にのみデスクトップ通知を使用する", value: "not-focused", default: true },
                    { label: "常にデスクトップ通知を使用する", value: "always" },
                    { label: "常にVencord通知を使用する", value: "never" },
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
            <Forms.FormText className={Margins.bottom16}>自動的にタイムアウトしないようにするには、0秒に設定します</Forms.FormText>
            <Slider
                disabled={settings.useNative === "always"}
                markers={[0, 1000, 2500, 5000, 10_000, 20_000]}
                minValue={0}
                maxValue={20_000}
                initialValue={settings.timeout}
                onValueChange={v => settings.timeout = v}
                onValueRender={v => (v / 1000).toFixed(2) + "秒"}
                onMarkerRender={v => (v / 1000) + "秒"}
                stickToMarkers={false}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>通知ログの制限</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>
                古い通知が削除されるまでログに保存する通知の数。
                通知ログを無効にするには<code>0</code>、古い通知を自動的に削除しないには<code>∞</code>に設定します
            </Forms.FormText>
            <Slider
                markers={[0, 25, 50, 75, 100, 200]}
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
                通知ログを開く
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
                <Forms.FormTitle tag="h5">プロジェクトのサポート</Forms.FormTitle>
                <Forms.FormText>Vencordの開発をサポートするために寄付をご検討ください！</Forms.FormText>
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

export default wrapTab(VencordSettings, "Vencordの設定");
