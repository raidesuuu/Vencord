/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Sofia Lima
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

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher, Forms } from "@webpack/common";

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}


interface ActivityButton {
    label: string;
    url: string;
}

interface Activity {
    state: string;
    details?: string;
    timestamps?: {
        start?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: number;
    flags: number;
}

interface TrackData {
    name: string;
    album: string;
    artist: string;
    url: string;
    imageUrl?: string;
}

// only relevant enum values
const enum ActivityType {
    PLAYING = 0,
    LISTENING = 2,
}

const enum ActivityFlag {
    INSTANCE = 1 << 0,
}

const enum NameFormat {
    StatusName = "status-name",
    ArtistFirst = "artist-first",
    SongFirst = "song-first",
    ArtistOnly = "artist",
    SongOnly = "song"
}

const applicationId = "1108588077900898414";
const placeholderId = "2a96cbd8b46e442fc41c2b86b821562f";

const logger = new Logger("LastFMRichPresence");

const presenceStore = findByPropsLazy("getLocalPresence");

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationId, [key]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "LastFM",
    });
}

const settings = definePluginSettings({
    username: {
        description: "last.fmのユーザー名",
        type: OptionType.STRING,
    },
    apiKey: {
        description: "last.fmのAPIキー",
        type: OptionType.STRING,
    },
    shareUsername: {
        description: "last.fmのプロフィールへのリンクを表示",
        type: OptionType.BOOLEAN,
        default: false,
    },
    hideWithSpotify: {
        description: "Spotifyが実行中の場合、last.fmのプレゼンスを非表示",
        type: OptionType.BOOLEAN,
        default: true,
    },
    statusName: {
        description: "カスタムステータステキスト",
        type: OptionType.STRING,
        default: "音楽を聴いています",
    },
    nameFormat: {
        description: "曲名とアーティスト名をステータス名に表示",
        type: OptionType.SELECT,
        options: [
            {
                label: "カスタムステータス名を使用",
                value: NameFormat.StatusName,
                default: true
            },
            {
                label: "フォーマット 'アーティスト - 曲' を使用",
                value: NameFormat.ArtistFirst
            },
            {
                label: "フォーマット '曲 - アーティスト' を使用",
                value: NameFormat.SongFirst
            },
            {
                label: "アーティスト名のみを使用",
                value: NameFormat.ArtistOnly
            },
            {
                label: "曲名のみを使用",
                value: NameFormat.SongOnly
            }
        ],
    },
    useListeningStatus: {
        description: '"再生中"の代わりに"聴いています"のステータスを表示',
        type: OptionType.BOOLEAN,
        default: false,
    },
    missingArt: {
        description: "アルバムまたはアルバムアートが欠落している場合",
        type: OptionType.SELECT,
        options: [
            {
                label: "大きなLast.fmのロゴを使用",
                value: "lastfmLogo",
                default: true
            },
            {
                label: "一般的なプレースホルダーを使用",
                value: "placeholder"
            }
        ],
    },
    showLastFmLogo: {
        description: "show the Last.fm logo by the album cover",
        type: OptionType.BOOLEAN,
        default: true,
    }
});

export default definePlugin({
    name: "LastFMRichPresence",
    description: "Last.fmのリッチプレゼンスのための小さなプラグイン",
    authors: [Devs.dzshn, Devs.RuiNtD, Devs.blahajZip, Devs.archeruwu],

    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">APIキーの取得方法</Forms.FormTitle>
            <Forms.FormText>
                現在のトラックを取得するためにはAPIキーが必要です。取得するには、
                <Link href="https://www.last.fm/api/account/create">このページ</Link>にアクセスし、
                次の情報を入力してください：<br /> <br />

                アプリケーション名: Discord Rich Presence <br />
                アプリケーションの説明: (個人使用) <br /> <br />

                そしてAPIキー（共有シークレットではない！）をコピーします。
            </Forms.FormText>
        </>
    ),

    settings,

    start() {
        this.updatePresence();
        this.updateInterval = setInterval(() => { this.updatePresence(); }, 16000);
    },

    stop() {
        clearInterval(this.updateInterval);
    },

    async fetchTrackData(): Promise<TrackData | null> {
        if (!settings.store.username || !settings.store.apiKey)
            return null;

        try {
            const params = new URLSearchParams({
                method: "user.getrecenttracks",
                api_key: settings.store.apiKey,
                user: settings.store.username,
                limit: "1",
                format: "json"
            });

            const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
            if (!res.ok) throw `${res.status} ${res.statusText}`;

            const json = await res.json();
            if (json.error) {
                logger.error("Last.fm APIからのエラー", `${json.error}: ${json.message}`);
                return null;
            }

            const trackData = json.recenttracks?.track[0];

            if (!trackData?.["@attr"]?.nowplaying)
                return null;

            // なぜjson apiはxml構造を持っているのか
            return {
                name: trackData.name || "不明",
                album: trackData.album["#text"],
                artist: trackData.artist["#text"] || "不明",
                url: trackData.url,
                imageUrl: trackData.image?.find((x: any) => x.size === "large")?.["#text"]
            };
        } catch (e) {
            logger.error("Last.fm APIのクエリに失敗しました", e);
            // APIが失敗した場合はリッチプレゼンスをクリアします
            return null;
        }
    },

    async updatePresence() {
        setActivity(await this.getActivity());
    },

    getLargeImage(track: TrackData): string | undefined {
        if (track.imageUrl && !track.imageUrl.includes(placeholderId))
            return track.imageUrl;

        if (settings.store.missingArt === "placeholder")
            return "placeholder";
    },

    async getActivity(): Promise<Activity | null> {
        if (settings.store.hideWithSpotify) {
            for (const activity of presenceStore.getActivities()) {
                if (activity.type === ActivityType.LISTENING && activity.application_id !== applicationId) {
                    // SpotifyやricherCider（おそらく他にも）のためにすでに音楽ステータスが存在します
                    return null;
                }
            }
        }

        const trackData = await this.fetchTrackData();
        if (!trackData) return null;

        const largeImage = this.getLargeImage(trackData);
        const assets: ActivityAssets = largeImage ?
            {
                large_image: await getApplicationAsset(largeImage),
                large_text: trackData.album || undefined,
                ...(settings.store.showLastFmLogo && {
                    small_image: await getApplicationAsset("lastfm-small"),
                    small_text: "Last.fm"
                }),
            } : {
                large_image: await getApplicationAsset("lastfm-large"),
                large_text: trackData.album || undefined,
            };

        const buttons: ActivityButton[] = [
            {
                label: "曲を見る",
                url: trackData.url,
            },
        ];

        if (settings.store.shareUsername)
            buttons.push({
                label: "Last.fmのプロフィール",
                url: `https://www.last.fm/user/${settings.store.username}`,
            });

        const statusName = (() => {
            switch (settings.store.nameFormat) {
                case NameFormat.ArtistFirst:
                    return trackData.artist + " - " + trackData.name;
                case NameFormat.SongFirst:
                    return trackData.name + " - " + trackData.artist;
                case NameFormat.ArtistOnly:
                    return trackData.artist;
                case NameFormat.SongOnly:
                    return trackData.name;
                default:
                    return settings.store.statusName;
            }
        })();

        return {
            application_id: applicationId,
            name: statusName,

            details: trackData.name,
            state: trackData.artist,
            assets,

            buttons: buttons.map(v => v.label),
            metadata: {
                button_urls: buttons.map(v => v.url),
            },

            type: settings.store.useListeningStatus ? ActivityType.LISTENING : ActivityType.PLAYING,
            flags: ActivityFlag.INSTANCE,
        };
    }
});
