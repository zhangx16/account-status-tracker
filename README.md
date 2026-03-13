# 账号使用状态管理表

一个可部署的 React + Vite 项目，用来像在线表格一样记录账号、平台、使用状态、负责人和备注。

## 功能

- 新增、编辑、删除账号记录
- 搜索与按状态筛选
- 导出 CSV
- 备份 JSON
- 导入 CSV / JSON
- 浏览器本地自动保存

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## Docker 部署

```bash
docker compose up -d --build
```

默认访问：

```bash
http://服务器IP:8080
```

## 注意

当前版本数据保存在浏览器 localStorage 中：

- 同一个浏览器可持续保存
- 更换电脑或浏览器不会自动同步
- 不适合多人实时协作

后续如果需要，我可以继续扩展成带后端和数据库的多用户版本。
