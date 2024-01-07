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

const enum Methods {
    Random,
    Consistent,
    Timestamp,
}

const tarExtMatcher = /\.tar\.\w+$/;

export default definePlugin({
    name: "AnonymiseFileNames",
    authors: [Devs.obscurity],
    description: "ファイル名を非公開にします。",
    patches: [
        {
            find: "instantBatchUpload:function",
            replacement: {
                match: /uploadFiles:(.{1,2}),/,
                replace:
                    "uploadFiles:(...args)=>(args[0].uploads.forEach(f=>f.filename=$self.anonymise(f.filename)),$1(...args)),",
            },
        },
    ],

    options: {
        method: {
            description: "非公開にする方法",
            type: OptionType.SELECT,
            options: [
                { label: "ランダムの文字", value: Methods.Random, default: true },
                { label: "自分でファイル名を指定する", value: Methods.Consistent },
                { label: "タイムスタンプ (4chan風)", value: Methods.Timestamp },
            ],
        },
        randomisedLength: {
            description: "ランダム文字の長さ",
            type: OptionType.NUMBER,
            default: 7,
            disabled: () => Settings.plugins.AnonymiseFileNames.method !== Methods.Random,
        },
        consistent: {
            description: "ファイル名を指定する",
            type: OptionType.STRING,
            default: "image",
            disabled: () => Settings.plugins.AnonymiseFileNames.method !== Methods.Consistent,
        },
    },

    anonymise(file: string) {
        let name = "image";
        const tarMatch = tarExtMatcher.exec(file);
        const extIdx = tarMatch?.index ?? file.lastIndexOf(".");
        const ext = extIdx !== -1 ? file.slice(extIdx) : "";

        switch (Settings.plugins.AnonymiseFileNames.method) {
            case Methods.Random:
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                name = Array.from(
                    { length: Settings.plugins.AnonymiseFileNames.randomisedLength },
                    () => chars[Math.floor(Math.random() * chars.length)]
                ).join("");
                break;
            case Methods.Consistent:
                name = Settings.plugins.AnonymiseFileNames.consistent;
                break;
            case Methods.Timestamp:
                // UNIX timestamp in nanos, i could not find a better dependency-less way
                name = `${Math.floor(Date.now() / 1000)}${Math.floor(window.performance.now())}`;
                break;
        }
        return name + ext;
    },
});
