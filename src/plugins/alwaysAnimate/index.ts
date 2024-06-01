/*
 * Vencord、Discordのデスクトップアプリのための改変
 * Copyright (c) 2023 Vendicatedと貢献者
 *
 * このプログラムはフリーソフトウェアです: あなたはそれを再配布することができます、そして/または
 * それを修正する、自由ソフトウェア財団によって公表されたGNU一般公衆ライセンスの
 * 条項の下で、ライセンスのバージョン3、または
 * （あなたの選択により）任意の後のバージョン。
 *
 * このプログラムは有用であることを期待して配布されます、
 * しかし、何の保証もなしに; さえ暗黙の保証もなし
 * 商品性または特定の目的への適合性。 詳細については
 * GNU一般公衆ライセンスを参照してください。
 *
 * あなたはこのプログラムと一緒にGNU一般公衆ライセンスのコピーを
 * 受け取るべきでした。 そうでない場合は、<https://www.gnu.org/licenses/>を参照してください。
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "常にアニメーション",
    description: "アニメーション可能なものは何でもアニメーションします",
    authors: [Devs.FieryFlames],

    patches: [
        {
            find: "canAnimate:",
            all: true,
            // 一部のモジュールはfindに一致しますが、置換はそのまま返されます
            noWarn: true,
            replacement: {
                match: /canAnimate:.+?([,}].*?\))/g,
                replace: (m, rest) => {
                    const destructuringMatch = rest.match(/}=.+/);
                    if (destructuringMatch == null) return `canAnimate:!0${rest}`;
                    return m;
                }
            }
        },
        {
            // ステータス絵文字
            find: ".Messages.GUILD_OWNER,",
            replacement: {
                match: /(?<=\.activityEmoji,.+?animate:)\i/,
                replace: "!0"
            }
        },
        {
            // ギルドバナー
            find: ".animatedBannerHoverLayer,onMouseEnter:",
            replacement: {
                match: /(?<=guildBanner:\i,animate:)\i(?=}\))/,
                replace: "!0"
            }
        }
    ]
});
