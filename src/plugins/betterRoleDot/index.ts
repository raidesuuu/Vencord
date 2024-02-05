/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Clipboard, Toasts } from "@webpack/common";

export default definePlugin({
    name: "BetterRoleDot",
    authors: [Devs.Ven, Devs.AutumnVN],
    description:
        "Roledot(アクセシビリティ設定)をクリックすると、ロールの色がコピーされ、RoleDotと色の付いた名前の両方を同時に使用できる",

    patches: [
        {
            find: ".dotBorderBase",
            replacement: {
                match: /,viewBox:"0 0 20 20"/,
                replace: "$&,onClick:()=>$self.copyToClipBoard(arguments[0].color),style:{cursor:'pointer'}",
            },
        },
        {
            find: '"dot"===',
            all: true,
            noWarn: true,
            predicate: () => Settings.plugins.BetterRoleDot.bothStyles,
            replacement: {
                match: /"(?:username|dot)"===\i(?!\.\i)/g,
                replace: "true",
            },
        },

        {
            find: ".ADD_ROLE_A11Y_LABEL",
            predicate: () => Settings.plugins.BetterRoleDot.copyRoleColorInProfilePopout && !Settings.plugins.BetterRoleDot.bothStyles,
            noWarn: true,
            replacement: {
                match: /"dot"===\i/,
                replace: "true"
            }
        },
        {
            find: ".roleVerifiedIcon",
            predicate: () => Settings.plugins.BetterRoleDot.copyRoleColorInProfilePopout && !Settings.plugins.BetterRoleDot.bothStyles,
            noWarn: true,
            replacement: {
                match: /"dot"===\i/,
                replace: "true"
            }
        }
    ],

    options: {
        bothStyles: {
            type: OptionType.BOOLEAN,
            description: "Roledotとカラーネームの両方を表示",
            restartNeeded: true,
            default: false,
        },
        copyRoleColorInProfilePopout: {
            type: OptionType.BOOLEAN,
            description: "プロフィールのポップアウトのRoledotをクリックして、ロールの色をコピー",
            restartNeeded: true,
            default: false
        }
    },

    copyToClipBoard(color: string) {
        Clipboard.copy(color);
        Toasts.show({
            message: "クリップボードにコピーしました",
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
            options: {
                duration: 1000,
                position: Toasts.Position.BOTTOM
            }
        });
    },
});
