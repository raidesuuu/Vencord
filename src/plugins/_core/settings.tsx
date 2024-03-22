/*
 * Vencord、Discordのデスクトップアプリの改造
 * 著作権 (c) 2022 Vendicated および Megumin
 *
 * このプログラムはフリーソフトウェアです。再配布や修正は
 * GNU General Public License の条件の下で行うことができます。
 * このプログラムは無保証です。詳細は
 * GNU General Public License を参照してください。
 * プログラムと一緒に GNU General Public License のコピーが
 * 提供されているはずです。もし提供されていない場合は、
 * <https://www.gnu.org/licenses/> を参照してください。
*/

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import gitHash from "~git-hash";

export default definePlugin({
    name: "Settings",
    description: "設定UIとデバッグ情報を追加します",
    authors: [Devs.Ven, Devs.Megu],
    required: true,

    patches: [{
        find: ".versionHash",
        replacement: [
            {
                match: /\[\(0,.{1,3}\.jsxs?\)\((.{1,10}),(\{[^{}}]+\{.{0,20}.versionHash,.+?\})\)," "/,
                replace: (m, component, props) => {
                    props = props.replace(/children:\[.+\]/, "");
                    return `${m},Vencord.Plugins.plugins.Settings.makeInfoElements(${component}, ${props})`;
                }
            }
        ]
    }, {
        find: "Messages.ACTIVITY_SETTINGS",
        replacement: {
            get match() {
                switch (Settings.plugins.Settings.settingsLocation) {
                    case "top": return /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.USER_SETTINGS\}/;
                    case "aboveNitro": return /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.BILLING_SETTINGS\}/;
                    case "belowNitro": return /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.APP_SETTINGS\}/;
                    case "belowActivity": return /(?<=\{section:(\i\.\i)\.DIVIDER},)\{section:"changelog"/;
                    case "bottom": return /\{section:(\i\.\i)\.CUSTOM,\s*element:.+?}/;
                    case "aboveActivity":
                    default:
                        return /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.ACTIVITY_SETTINGS\}/;
                }
            },
            replace: "...$self.makeSettingsCategories($1),$&"
        }
    }, {
        find: "Messages.USER_SETTINGS_ACTIONS_MENU_LABEL",
        replacement: {
            match: /(?<=function\((\i),\i\)\{)(?=let \i=Object.values\(\i.UserSettingsSections\).*?(\i)\.default\.open\()/,
            replace: "$2.default.open($1);return;"
        }
    }],

    customSections: [] as ((SectionTypes: Record<string, unknown>) => any)[],

    makeSettingsCategories(SectionTypes: Record<string, unknown>) {
        return [
            {
                section: SectionTypes.HEADER,
                label: "Vencord",
                className: "vc-settings-header"
            },
            {
                section: "VencordSettings",
                label: "Vencord",
                element: require("@components/VencordSettings/VencordTab").default,
                className: "vc-settings"
            },
            {
                section: "VencordPlugins",
                label: "プラグイン",
                element: require("@components/VencordSettings/PluginsTab").default,
                className: "vc-plugins"
            },
            {
                section: "VencordThemes",
                label: "テーマ",
                element: require("@components/VencordSettings/ThemesTab").default,
                className: "vc-themes"
            },
            !IS_UPDATER_DISABLED && {
                section: "VencordUpdater",
                label: "更新",
                element: require("@components/VencordSettings/UpdaterTab").default,
                className: "vc-updater"
            },
            {
                section: "VencordCloud",
                label: "クラウド",
                element: require("@components/VencordSettings/CloudTab").default,
                className: "vc-cloud"
            },
            {
                section: "VencordSettingsSync",
                label: "バックアップと復元",
                element: require("@components/VencordSettings/BackupAndRestoreTab").default,
                className: "vc-backup-restore"
            },
            IS_DEV && {
                section: "VencordPatchHelper",
                label: "パッチヘルパー",
                element: require("@components/VencordSettings/PatchHelperTab").default,
                className: "vc-patch-helper"
            },
            ...this.customSections.map(func => func(SectionTypes)),
            {
                section: SectionTypes.DIVIDER
            }
        ].filter(Boolean);
    },

    options: {
        settingsLocation: {
            type: OptionType.SELECT,
            description: "Vencordの設定セクションを配置する場所",
            options: [
                { label: "一番上", value: "top" },
                { label: "Nitroセクションの上", value: "aboveNitro" },
                { label: "Nitroセクションの下", value: "belowNitro" },
                { label: "アクティビティ設定の上", value: "aboveActivity", default: true },
                { label: "アクティビティ設定の下", value: "belowActivity" },
                { label: "一番下", value: "bottom" },
            ],
            restartNeeded: true
        },
    },

    get electronVersion() {
        return VencordNative.native.getVersions().electron || window.armcord?.electron || null;
    },

    get chromiumVersion() {
        try {
            return VencordNative.native.getVersions().chrome
                // @ts-ignore Typescript will add userAgentData IMMEDIATELY
                || navigator.userAgentData?.brands?.find(b => b.brand === "Chromium" || b.brand === "Google Chrome")?.version
                || null;
        } catch { // inb4 some stupid browser throws unsupported error for navigator.userAgentData, it's only in chromium
            return null;
        }
    },

    get additionalInfo() {
        if (IS_DEV) return " (Dev)";
        if (IS_WEB) return " (Web)";
        if (IS_VESKTOP) return ` (Vesktop v${VesktopNative.app.getVersion()})`;
        if (IS_STANDALONE) return " (Standalone)";
        return "";
    },

    makeInfoElements(Component: React.ComponentType<React.PropsWithChildren>, props: React.PropsWithChildren) {
        const { electronVersion, chromiumVersion, additionalInfo } = this;

        return (
            <>
                <Component {...props}>Vencord {gitHash}{additionalInfo}</Component>
                {electronVersion && <Component {...props}>Electron {electronVersion}</Component>}
                {chromiumVersion && <Component {...props}>Chromium {chromiumVersion}</Component>}
            </>
        );
    }
});
