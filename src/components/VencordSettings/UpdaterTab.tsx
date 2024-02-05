/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
* これは、GNU General Public Licenseの下で公開されています
 * フリーソフトウェア財団によって公開されたバージョン3のライセンス、または
 * （お好みで）それ以降のバージョンを選択することができます。
 *
 * このプログラムは、有用であることを期待して配布されていますが、
 * いかなる保証もなく、暗黙の保証もありません。
 * 商品性または特定の目的への適合性についての暗黙の保証もありません。
 * 詳細については、GNU General Public Licenseを参照してください。
 *
 * このプログラムと一緒にGNU General Public Licenseのコピーを受け取るはずです
 * このプログラムと一緒に受け取らなかった場合は、<https://www.gnu.org/licenses/>を参照してください。
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
            UpdateLogger.error("更新に失敗しました", e);
            if (!e) {
                var err = "不明なエラーが発生しました（エラーが未定義です）。もう一度お試しください。";
            } else if (e.code && e.cmd) {
                const { code, path, cmd, stderr } = e;

                if (code === "ENOENT")
                    var err = `コマンド \`${path}\` が見つかりませんでした。インストールしてからもう一度お試しください。`;
                else {
                    var err = `\`${cmd}\` の実行中にエラーが発生しました:\n`;
                    err += stderr || `コード \`${code}\`。詳細についてはコンソールを参照してください。`;
                }

            } else {
                var err = "不明なエラーが発生しました。詳細についてはコンソールを参照してください。";
            }
            Alerts.show({
                title: "おっと！",
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
        <Card style={{ padding: "0 0.5em" }}>
            {updates.map(({ hash, author, message }) => (
                <div style={{
                    marginTop: "0.5em",
                    marginBottom: "0.5em"
                }}>
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
                    <Forms.FormText>更新のチェックに失敗しました。詳細についてはコンソールを参照してください。</Forms.FormText>
                    <ErrorCard style={{ padding: "1em" }}>
                        <p>{updateError.stderr || updateError.stdout || "不明なエラーが発生しました"}</p>
                    </ErrorCard>
                </>
            ) : (
                <Forms.FormText className={Margins.bottom8}>
                    {isOutdated ? (updates.length === 1 ? "1つの更新があります" : `更新が${updates.length}件あります`) : "最新です！"}
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
                                    title: "更新成功！",
                                    body: "正常に更新されました。変更を適用するために再起動しますか？",
                                    confirmText: "再起動",
                                    cancelText: "今はしない",
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
                    今すぐ更新
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
                                message: "更新は見つかりませんでした！",
                                id: Toasts.genId(),
                                type: Toasts.Type.MESSAGE,
                                options: {
                                    position: Toasts.Position.BOTTOM
                                }
                            });
                        }
                    })}
                >
                    更新を確認
                </Button>
            </Flex>
        </>
    );
}

function Newer(props: CommonProps) {
    return (
        <>
            <Forms.FormText className={Margins.bottom8}>
                ローカルのコピーにはより新しいコミットがあります。スタッシュまたはリセットしてください。
            </Forms.FormText>
            <Changes {...props} updates={changes} />
        </>
    );
}

function Updater() {
    const settings = useSettings(["notifyAboutUpdates", "autoUpdate", "autoUpdateNotification"]);

    const [repo, err, repoPending] = useAwaiter(getRepo, { fallbackValue: "読み込み中..." });

    React.useEffect(() => {
        if (err)
            UpdateLogger.error("リポジトリの取得に失敗しました", err);
    }, [err]);

    const commonProps: CommonProps = {
        repo,
        repoPending
    };

    return (
        <SettingsTab title="Vencordの更新">
            <Forms.FormTitle tag="h5">アップデーターの設定</Forms.FormTitle>
            <Switch
                value={settings.notifyAboutUpdates}
                onChange={(v: boolean) => settings.notifyAboutUpdates = v}
                note="起動時に通知を表示します"
                disabled={settings.autoUpdate}
            >
                新しいアップデートについて通知を受け取る
            </Switch>
            <Switch
                value={settings.autoUpdate}
                onChange={(v: boolean) => settings.autoUpdate = v}
                note="確認プロンプトなしでVencordを自動的に更新します"
            >
                自動的に更新する
            </Switch>
            <Switch
                value={settings.autoUpdateNotification}
                onChange={(v: boolean) => settings.autoUpdateNotification = v}
                note="Vencordが自動的に更新されたときに通知を表示します"
                disabled={!settings.autoUpdate}
            >
                自動更新が完了したときに通知を受け取る
            </Switch>

            <Forms.FormTitle tag="h5">リポジトリ</Forms.FormTitle>

            <Forms.FormText className="vc-text-selectable">
                {repoPending
                    ? repo
                    : err
                        ? "取得に失敗しました - コンソールを確認してください"
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
