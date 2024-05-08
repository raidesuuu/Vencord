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

import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs, SUPPORT_CHANNEL_ID } from "@utils/constants";
import { Margins } from "@utils/margins";
import { isPluginDev } from "@utils/misc";
import { relaunch } from "@utils/native";
import { makeCodeblock } from "@utils/text";
import definePlugin from "@utils/types";
import { isOutdated, update } from "@utils/updater";
import { Alerts, Card, ChannelStore, Forms, GuildMemberStore, NavigationRouter, Parser, RelationshipStore, UserStore } from "@webpack/common";

import gitHash from "~git-hash";
import plugins from "~plugins";

import settings from "./settings";

const VENCORD_GUILD_ID = "1015060230222131221";

const AllowedChannelIds = [
    SUPPORT_CHANNEL_ID,
    "1024286218801926184", // Vencord > #bot-spam
    "1033680203433660458", // Vencord > #v
];

const TrustedRolesIds = [
    "1026534353167208489", // contributor
    "1026504932959977532", // regular
    "1042507929485586532", // donor
];

export default definePlugin({
    name: "SupportHelper",
    required: true,
    description: "私たちがあなたにサポートを提供するのを助けます",
    authors: [Devs.Ven],
    dependencies: ["CommandsAPI"],

    patches: [{
        find: ".BEGINNING_DM.format",
        replacement: {
            match: /BEGINNING_DM\.format\(\{.+?\}\),(?=.{0,100}userId:(\i\.getRecipientId\(\)))/,
            replace: "$& $self.ContributorDmWarningCard({ userId: $1 }),"
        }
    }],

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

            const info = {
                Vencord:
                    `v${VERSION} • [${gitHash}](<https://github.com/Vendicated/Vencord/commit/${gitHash}>)` +
                    `${settings.additionalInfo} - ${Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
                Client: `${RELEASE_CHANNEL} ~ ${client}`,
                Platform: window.navigator.platform
            };

            if (IS_DISCORD_DESKTOP) {
                info["最後のクラッシュの理由"] = (await DiscordNative.processUtils.getLastCrash())?.rendererCrashReason ?? "N/A";
            }

            const debugInfo = `
>>> ${Object.entries(info).map(([k, v]) => `**${k}**: ${v}`).join("\n")}

Enabled Plugins (${enabledPlugins.length}):
${makeCodeblock(enabledPlugins.join(", "))}
`;

            return {
                content: debugInfo.trim().replaceAll("```\n", "```")
            };
        }
    }],

    flux: {
        async CHANNEL_SELECT({ channelId }) {
            if (channelId !== SUPPORT_CHANNEL_ID) return;

            const selfId = UserStore.getCurrentUser()?.id;
            if (!selfId || isPluginDev(selfId)) return;

            return Alerts.show({
                title: "ちょっとまって！",
                body: <div>
                    <Forms.FormText>あなたはVencordJPを使用しています。</Forms.FormText>
                    <Forms.FormText className={Margins.top8}>
                        あなたは、VencordJPを使用しています。そのため、Vencordの公式サポートへ連絡しないでください。
                        <a href="https://vencord.dev">公式のVencord</a>を使用するか、VencordJPのissuesに連絡してください。
                    </Forms.FormText>
                </div>
            });

            // @ts-ignore outdated type
            const roles = GuildMemberStore.getSelfMember(VENCORD_GUILD_ID)?.roles;
            if (!roles || TrustedRolesIds.some(id => roles.includes(id))) return;
        }
    },

    ContributorDmWarningCard: ErrorBoundary.wrap(({ userId }) => {
        if (!isPluginDev(userId)) return null;
        if (RelationshipStore.isFriend(userId)) return null;

        return (
            <Card className={`vc-plugins-restart-card ${Margins.top8}`}>
                Please do not private message Vencord plugin developers for support!
                <br />
                Instead, use the Vencord support channel: {Parser.parse("https://discord.com/channels/1015060230222131221/1026515880080842772")}
                {!ChannelStore.getChannel(SUPPORT_CHANNEL_ID) && " (Click the link to join)"}
            </Card>
        );
    }, { noop: true })
});
