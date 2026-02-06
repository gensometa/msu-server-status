# MSU Server Status

MapleStory Universe ゲームサーバーの稼働状況データ。

## GitHub Pages URL

```
https://<username>.github.io/<repo-name>/server-status.json
```

## VPSセットアップ

### 1. リポジトリをクローン

```bash
git clone git@github.com:<username>/<repo-name>.git
cd <repo-name>
```

### 2. Node.js 確認

```bash
node --version  # v18以上推奨
```

### 3. SSH鍵を設定

```bash
ssh-keygen -t ed25519 -C "msu-probe"
cat ~/.ssh/id_ed25519.pub
# → GitHub の Deploy Keys に追加（Write権限を付与）
```

### 4. cronに登録（1分毎）

```bash
crontab -e
```

以下を追加:
```
* * * * * /path/to/run-probe.sh >> /var/log/msu-probe.log 2>&1
```

### 5. 手動テスト

```bash
chmod +x run-probe.sh
./run-probe.sh
```

## GitHub Pages 有効化

1. リポジトリの Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, / (root)
4. Save

数分後に `https://<username>.github.io/<repo-name>/server-status.json` でアクセス可能
