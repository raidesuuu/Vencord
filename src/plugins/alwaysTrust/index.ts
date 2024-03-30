/*
 * Vencord、Discordのデスクトップアプリのための改造
 * Copyright (c) 2023 Vendicatedとその貢献者
 *
 * このプログラムはフリーソフトウェアです: あなたはそれを再配布することができ、または
 * Free Software Foundationによって公開されたGNU General Public Licenseの
 * 条件の下でそれを変更することができます、ライセンスのバージョン3、または
 * （あなたの選択により）任意の後続のバージョン。
 *
 * このプログラムは有用であることを期待して配布されます、
 * しかし、いかなる保証もなく; さえ暗黙の保証もなく
 * 商品性または特定の目的への適合性。 詳細については
 * GNU General Public Licenseを参照してください。
 *
 * あなたはこのプログラムと一緒にGNU General Public Licenseのコピーを
 * 受け取るべきでした。 そうでない場合は、<https://www.gnu.org/licenses/>を参照してください。
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    domain: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove the untrusted domain popup when opening links",
        restartNeeded: true
    },
    file: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove the 'Potentially Dangerous Download' popup when opening links",
        restartNeeded: true
    }
});

export default definePlugin({
    name: "常に信頼",
    description: "厄介な信頼できないドメインと怪しいファイルのポップアップを削除します",
    authors: [Devs.zt, Devs.Trwy],
    patches: [
        {
            find: '="MaskedLinkStore",',
            replacement: {
                match: /(?<=isTrustedDomain\(\i\){)return \i\(\i\)/,
                replace: "return true"
            },
            predicate: () => settings.store.domain
        },
        {
            find: "isSuspiciousDownload:",
            replacement: {
                match: /function \i\(\i\){(?=.{0,60}\.parse\(\i\))/,
                replace: "$&return null;"
            },
            predicate: () => settings.store.file
        }
    ],
    settings
});
