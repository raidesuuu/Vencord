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

import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { downloadSettingsBackup, uploadSettingsBackup } from "@utils/settingsSync";
import { Button, Card, Text } from "@webpack/common";

import { SettingsTab, wrapTab } from "./shared";

function BackupRestoreTab() {
    return (
        <SettingsTab title="バックアップと復元">
            <Card className={classes("vc-settings-card", "vc-backup-restore-card")}>
                <Flex flexDirection="column">
                    <strong>注意</strong>
                    <span>設定ファイルをインポートすると、現在の設定を上書きします。</span>
                </Flex>
            </Card>
            <Text variant="text-md/normal" className={Margins.bottom8}>
                Vencordの設定をJSONファイルとしてインポートしたりエクスポートしたりできます。
                これは簡単に別のデバイスにVencordの設定を以降したり、VencordまたはDiscordを修復した際にデータを復元できます。
            </Text>
            <Text variant="text-md/normal" className={Margins.bottom8}>
                エクスポートされる設定項目:
                <ul>
                    <li>&mdash; カスタムのQuickCSS</li>
                    <li>&mdash; テーマリンク</li>
                    <li>&mdash; プラグイン設定</li>
                </ul>
            </Text>
            <Flex>
                <Button
                    onClick={() => uploadSettingsBackup()}
                    size={Button.Sizes.SMALL}
                >
                    設定をインポート
                </Button>
                <Button
                    onClick={downloadSettingsBackup}
                    size={Button.Sizes.SMALL}
                >
                    設定をエクスポート
                </Button>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(BackupRestoreTab, "バックアップと復元");
