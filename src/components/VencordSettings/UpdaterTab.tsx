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

import { useSettings } from "@api/Settings";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { relaunch } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { changes, checkForUpdates, getRepo, isNewer, update, updateError, UpdateLogger } from "@utils/updater";
import { Alerts, Button, Card, Forms, Parser, React, Switch, Toasts } from "@webpack/common";

import gitHash from "~git-hash";

import { SettingsTab, wrapTab } from "./shared";

function withDispatcher(dispatcher: React.Dispatch<React.SetStateAction<boolean>>, action: () => any) {
    return async () => {
        dispatcher(true);
        try {
            await action();
        } catch (e: any) {
            UpdateLogger.error("アップデートに失敗", e);
            if (!e) {
                var err = "不明なエラーが発生しました。(エラーがundefined)\nもう一度お試しください。";
            } else if (e.code && e.cmd) {
                const { code, path, cmd, stderr } = e;

                if (code === "ENOENT")
                    var err = `パス \`${path}\` が見つかりませんでした。\nインストールしてやり直してください。`;
                else {
                    var err = `\`${cmd}\` を実行している際にエラーが発生しました。詳細:\n`;
                    err += stderr || `コード \`${code}\`。詳細な情報はコンソールをご覧ください。`;
                }

            } else {
                var err = "不明なエラーが発生しました。もう一度お試しください。";
            }
            Alerts.show({
                title: "おっと。アップデート中にエラーが発生しました。",
                body: (
                    <ErrorCard>
                        {err.split("\n").map(line => <div>{Parser.parse(line)}</div>)}
                    </ErrorCard>
                )
            });
        }
        finally {
            dispatcher(false);
        }
    };
}

interface CommonProps {
    repo: string;
    repoPending: boolean;
}

function HashLink({ repo, hash, disabled = false }: { repo: string, hash: string, disabled?: boolean; }) {
    return <Link href={`${repo}/commit/${hash}`} disabled={disabled}>
        {hash}
    </Link>;
}

function Changes({ updates, repo, repoPending }: CommonProps & { updates: typeof changes; }) {
    return (
        <Card style={{ padding: ".5em" }}>
            {updates.map(({ hash, author, message }) => (
                <div>
                    <code><HashLink {...{ repo, hash }} disabled={repoPending} /></code>
                    <span style={{
                        marginLeft: "0.5em",
                        color: "var(--text-normal)"
                    }}>{message} - {author}</span>
                </div>
            ))}
        </Card>
    );
}

function Updatable(props: CommonProps) {
    const [updates, setUpdates] = React.useState(changes);
    const [isChecking, setIsChecking] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);

    const isOutdated = (updates?.length ?? 0) > 0;

    return (
        <>
            {!updates && updateError ? (
                <>
                    <Forms.FormText>アップデートの確認に失敗しました。詳細な情報はコンソールをご覧ください。</Forms.FormText>
                    <ErrorCard style={{ padding: "1em" }}>
                        <p>{updateError.stderr || updateError.stdout || "不明なエラーが発生しました。"}</p>
                    </ErrorCard>
                </>
            ) : (
                <Forms.FormText className={Margins.bottom8}>
                    {isOutdated ? `${updates.length}のアップデートを発見しました。` : "最新の状態です！"}
                </Forms.FormText>
            )}

            {isOutdated && <Changes updates={updates} {...props} />}

            <Flex className={classes(Margins.bottom8, Margins.top8)}>
                {isOutdated && <Button
                    size={Button.Sizes.SMALL}
                    disabled={isUpdating || isChecking}
                    onClick={withDispatcher(setIsUpdating, async () => {
                        if (await update()) {
                            setUpdates([]);
                            await new Promise<void>(r => {
                                Alerts.show({
                                    title: "アップデートに成功",
                                    body: "アップデートに成功しました。Discordを再起動しますか？",
                                    confirmText: "再起動",
                                    cancelText: "後で",
                                    onConfirm() {
                                        relaunch();
                                        r();
                                    },
                                    onCancel: r
                                });
                            });
                        }
                    })}
                >
                    Update Now
                </Button>}
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={isUpdating || isChecking}
                    onClick={withDispatcher(setIsChecking, async () => {
                        const outdated = await checkForUpdates();
                        if (outdated) {
                            setUpdates(changes);
                        } else {
                            setUpdates([]);
                            Toasts.show({
                                message: "アップデートが見つかりませんでした！",
                                id: Toasts.genId(),
                                type: Toasts.Type.MESSAGE,
                                options: {
                                    position: Toasts.Position.BOTTOM
                                }
                            });
                        }
                    })}
                >
                    アップデートを確認
                </Button>
            </Flex>
        </>
    );
}

function Newer(props: CommonProps) {
    return (
        <>
            <Forms.FormText className={Margins.bottom8}>
                あなたのローカル コピーには、より最近のコミットがあります。それらをstashするか、リセットしてください。
            </Forms.FormText>
            <Changes {...props} updates={changes} />
        </>
    );
}

function Updater() {
    const settings = useSettings(["notifyAboutUpdates", "autoUpdate", "autoUpdateNotification"]);

    const [repo, err, repoPending] = useAwaiter(getRepo, { fallbackValue: "ロード中..." });

    React.useEffect(() => {
        if (err)
            UpdateLogger.error("Failed to retrieve repo", err);
    }, [err]);

    const commonProps: CommonProps = {
        repo,
        repoPending
    };

    return (
        <SettingsTab title="Vencordの更新">
            <Forms.FormTitle tag="h5">アップデートの設定</Forms.FormTitle>
            <Switch
                value={settings.notifyAboutUpdates}
                onChange={(v: boolean) => settings.notifyAboutUpdates = v}
                note="Discordの起動時に通知を表示します。"
                disabled={settings.autoUpdate}
            >
                新しいアップデートを通知する
            </Switch>
            <Switch
                value={settings.autoUpdate}
                onChange={(v: boolean) => settings.autoUpdate = v}
                note="確認ダイアログを表示せずに、Vencordを更新します。"
            >
                自動更新を有効にする
            </Switch>
            <Switch
                value={settings.autoUpdateNotification}
                onChange={(v: boolean) => settings.autoUpdateNotification = v}
                note="自動更新でVencordが更新された際に、通知を表示します。"
                disabled={!settings.autoUpdate}
            >
                自動更新が完了した際に通知を表示する
            </Switch>

            <Forms.FormTitle tag="h5">レポジトリ</Forms.FormTitle>

            <Forms.FormText className="vc-text-selectable">
                {repoPending
                    ? repo
                    : err
                        ? "取得に失敗しました。コンソールをご覧ください。"
                        : (
                            <Link href={repo}>
                                {repo.split("/").slice(-2).join("/")}
                            </Link>
                        )
                }
                {" "}(<HashLink hash={gitHash} repo={repo} disabled={repoPending} />)
            </Forms.FormText>

            <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />

            <Forms.FormTitle tag="h5">アップデート</Forms.FormTitle>

            {isNewer ? <Newer {...commonProps} /> : <Updatable {...commonProps} />}
        </SettingsTab>
    );
}

export default IS_UPDATER_DISABLED ? null : wrapTab(Updater, "アップデート");
