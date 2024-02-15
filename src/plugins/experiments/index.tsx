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

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { ErrorCard } from "@components/ErrorCard";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Forms, React } from "@webpack/common";

const KbdStyles = findByPropsLazy("key", "removeBuildOverride");

const settings = definePluginSettings({
    enableIsStaff: {
        description: "isStaffを有効にする",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "実験",
    description: "Discordでの実験へのアクセスを有効にします！",
    authors: [
        Devs.Megu,
        Devs.Ven,
        Devs.Nickyux,
        Devs.BanTheNons,
        Devs.Nuckyz
    ],
    settings,

    patches: [
        {
            find: "Object.defineProperties(this,{isDeveloper",
            replacement: {
                match: /(?<={isDeveloper:\{[^}]+?,get:\(\)=>)\i/,
                replace: "true"
            }
        },
        {
            find: 'type:"user",revision',
            replacement: {
                match: /!(\i)&&"CONNECTION_OPEN".+?;/g,
                replace: "$1=!0;"
            }
        },
        {
            find: ".isStaff=()",
            predicate: () => settings.store.enableIsStaff,
            replacement: [
                {
                    match: /=>*?(\i)\.hasFlag\((\i\.\i)\.STAFF\)}/,
                    replace: (_, user, flags) => `=>Vencord.Webpack.Common.UserStore.getCurrentUser()?.id===${user}.id||${user}.hasFlag(${flags}.STAFF)}`
                },
                {
                    match: /hasFreePremium\(\){return this.isStaff\(\)\s*?\|\|/,
                    replace: "hasFreePremium(){return ",
                }
            ]
        },
        {
            find: 'H1,title:"Experiments"',
            replacement: {
                match: 'title:"Experiments",children:[',
                replace: "$&$self.WarningCard(),"
            }
        }
    ],

    settingsAboutComponent: () => {
        const isMacOS = navigator.platform.includes("Mac");
        const modKey = isMacOS ? "cmd" : "ctrl";
        const altKey = isMacOS ? "opt" : "alt";
        return (
            <React.Fragment>
                <Forms.FormTitle tag="h3">詳細情報</Forms.FormTitle>
                <Forms.FormText variant="text-md/normal">
                    以下の<code>isStaff</code>を有効にした後、クライアントのDevToolsを有効にすることができます{" "}
                    <kbd className={KbdStyles.key}>{modKey}</kbd> +{" "}
                    <kbd className={KbdStyles.key}>{altKey}</kbd> +{" "}
                    <kbd className={KbdStyles.key}>O</kbd>{" "}
                </Forms.FormText>
                <Forms.FormText>
                    そして、設定の<code>開発者オプション</code>タブで<code>DevToolsを有効にする</code>を切り替えます。
                </Forms.FormText>
            </React.Fragment>
        );
    },

    WarningCard: ErrorBoundary.wrap(() => (
        <ErrorCard id="vc-experiments-warning-card" className={Margins.bottom16}>
            <Forms.FormTitle tag="h2">ちょっと待って!!</Forms.FormTitle>

            <Forms.FormText>
                実験はリリースされていないDiscordの機能です。それらは動作しないか、あなたのクライアントを壊すか、あなたのアカウントを無効にする可能性があります。
            </Forms.FormText>

            <Forms.FormText className={Margins.top8}>
                あなたが何をしているのかを知っている場合にのみ、実験を使用してください。Vencordは、実験を有効にすることによって引き起こされる損害については責任を負いません。
            </Forms.FormText>
        </ErrorCard>
    ), { noop: true })
});
