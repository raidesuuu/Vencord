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

import { addAccessory } from "@api/MessageAccessories";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs, SUPPORT_CHANNEL_ID } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { isPluginDev, tryOrElse } from "@utils/misc";
import { relaunch } from "@utils/native";
import { onlyOnce } from "@utils/onlyOnce";
import { makeCodeblock } from "@utils/text";
import definePlugin from "@utils/types";
import { checkForUpdates, isOutdated, update } from "@utils/updater";
import { Alerts, Button, Card, ChannelStore, Forms, GuildMemberStore, Parser, RelationshipStore, showToast, Toasts, UserStore } from "@webpack/common";

import gitHash from "~git-hash";
import plugins, { PluginMeta } from "~plugins";

import settings from "./settings";

const VENCORD_GUILD_ID = "1015060230222131221";
const VENBOT_USER_ID = "1017176847865352332";
const KNOWN_ISSUES_CHANNEL_ID = "1222936386626129920";
const CodeBlockRe = /```js\n(.+?)```/s;

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

const AsyncFunction = async function () { }.constructor;

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

async function forceUpdate() {
    const outdated = await checkForUpdates();
    if (outdated) {
        await update();
        relaunch();
    }

    return outdated;
}

async function generateDebugInfoMessage() {
    const { RELEASE_CHANNEL } = window.GLOBAL_ENV;

    const client = (() => {
        if (IS_DISCORD_DESKTOP) return `Discord Desktop v${DiscordNative.app.getVersion()}`;
        if (IS_VESKTOP) return `Vesktop v${VesktopNative.app.getVersion()}`;
        if ("armcord" in window) return `ArmCord v${window.armcord.version}`;

        // @ts-expect-error
        const name = typeof unsafeWindow !== "undefined" ? "UserScript" : "Web";
        return `${name} (${navigator.userAgent})`;
    })();

    const info = {
        Vencord:
            `v${VERSION} • [${gitHash}](<https://github.com/Vendicated/Vencord/commit/${gitHash}>)` +
            `${settings.additionalInfo} - ${Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
        Client: `${RELEASE_CHANNEL} ~ ${client}`,
        Platform: window.navigator.platform
    };

    if (IS_DISCORD_DESKTOP) {
        info["Last Crash Reason"] = (await tryOrElse(() => DiscordNative.processUtils.getLastCrash(), undefined))?.rendererCrashReason ?? "N/A";
    }

    const commonIssues = {
        "NoRPC enabled": Vencord.Plugins.isPluginEnabled("NoRPC"),
        "Activity Sharing disabled": tryOrElse(() => !ShowCurrentGame.getSetting(), false),
        "Vencord DevBuild": !IS_STANDALONE,
        "Has UserPlugins": Object.values(PluginMeta).some(m => m.userPlugin),
        "More than two weeks out of date": BUILD_TIMESTAMP < Date.now() - 12096e5,
    };

    let content = `>>> ${Object.entries(info).map(([k, v]) => `**${k}**: ${v}`).join("\n")}`;
    content += "\n" + Object.entries(commonIssues)
        .filter(([, v]) => v).map(([k]) => `⚠️ ${k}`)
        .join("\n");

    return content.trim();
}

function generatePluginList() {
    const isApiPlugin = (plugin: string) => plugin.endsWith("API") || plugins[plugin].required;

    const enabledPlugins = Object.keys(plugins)
        .filter(p => Vencord.Plugins.isPluginEnabled(p) && !isApiPlugin(p));

    const enabledStockPlugins = enabledPlugins.filter(p => !PluginMeta[p].userPlugin);
    const enabledUserPlugins = enabledPlugins.filter(p => PluginMeta[p].userPlugin);


    let content = `**Enabled Plugins (${enabledStockPlugins.length}):**\n${makeCodeblock(enabledStockPlugins.join(", "))}`;

    if (enabledUserPlugins.length) {
        content += `**Enabled UserPlugins (${enabledUserPlugins.length}):**\n${makeCodeblock(enabledUserPlugins.join(", "))}`;
    }

    return content;
}

const checkForUpdatesOnce = onlyOnce(checkForUpdates);

export default definePlugin({
    name: "SupportHelper",
    required: true,
    description: "私たちがあなたにサポートを提供するのを助けます",
    authors: [Devs.Ven],
    dependencies: ["CommandsAPI", "UserSettingsAPI", "MessageAccessoriesAPI"],

    patches: [{
        find: ".BEGINNING_DM.format",
        replacement: {
            match: /BEGINNING_DM\.format\(\{.+?\}\),(?=.{0,100}userId:(\i\.getRecipientId\(\)))/,
            replace: "$& $self.ContributorDmWarningCard({ userId: $1 }),"
        }
    }],

    commands: [
        {
            name: "vencord-debug",
            description: "Vencordのデバッグ情報を送信する",
            predicate: ctx => isPluginDev(UserStore.getCurrentUser()?.id) || AllowedChannelIds.includes(ctx.channel.id),
            execute: async () => ({ content: await generateDebugInfoMessage() })
        },
        {
            name: "vencord-plugins",
            description: "Vencordのプラグインリストを送信する",
            predicate: ctx => isPluginDev(UserStore.getCurrentUser()?.id) || AllowedChannelIds.includes(ctx.channel.id),
            execute: () => ({ content: generatePluginList() })
        }
    ],

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
        }
    },

    ContributorDmWarningCard: ErrorBoundary.wrap(({ userId }) => {
        if (!isPluginDev(userId)) return null;
        if (RelationshipStore.isFriend(userId) || isPluginDev(UserStore.getCurrentUser()?.id)) return null;

        return (
            <Card className={`vc-plugins-restart-card ${Margins.top8}`}>
                Please do not private message Vencord plugin developers for support!
                <br />
                Instead, use the Vencord support channel: {Parser.parse("https://discord.com/channels/1015060230222131221/1026515880080842772")}
                {!ChannelStore.getChannel(SUPPORT_CHANNEL_ID) && " (Click the link to join)"}
            </Card>
        );
    }, { noop: true }),

    start() {
        addAccessory("vencord-debug", props => {
            const buttons = [] as JSX.Element[];

            const shouldAddUpdateButton =
                !IS_UPDATER_DISABLED
                && (
                    (props.channel.id === KNOWN_ISSUES_CHANNEL_ID) ||
                    (props.channel.id === SUPPORT_CHANNEL_ID && props.message.author.id === VENBOT_USER_ID)
                )
                && props.message.content?.includes("update");

            if (shouldAddUpdateButton) {
                buttons.push(
                    <Button
                        key="vc-update"
                        color={Button.Colors.GREEN}
                        onClick={async () => {
                            try {
                                if (await forceUpdate())
                                    showToast("Success! Restarting...", Toasts.Type.SUCCESS);
                                else
                                    showToast("Already up to date!", Toasts.Type.MESSAGE);
                            } catch (e) {
                                new Logger(this.name).error("Error while updating:", e);
                                showToast("Failed to update :(", Toasts.Type.FAILURE);
                            }
                        }}
                    >
                        Update Now
                    </Button>
                );
            }

            if (props.channel.id === SUPPORT_CHANNEL_ID) {
                if (props.message.content.includes("/vencord-debug") || props.message.content.includes("/vencord-plugins")) {
                    buttons.push(
                        <Button
                            key="vc-dbg"
                            onClick={async () => sendMessage(props.channel.id, { content: await generateDebugInfoMessage() })}
                        >
                            Run /vencord-debug
                        </Button>,
                        <Button
                            key="vc-plg-list"
                            onClick={async () => sendMessage(props.channel.id, { content: generatePluginList() })}
                        >
                            Run /vencord-plugins
                        </Button>
                    );
                }

                if (props.message.author.id === VENBOT_USER_ID) {
                    const match = CodeBlockRe.exec(props.message.content || props.message.embeds[0]?.rawDescription || "");
                    if (match) {
                        buttons.push(
                            <Button
                                key="vc-run-snippet"
                                onClick={async () => {
                                    try {
                                        await AsyncFunction(match[1])();
                                        showToast("Success!", Toasts.Type.SUCCESS);
                                    } catch (e) {
                                        new Logger(this.name).error("Error while running snippet:", e);
                                        showToast("Failed to run snippet :(", Toasts.Type.FAILURE);
                                    }
                                }}
                            >
                                Run Snippet
                            </Button>
                        );
                    }
                }
            }

            return buttons.length
                ? <Flex>{buttons}</Flex>
                : null;
        });
    },
});
