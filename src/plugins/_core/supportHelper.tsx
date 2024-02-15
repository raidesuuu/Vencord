/*
 * Vencord, Discordのデスクトップアプリのための修正
 * Copyright (c) 2023 Vendicated and contributors
 *
 * このプログラムはフリーソフトウェアです: あなたはそれを再配布することができます、そして/または
 * Free Software Foundationによって公開されたGNU General Public Licenseの
 * 条件の下でそれを変更することができます、ライセンスのバージョン3、または
 * （あなたの選択により）任意の後のバージョン。
 *
 * このプログラムは有用であることを期待して配布されます、
 * しかし、いかなる保証もありません; さらには商品性または特定の目的への適合性の
 * 暗黙の保証もありません。 詳細については
 * GNU General Public Licenseをご覧ください。
 *
 * あなたはこのプログラムと一緒にGNU General Public Licenseのコピーを
 * 受け取るべきでした。 そうでない場合は、<https://www.gnu.org/licenses/>をご覧ください。
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
    description: "私たちがあなたにサポートを提供するのを助けます",
    authors: [Devs.Ven],
    dependencies: ["CommandsAPI"],

    commands: [{
        name: "vencord-debug",
        description: "Vencord デバッグ情報を送信",
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
                Vencord: `v${VERSION} • ${gitHash}${settings.additionalInfo} - ${Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
                "Discord Branch": RELEASE_CHANNEL,
                Client: client,
                Platform: window.navigator.platform,
                Outdated: isOutdated,
                OpenAsar: "openasar" in window,
            };

            if (IS_DISCORD_DESKTOP) {
                info["最後のクラッシュの理由"] = (await DiscordNative.processUtils.getLastCrash())?.rendererCrashReason ?? "N/A";
            }

            const debugInfo = `
**Vencord デバッグ情報**
>>> ${Object.entries(info).map(([k, v]) => `${k}: ${v}`).join("\n")}

有効なプラグイン (${enabledPlugins.length + enabledApiPlugins.length}):
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

            if (isOutdated && gitHash !== await DataStore.get(REMEMBER_DISMISS_KEY)) {
                const rememberDismiss = () => DataStore.set(REMEMBER_DISMISS_KEY, gitHash);

                Alerts.show({
                    title: "ちょっと待って！",
                    body: <div>
                        <Forms.FormText>あなたはVencordの古いバージョンを使用しています！ おそらく、あなたの問題はすでに修正されています。</Forms.FormText>
                        <Forms.FormText>
                            まず、設定の更新ページを使用して更新するか、VencordInstaller（Vencord更新ボタン）
                            を使用して更新してください。更新ページにアクセスできない場合は、これを使用してください。
                        </Forms.FormText>
                    </div>,
                    onCancel: rememberDismiss,
                    onConfirm: rememberDismiss
                });
            }
        }
    }
});
