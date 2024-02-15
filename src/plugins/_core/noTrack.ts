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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoTrack",
    description: "Discordのトラッキング（'science'）、メトリクス、Sentryクラッシュレポートを無効にする",
    authors: [Devs.Cyn, Devs.Ven, Devs.Nuckyz, Devs.Arrow],
    required: true,
    patches: [
        {
            find: "AnalyticsActionHandlers.handle",
            replacement: {
                match: /^.+$/,
                replace: "()=>{}",
            },
        },
        {
            find: "window.DiscordSentry=",
            replacement: {
                match: /^.+$/,
                replace: "()=>{}",
            }
        },
        {
            find: ".METRICS,",
            replacement: [
                {
                    match: /this\._intervalId=/,
                    replace: "this._intervalId=undefined&&"
                },
                {
                    match: /(increment\(\i\){)/,
                    replace: "$1return;"
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
    ]
});
