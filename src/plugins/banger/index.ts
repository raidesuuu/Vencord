/*
 * Vencord、Discordのデスクトップアプリのための改造
 * Copyright (c) 2022 Vendicated and contributors
 *
 * このプログラムはフリーソフトウェアです: あなたはそれを再配布することができます、そして/または
 * それを修正する、フリーソフトウェア財団によって公表されたGNU General Public Licenseの
 * 条件の下で、ライセンスのバージョン3、または
 * （あなたの選択により）任意の後のバージョン。
 *
 * このプログラムは有用であることを期待して配布されます、
 * しかし、何の保証もありません; さらに暗黙の保証もありません
 * 商品性または特定の目的への適合性。 詳細については
 * GNU General Public Licenseを参照してください。
 *
 * あなたはこのプログラムと一緒にGNU General Public Licenseのコピーを
 * 受け取るべきでした。 そうでない場合は、<https://www.gnu.org/licenses/>を参照してください。
*/

import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "BANger",
    description: "BANダイアログのGIFをカスタムものに置き換えます。",
    authors: [Devs.Xinto, Devs.Glitch],
    patches: [
        {
            find: "BAN_CONFIRM_TITLE.",
            replacement: {
                match: /src:\i\("\d+"\)/g,
                replace: "src: Vencord.Settings.plugins.BANger.source"
            }
        }
    ],
    options: {
        source: {
            description: "BAN GIFを置き換えるソース（ビデオまたはGif）",
            type: OptionType.STRING,
            default: "https://i.imgur.com/wp5q52C.mp4",
            restartNeeded: true,
        }
    }
});
