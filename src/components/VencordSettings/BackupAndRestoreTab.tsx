/*
 * Vencord、Discordのデスクトップアプリの改造版
 * 著作権 (c) 2022 Vendicated および貢献者
 *
 * このプログラムはフリーソフトウェアです。再配布や修正は
 * GNU General Public License の条件の下で行うことができます。
 * このプログラムは無保証です。詳細は
 * GNU General Public License を参照してください。
 * ライセンスのコピーは、このプログラムと一緒に提供されます。
 * 提供されていない場合は、<https://www.gnu.org/licenses/> を参照してください。
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
                    <strong>警告</strong>
                    <span>設定ファイルをインポートすると、現在の設定が上書きされます。</span>
                </Flex>
            </Card>
            <Text variant="text-md/normal" className={Margins.bottom8}>
                Vencordの設定をJSONファイルとしてインポートおよびエクスポートできます。
                これにより、設定を別のデバイスに簡単に転送したり、
                VencordまたはDiscordを再インストールした後に設定を復元したりできます。
            </Text>
            <Text variant="text-md/normal" className={Margins.bottom8}>
                設定のエクスポートには以下が含まれます：
                <ul>
                    <li>&mdash; カスタムQuickCSS</li>
                    <li>&mdash; テーマリンク</li>
                    <li>&mdash; プラグインの設定</li>
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
