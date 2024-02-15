/*
 * Vencord、Discordのデスクトップアプリのための改変
 * Copyright (c) 2022 Vendicated and contributors
 *
 * このプログラムはフリーソフトウェアです: あなたはそれを再配布することができます、そして/または
 * それを変更する、フリーソフトウェア財団によって公表されたGNU General Public Licenseの
 * 条件の下で、ライセンスのバージョン3、または
 * （あなたの選択により）任意の後のバージョン。
 *
 * このプログラムは有用であることを期待して配布されます、
 * しかし、何の保証もありません; さらには、暗黙の保証もありません
 * 商品性または特定の目的への適合性。 詳細については
 * GNU General Public Licenseを参照してください。
 *
 * あなたはこのプログラムと一緒にGNU General Public Licenseのコピーを
 * 受け取るべきでした。 そうでない場合は、<https://www.gnu.org/licenses/>を参照してください。
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "コマンドAPI",
    authors: [Devs.Arjix],
    description: "コマンドを使用するものに必要なAPI",
    patches: [
        // BUILT_IN_COMMANDS インスタンスを取得
        {
            find: ',"tenor"',
            replacement: [
                {
                    // BUILT_IN_COMMANDSに一致します。これはエクスポートされていないので、これが唯一の方法です。
                    // _init()は同じオブジェクトを返すだけで、パッチを簡単にします。

                    // textCommands = builtInCommands.filter(...)
                    match: /(?<=\w=)(\w)(\.filter\(.{0,60}tenor)/,
                    replace: "Vencord.Api.Commands._init($1)$2",
                }
            ],
        },
        // コマンドエラーハンドリング
        {
            find: "Unexpected value for option",
            replacement: {
                // return [2, cmd.execute(args, ctx)]
                match: /,(\i)\.execute\((\i),(\i)\)/,
                replace: (_, cmd, args, ctx) => `,Vencord.Api.Commands._handleCommand(${cmd}, ${args}, ${ctx})`
            }
        },
        // "Built-In"の代わりにプラグイン名を表示
        {
            find: ".source,children",
            replacement: {
                // ...children: p?.name
                match: /(?<=:(.{1,3})\.displayDescription\}.{0,200}\.source,children:)[^}]+/,
                replace: "$1.plugin||($&)"
            }
        }
    ],
});
