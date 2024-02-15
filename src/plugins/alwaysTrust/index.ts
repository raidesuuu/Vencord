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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "常に信頼",
    description: "厄介な信頼できないドメインと怪しいファイルのポップアップを削除します",
    authors: [Devs.zt],
    patches: [
        {
            find: ".displayName=\"MaskedLinkStore\"",
            replacement: {
                match: /(?<=isTrustedDomain\(\i\){)return \i\(\i\)/,
                replace: "return true"
            }
        },
        {
            find: "isSuspiciousDownload:",
            replacement: {
                match: /function \i\(\i\){(?=.{0,60}\.parse\(\i\))/,
                replace: "$&return null;"
            }
        }
    ]
});
