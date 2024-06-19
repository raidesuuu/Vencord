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
import BackupAndRestoreTab from "@components/VencordSettings/BackupAndRestoreTab";
import CloudTab from "@components/VencordSettings/CloudTab";
import PatchHelperTab from "@components/VencordSettings/PatchHelperTab";
import PluginsTab from "@components/VencordSettings/PluginsTab";
import ThemesTab from "@components/VencordSettings/ThemesTab";
import UpdaterTab from "@components/VencordSettings/UpdaterTab";
import VencordTab from "@components/VencordSettings/VencordTab";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { i18n, React } from "@webpack/common";

import gitHash from "~git-hash";

type SectionType = "HEADER" | "DIVIDER" | "CUSTOM";
type SectionTypes = Record<SectionType, SectionType>;

export default definePlugin({
    name: "Settings",
    description: "設定UIとデバッグ情報を追加します",
    authors: [Devs.Ven, Devs.Megu],
    required: true,

    patches: [
        {
            find: ".versionHash",
            replacement: [
                {
                    match: /\[\(0,\i\.jsxs?\)\((.{1,10}),(\{[^{}}]+\{.{0,20}.versionHash,.+?\})\)," "/,
                    replace: (m, component, props) => {
                        props = props.replace(/children:\[.+\]/, "");
                        return `${m},$self.makeInfoElements(${component}, ${props})`;
                    }
                },
                {
                    match: /copyValue:\i\.join\(" "\)/,
                    replace: "$& + $self.getInfoString()"
                }
            ]
        },
        // Discord Stable
        // FIXME: remove once change merged to stable
        {
            find: "Messages.ACTIVITY_SETTINGS",
            noWarn: true,
            replacement: {
                get match() {
                    switch (Settings.plugins.Settings.settingsLocation) {
                        case "top": return /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.USER_SETTINGS/;
                        case "aboveNitro": return /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.BILLING_SETTINGS/;
                        case "belowNitro": return /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.APP_SETTINGS/;
                        case "belowActivity": return /(?<=\{section:(\i\.\i)\.DIVIDER},)\{section:"changelog"/;
                        case "bottom": return /\{section:(\i\.\i)\.CUSTOM,\s*element:.+?}/;
                        case "aboveActivity":
                        default:
                            return /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.ACTIVITY_SETTINGS/;
                    }
                },
                replace: "...$self.makeSettingsCategories($1),$&"
            }
        },
        {
            find: "Messages.ACTIVITY_SETTINGS",
            replacement: {
                match: /(?<=section:(.{0,50})\.DIVIDER\}\))([,;])(?=.{0,200}(\i)\.push.{0,100}label:(\i)\.header)/,
                replace: (_, sectionTypes, commaOrSemi, elements, element) => `${commaOrSemi} $self.addSettings(${elements}, ${element}, ${sectionTypes}) ${commaOrSemi}`
            }
        },
        {
            find: "Messages.USER_SETTINGS_ACTIONS_MENU_LABEL",
            replacement: {
                match: /(?<=function\((\i),\i\)\{)(?=let \i=Object.values\(\i.\i\).*?(\i\.\i)\.open\()/,
                replace: "$2.open($1);return;"
            }
        }
    ],

    customSections: [] as ((SectionTypes: SectionTypes) => any)[],

    makeSettingsCategories(SectionTypes: SectionTypes) {
        return [
            {
                section: SectionTypes.HEADER,
                label: "Vencord",
                className: "vc-settings-header"
            },
            {
                section: "VencordSettings",
                label: "Vencord",
                element: VencordTab,
                className: "vc-settings"
            },
            {
                section: "VencordPlugins",
                label: "プラグイン",
                element: PluginsTab,
                className: "vc-plugins"
            },
            {
                section: "VencordThemes",
                label: "テーマ",
                element: ThemesTab,
                className: "vc-themes"
            },
            !IS_UPDATER_DISABLED && {
                section: "VencordUpdater",
                label: "更新",
                element: UpdaterTab,
                className: "vc-updater"
            },
            {
                section: "VencordCloud",
                label: "クラウド",
                element: CloudTab,
                className: "vc-cloud"
            },
            {
                section: "VencordSettingsSync",
                label: "バックアップと復元",
                element: BackupAndRestoreTab,
                className: "vc-backup-restore"
            },
            IS_DEV && {
                section: "VencordPatchHelper",
                label: "パッチヘルパー",
                element: PatchHelperTab,
                className: "vc-patch-helper"
            },
            ...this.customSections.map(func => func(SectionTypes)),
            {
                section: SectionTypes.DIVIDER
            }
        ].filter(Boolean);
    },

    isRightSpot({ header, settings }: { header?: string; settings?: string[]; }) {
        const firstChild = settings?.[0];
        // lowest two elements... sanity backup
        if (firstChild === "LOGOUT" || firstChild === "SOCIAL_LINKS") return true;

        const { settingsLocation } = Settings.plugins.Settings;

        if (settingsLocation === "bottom") return firstChild === "LOGOUT";
        if (settingsLocation === "belowActivity") return firstChild === "CHANGELOG";

        if (!header) return;

        const names = {
            top: i18n.Messages.USER_SETTINGS,
            aboveNitro: i18n.Messages.BILLING_SETTINGS,
            belowNitro: i18n.Messages.APP_SETTINGS,
            aboveActivity: i18n.Messages.ACTIVITY_SETTINGS
        };
        return header === names[settingsLocation];
    },

    patchedSettings: new WeakSet(),

    addSettings(elements: any[], element: { header?: string; settings: string[]; }, sectionTypes: SectionTypes) {
        if (this.patchedSettings.has(elements) || !this.isRightSpot(element)) return;

        this.patchedSettings.add(elements);

        elements.push(...this.makeSettingsCategories(sectionTypes));
    },

    wrapSettingsHook(originalHook: (...args: any[]) => Record<string, unknown>[]) {
        return (...args: any[]) => {
            const elements = originalHook(...args);
            if (!this.patchedSettings.has(elements))
                elements.unshift(...this.makeSettingsCategories({
                    HEADER: "HEADER",
                    DIVIDER: "DIVIDER",
                    CUSTOM: "CUSTOM"
                }));

            return elements;
        };
    },

    options: {
        settingsLocation: {
            type: OptionType.SELECT,
            description: "Vencordの設定セクションを配置する場所",
            options: [
                { label: "一番上", value: "top" },
                { label: "Nitroセクションの上", value: "aboveNitro", default: true },
                { label: "Nitroセクションの下", value: "belowNitro" },
                { label: "アクティビティ設定の上", value: "aboveActivity" },
                { label: "アクティビティ設定の下", value: "belowActivity" },
                { label: "一番下", value: "bottom" },
            ]
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

    getInfoRows() {
        const { electronVersion, chromiumVersion, additionalInfo } = this;

        const rows = [`VencordJP ${gitHash}${additionalInfo}`];

        if (electronVersion) rows.push(`Electron ${electronVersion}`);
        if (chromiumVersion) rows.push(`Chromium ${chromiumVersion}`);

        return rows;
    },

    getInfoString() {
        return "\n" + this.getInfoRows().join("\n");
    },

    makeInfoElements(Component: React.ComponentType<React.PropsWithChildren>, props: React.PropsWithChildren) {
        return this.getInfoRows().map((text, i) =>
            <Component key={i} {...props}>{text}</Component>
        );
    }
});
