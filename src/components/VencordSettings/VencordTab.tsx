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
import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import DonateButton from "@components/DonateButton";
import { openPluginModal } from "@components/PluginSettings/PluginModal";
import { gitRemote } from "@shared/vencordUserAgent";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { relaunch, showItemInFolder } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { Button, Card, Forms, React, Select, Switch } from "@webpack/common";

import { Flex, FolderIcon, GithubIcon, LogIcon, PaintbrushIcon, RestartIcon } from "..";
import { openNotificationSettingsModal } from "./NotificationSettings";
import { QuickAction, QuickActionCard } from "./quickActions";
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
                note: "透明化をサポートするテーマが必要です。!!ウィンドウのサイズ変更ができなくなります!!。完全な再起動が必要です"
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
                <QuickActionCard>
                    <QuickAction
                        Icon={LogIcon}
                        text="通知のログ"
                        action={openNotificationLogModal}
                    />
                    <QuickAction
                        Icon={PaintbrushIcon}
                        text="QuckCSSを編集"
                        action={() => VencordNative.quickCss.openEditor()}
                    />
                    {!IS_WEB && (
                        <QuickAction
                            Icon={RestartIcon}
                            text="Discordを再起動"
                            action={relaunch}
                        />
                    )}
                    {!IS_WEB && (
                        <QuickAction
                            Icon={FolderIcon}
                            text="設定フォルダを開く"
                            action={() => showItemInFolder(settingsDir)}
                        />
                    )}
                    <QuickAction
                        Icon={GithubIcon}
                        text="ソースコードを見る"
                        action={() => VencordNative.native.openExternal("https://github.com/Vendicated/Vencord")}
                    />
                    <QuickAction
                        Icon={GithubIcon}
                        text="ソースコードを見る(JP)"
                        action={() => VencordNative.native.openExternal("https://github.com/" + gitRemote)}
                    />
                </QuickActionCard>
            </Forms.FormSection >

            <Forms.FormDivider />;

            <Forms.FormSection className={Margins.top16} title="Settings" tag="h5">
                <Forms.FormText className={Margins.bottom20} style={{ color: "var(--text-muted)" }}>
                    ヒント：「設定」プラグインの設定で、この設定セクションの位置を変更できます！
                    {" "}<Button
                        look={Button.Looks.BLANK}
                        style={{ color: "var(--text-link)", display: "inline-block" }}
                        onClick={() => openPluginModal(Vencord.Plugins.plugins.Settings)}
                    >
                        設定プラグインの設定を開く
                    </Button>!
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
            </Forms.FormSection>;


            {
                needsVibrancySettings && <>
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
                </>
            }

            <Forms.FormSection className={Margins.top16} title="Vencordの通知" tag="h5">
                <Flex>
                    <Button onClick={openNotificationSettingsModal}>
                        通知の設定を開く
                    </Button>
                    <Button onClick={openNotificationLogModal}>
                        通知ログを開く
                    </Button>
                </Flex>
            </Forms.FormSection>
        </SettingsTab >
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
