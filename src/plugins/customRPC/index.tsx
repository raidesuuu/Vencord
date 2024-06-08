/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { definePluginSettings, Settings } from "@api/Settings";
import { ErrorCard } from "@components/ErrorCard";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ApplicationAssetUtils, Button, FluxDispatcher, Forms, GuildStore, React, SelectedChannelStore, SelectedGuildStore, StatusSettingsStores, UserStore } from "@webpack/common";

const useProfileThemeStyle = findByCodeLazy("profileThemeStyle:", "--profile-gradient-primary-color");
const ActivityComponent = findComponentByCodeLazy("onOpenGameProfile");
const ActivityClassName = findByPropsLazy("activity", "buttonColor");

async function getApplicationAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds(settings.store.appID!, [key]))[0];
}

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state?: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: ActivityType;
    url?: string;
    flags: number;
}

const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}

const enum TimestampMode {
    NONE,
    NOW,
    TIME,
    CUSTOM,
}

const settings = definePluginSettings({
    appID: {
        type: OptionType.STRING,
        description: "アプリケーションID（必須）",
        onChange: onChange,
        isValid: (value: string) => {
            if (!value) return "アプリケーションIDが必要です。";
            if (value && !/^\d+$/.test(value)) return "アプリケーションIDは数字である必要があります";
            return true;
        }
    },
    appName: {
        type: OptionType.STRING,
        description: "アプリケーション名 （必須）",
        onChange: onChange,
        isValid: (value: string) => {
            if (!value) return "アプリケーション名は必須です。";
            if (value.length > 128) return "アプリケーション名は128文字以内でお願いします。";
            return true;
        }
    },
    details: {
        type: OptionType.STRING,
        description: "詳細 （２行目）",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 128) return "詳細（１行目）は128文字以内でお願いします。";
            return true;
        }
    },
    state: {
        type: OptionType.STRING,
        description: "状態 （２行目）",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 128) return "状態（２行目）は128文字以内でお願いします。";
            return true;
        }
    },
    type: {
        type: OptionType.SELECT,
        description: "アクティビティの状態",
        onChange: onChange,
        options: [
            {
                label: "プレイ中",
                value: ActivityType.PLAYING,
                default: true
            },
            {
                label: "配信中",
                value: ActivityType.STREAMING
            },
            {
                label: "再生中",
                value: ActivityType.LISTENING
            },
            {
                label: "視聴中",
                value: ActivityType.WATCHING
            },
            {
                label: "競合中",
                value: ActivityType.COMPETING
            }
        ]
    },
    streamLink: {
        type: OptionType.STRING,
        description: "Twitch.tv またはYouTube.comのリンク（配信中の状態が選択されている場合のみ）",
        onChange: onChange,
        disabled: isStreamLinkDisabled,
        isValid: isStreamLinkValid
    },
    timestampMode: {
        type: OptionType.SELECT,
        description: "タイムスタンプモード",
        onChange: onChange,
        options: [
            {
                label: "なし",
                value: TimestampMode.NONE,
                default: true
            },
            {
                label: "Discordが開いてから",
                value: TimestampMode.NOW
            },
            {
                label: "現在時刻と同じ",
                value: TimestampMode.TIME
            },
            {
                label: "カスタム",
                value: TimestampMode.CUSTOM
            }
        ]
    },
    startTime: {
        type: OptionType.NUMBER,
        description: "タイムスタンプをミリ秒で開始（カスタムタイムスタンプモードのみ）",
        onChange: onChange,
        disabled: isTimestampDisabled,
        isValid: (value: number) => {
            if (value && value < 0) return "開始のタイムスタンプは0より大きい必要があります";
            return true;
        }
    },
    endTime: {
        type: OptionType.NUMBER,
        description: "タイムスタンプをミリ秒で終了（タイムスタンプモードがカスタムの場合のみ）",
        onChange: onChange,
        disabled: isTimestampDisabled,
        isValid: (value: number) => {
            if (value && value < 0) return "終了のタイムスタンプは0より大きい必要があります";
            return true;
        }
    },
    imageBig: {
        type: OptionType.STRING,
        description: "ビッグイメージのキー／リンク",
        onChange: onChange,
        isValid: isImageKeyValid
    },
    imageBigTooltip: {
        type: OptionType.STRING,
        description: "ビッグイメージのツールチップ",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 128) return "ビッグイメージのツールチップは128文字以内である必要があります。";
            return true;
        }
    },
    imageSmall: {
        type: OptionType.STRING,
        description: "スモールイメージのキー／リンク",
        onChange: onChange,
        isValid: isImageKeyValid
    },
    imageSmallTooltip: {
        type: OptionType.STRING,
        description: "スモールイメージのツールチップ",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 128) return "スモールイメージのツールチップは128文字以内である必要があります。";
            return true;
        }
    },
    buttonOneText: {
        type: OptionType.STRING,
        description: "ボタン１のテキスト",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 31) return "ボタン１のテキストは31文字以内である必要があります。";
            return true;
        }
    },
    buttonOneURL: {
        type: OptionType.STRING,
        description: "ボタン１のURL",
        onChange: onChange
    },
    buttonTwoText: {
        type: OptionType.STRING,
        description: "ボタン２のテキスト",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 31) return "ボタン２のテキストは31文字以内である必要があります。";
            return true;
        }
    },
    buttonTwoURL: {
        type: OptionType.STRING,
        description: "ボタン２のURL",
        onChange: onChange
    }
});

function onChange() {
    setRpc(true);
    if (Settings.plugins.CustomRPC.enabled) setRpc();
}

function isStreamLinkDisabled() {
    return settings.store.type !== ActivityType.STREAMING;
}

function isStreamLinkValid(value: string) {
    if (!isStreamLinkDisabled() && !/https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+/.test(value)) return "Streaming link must be a valid URL.";
    return true;
}

function isTimestampDisabled() {
    return settings.store.timestampMode !== TimestampMode.CUSTOM;
}

function isImageKeyValid(value: string) {
    if (/https?:\/\/(?!i\.)?imgur\.com\//.test(value)) return "Imgurのリンクは画像へのダイレクトリンクでなければなりません。 (例. https://i.imgur.com/...)";
    if (/https?:\/\/(?!media\.)?tenor\.com\//.test(value)) return "Tenorのリンクは画像へのダイレクトリンクでなければなりません。 (例. https://media.tenor.com/...)";
    return true;
}

async function createActivity(): Promise<Activity | undefined> {
    const {
        appID,
        appName,
        details,
        state,
        type,
        streamLink,
        startTime,
        endTime,
        imageBig,
        imageBigTooltip,
        imageSmall,
        imageSmallTooltip,
        buttonOneText,
        buttonOneURL,
        buttonTwoText,
        buttonTwoURL
    } = settings.store;

    if (!appName) return;

    const activity: Activity = {
        application_id: appID || "0",
        name: appName,
        state,
        details,
        type,
        flags: 1 << 0,
    };

    if (type === ActivityType.STREAMING) activity.url = streamLink;

    switch (settings.store.timestampMode) {
        case TimestampMode.NOW:
            activity.timestamps = {
                start: Date.now()
            };
            break;
        case TimestampMode.TIME:
            activity.timestamps = {
                start: Date.now() - (new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds()) * 1000
            };
            break;
        case TimestampMode.CUSTOM:
            if (startTime || endTime) {
                activity.timestamps = {};
                if (startTime) activity.timestamps.start = startTime;
                if (endTime) activity.timestamps.end = endTime;
            }
            break;
        case TimestampMode.NONE:
        default:
            break;
    }

    if (buttonOneText) {
        activity.buttons = [
            buttonOneText,
            buttonTwoText
        ].filter(isTruthy);

        activity.metadata = {
            button_urls: [
                buttonOneURL,
                buttonTwoURL
            ].filter(isTruthy)
        };
    }

    if (imageBig) {
        activity.assets = {
            large_image: await getApplicationAsset(imageBig),
            large_text: imageBigTooltip || undefined
        };
    }

    if (imageSmall) {
        activity.assets = {
            ...activity.assets,
            small_image: await getApplicationAsset(imageSmall),
            small_text: imageSmallTooltip || undefined
        };
    }


    for (const k in activity) {
        if (k === "type") continue;
        const v = activity[k];
        if (!v || v.length === 0)
            delete activity[k];
    }

    return activity;
}

async function setRpc(disable?: boolean) {
    const activity: Activity | undefined = await createActivity();

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: !disable ? activity : null,
        socketId: "CustomRPC",
    });
}

export default definePlugin({
    name: "CustomRPC",
    description: "自分で作成したRPCを設定する",
    authors: [Devs.captain, Devs.AutumnVN, Devs.nin0dev],
    start: setRpc,
    stop: () => setRpc(true),
    settings,

    settingsAboutComponent: () => {
        const activity = useAwaiter(createActivity);
        const gameActivityEnabled = StatusSettingsStores.ShowCurrentGame.useSetting();
        const { profileThemeStyle } = useProfileThemeStyle({});

        return (
            <>
                {!gameActivityEnabled && (
                    <ErrorCard
                        className={classes(Margins.top16, Margins.bottom16)}
                        style={{ padding: "1em" }}
                    >
                        <Forms.FormTitle>Notice</Forms.FormTitle>
                        <Forms.FormText>Game activity isn't enabled, people won't be able to see your custom rich presence!</Forms.FormText>

                        <Button
                            color={Button.Colors.TRANSPARENT}
                            className={Margins.top8}
                            onClick={() => StatusSettingsStores.ShowCurrentGame.updateSetting(true)}
                        >
                            Enable
                        </Button>
                    </ErrorCard>
                )}

                <Forms.FormText>
                    最初に <Link href="https://discord.com/developers/applications">Discord Developer Portal</Link> に行ってアプリケーションを作り、アプリケーションIDを取得する必要があります
                </Forms.FormText>
                <Forms.FormText>
                    Rich Presenceタブで画像をアップロードしてイメージキーを取得します
                </Forms.FormText>
                <Forms.FormText>
                    画像リンクを使用したい場合は、画像をダウンロードし <Link href="https://imgur.com">Imgur</Link> に画像を再アップロードし、画像を右クリックして「画像アドレスをコピー」を選択して画像リンクを取得します。
                </Forms.FormText>

                <Forms.FormDivider className={Margins.top8} />

                <div style={{ width: "284px", ...profileThemeStyle }}>
                    {activity[0] && <ActivityComponent activity={activity[0]} className={ActivityClassName.activity} channelId={SelectedChannelStore.getChannelId()}
                        guild={GuildStore.getGuild(SelectedGuildStore.getLastSelectedGuildId())}
                        application={{ id: settings.store.appID }}
                        user={UserStore.getCurrentUser()} />}
                </div>
            </>
        );
    }
});
