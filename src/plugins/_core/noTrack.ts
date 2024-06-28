/*
 * Vencord、Discordのデスクトップアプリのための改造
 * Copyright (c) 2022 Vendicatedとその貢献者
 *
 * このプログラムはフリーソフトウェアです: あなたはそれを再配布することができ、または
 * Free Software Foundationによって公開されたGNU General Public Licenseの
 * 条件の下でそれを変更することができます、ライセンスのバージョン3、または
 * （あなたの選択により）任意の後のバージョン。
 *
 * このプログラムは有用であることを期待して配布されます、
 * しかし、何の保証もありません; さらには商品性または特定の目的への適合性の黙示的な保証もありません。
 * 詳細についてはGNU General Public Licenseを参照してください。
 *
 * あなたはこのプログラムと一緒にGNU General Public Licenseのコピーを受け取るべきでした。
 * そうでない場合は、<https://www.gnu.org/licenses/>を参照してください。
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";

const settings = definePluginSettings({
    disableAnalytics: {
        type: OptionType.BOOLEAN,
        description: "Disable Discord's tracking (analytics/'science')",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "NoTrack",
    description: "Discordのトラッキング（アナリティクス/'science'）、メトリクス、Sentryクラッシュレポートを無効にする",
    authors: [Devs.Cyn, Devs.Ven, Devs.Nuckyz, Devs.Arrow],
    required: true,

    settings,

    patches: [
        {
            find: "AnalyticsActionHandlers.handle",
            predicate: () => settings.store.disableAnalytics,
            replacement: {
                match: /^.+$/,
                replace: "()=>{}",
            },
        },
        {
            find: ".METRICS,",
            replacement: [
                {
                    match: /this\._intervalId=/,
                    replace: "this._intervalId=void 0&&"
                },
                {
                    match: /(?:increment|distribution)\(\i(?:,\i)?\){/g,
                    replace: "$&return;"
                }
            ]
        },
        {
            find: ".installedLogHooks)",
            replacement: {
                // getDebugLogging()がfalseを返す場合、フックはインストールされません。
                match: "getDebugLogging(){",
                replace: "getDebugLogging(){return false;"
            }
        },
    ],

    startAt: StartAt.Init,
    start() {
        Object.defineProperty(window, "DiscordSentry", {
            configurable: true,
            set() {
                Reflect.deleteProperty(window, "DiscordSentry");
            }
        });
    }
});
