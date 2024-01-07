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

import { DataStore } from "@api/index";
import { Devs, SUPPORT_CHANNEL_ID } from "@utils/constants";
import { isPluginDev } from "@utils/misc";
import { makeCodeblock } from "@utils/text";
import definePlugin from "@utils/types";
import { isOutdated } from "@utils/updater";
import { Alerts, Forms, UserStore } from "@webpack/common";

import gitHash from "~git-hash";
import plugins from "~plugins";

import settings from "./settings";

const REMEMBER_DISMISS_KEY = "Vencord-SupportHelper-Dismiss";

const AllowedChannelIds = [
    SUPPORT_CHANNEL_ID,
    "1024286218801926184", // Vencord > #bot-spam
    "1033680203433660458", // Vencord > #v
];

export default definePlugin({
    name: "SupportHelper",
    required: true,
    description: "あなたにサポートを提供します。",
    authors: [Devs.Ven],
    dependencies: ["CommandsAPI"],

    commands: [{
        name: "vencord-debug",
        description: "Vencordのデバッグ情報を送信",
        predicate: ctx => AllowedChannelIds.includes(ctx.channel.id),
        async execute() {
            const { RELEASE_CHANNEL } = window.GLOBAL_ENV;

            const client = (() => {
                if (IS_DISCORD_DESKTOP) return `Discord Desktop v${DiscordNative.app.getVersion()}`;
                if (IS_VESKTOP) return `Vesktop v${VesktopNative.app.getVersion()}`;
                if ("armcord" in window) return `ArmCord v${window.armcord.version}`;

                // @ts-expect-error
                const name = typeof unsafeWindow !== "undefined" ? "UserScript" : "Web";
                return `${name} (${navigator.userAgent})`;
            })();

            const isApiPlugin = (plugin: string) => plugin.endsWith("API") || plugins[plugin].required;

            const enabledPlugins = Object.keys(plugins).filter(p => Vencord.Plugins.isPluginEnabled(p) && !isApiPlugin(p));
            const enabledApiPlugins = Object.keys(plugins).filter(p => Vencord.Plugins.isPluginEnabled(p) && isApiPlugin(p));

            const info = {
                Vencord: `v${VERSION} • ${gitHash}${settings.additionalInfo} - ${Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
                "Discord Branch": RELEASE_CHANNEL,
                Client: client,
                Platform: window.navigator.platform,
                Outdated: isOutdated,
                OpenAsar: "openasar" in window,
            };

            if (IS_DISCORD_DESKTOP) {
                info["Last Crash Reason"] = (await DiscordNative.processUtils.getLastCrash())?.rendererCrashReason ?? "N/A";
            }

            const debugInfo = `
**Vencord Debug Info**
>>> ${Object.entries(info).map(([k, v]) => `${k}: ${v}`).join("\n")}

Enabled Plugins (${enabledPlugins.length + enabledApiPlugins.length}):
${makeCodeblock(enabledPlugins.join(", ") + "\n\n" + enabledApiPlugins.join(", "))}
`;

            return {
                content: debugInfo.trim().replaceAll("```\n", "```")
            };
        }
    }],

    flux: {
        async CHANNEL_SELECT({ channelId }) {
            if (channelId !== SUPPORT_CHANNEL_ID) return;

            if (isPluginDev(UserStore.getCurrentUser().id)) return;

            Alerts.show({
                title: "お待ちください！",
                body: <div>
                    <Forms.FormText>あなたはVencordのサポートに連絡しようとしています。</Forms.FormText>
                    <Forms.FormText>
                        その際に、注意することがあります。それは、Vencordの日本語翻訳についてを報告してはいけないことです。
                        Vencordの日本語翻訳の問題を報告するには、雷のDiscordサーバーで報告してください。(GitHubで確認できます)
                    </Forms.FormText>
                </div>
            });

            if (isOutdated && gitHash !== await DataStore.get(REMEMBER_DISMISS_KEY)) {
                const rememberDismiss = () => DataStore.set(REMEMBER_DISMISS_KEY, gitHash);

                Alerts.show({
                    title: "お待ちください！",
                    body: <div>
                        <Forms.FormText>あなたは古いVencordJPを使用しています。新しいバージョンだと問題が修正されている可能性があります。</Forms.FormText>
                        <Forms.FormText>
                            設定のアップデートページでVencordJPをアップデートするか、VencordInstallerを使用してアップデートしてください。
                        </Forms.FormText>
                    </div>,
                    onCancel: rememberDismiss,
                    onConfirm: rememberDismiss
                });
            }
        }
    }
});
